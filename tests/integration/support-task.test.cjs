/* eslint-disable @typescript-eslint/no-require-imports -- Exercise real Prisma and auth; stub only request cookies/cache. */
const assert = require("node:assert/strict"),
  { test, after } = require("node:test"),
  { randomUUID } = require("node:crypto"),
  { AsyncLocalStorage } = require("node:async_hooks"),
  Module = require("node:module"),
  fs = require("node:fs");
assert.match(
  new URL(process.env.DATABASE_URL).pathname,
  /^\/sdg_tasks_test_\d+$/,
);
const request = new AsyncLocalStorage(),
  load = Module._load;
Module._load = function (name, ...args) {
  if (name === "next/headers")
    return {
      cookies: async () => ({
        get: () =>
          request.getStore() ? { value: request.getStore() } : undefined,
      }),
    };
  if (name === "next/cache") return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require("../../src/lib/db.ts"),
  { createSessionToken } = require("../../src/lib/session-token.ts"),
  A = require("../../src/actions/support-task.ts"),
  HR = require("../../src/actions/employee-manager.ts"),
  { GET } = require("../../src/app/media/task-files/[id]/route.ts");
const as = async (a, fn) =>
  request.run(
    a
      ? await createSessionToken({
          userId: a.id,
          companyId: a.company_id,
          sessionVersion: a.phien_ban_dang_nhap,
        })
      : undefined,
    fn,
  );
const ok = (r) => {
    assert.equal(r.success, true, r.message);
    return r;
  },
  bad = (r) => assert.equal(r.success, false);
after(() => db.$disconnect());
test("Support tasks: real persistence, rights, concurrency, files and acceptance", async (t) => {
  const company = await db.cong_ty.create({
      data: { ten_cong_ty: "Task implementation test" },
    }),
    companyId = company.id;
  const requestDept = await db.phong_ban.create({
      data: {
        company_id: companyId,
        ma_phong_ban: "REQUEST",
        ten_phong_ban: "Phòng yêu cầu",
      },
    }),
    supportDept = await db.phong_ban.create({
      data: {
        company_id: companyId,
        ma_phong_ban: "SUPPORT",
        ten_phong_ban: "Phòng hỗ trợ",
      },
    });
  const grants = await db.quyen.findMany({
    where: {
      OR: [{ phan_he: "SUPPORT_TASK" }, { phan_he: "HR", hanh_dong: "MANAGE" }],
    },
  });
  const full = await db.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "TASK_TEST",
      ten_vai_tro: "Task test",
      danh_sach_quyen: { create: grants.map((g) => ({ permission_id: g.id })) },
    },
  });
  const none = await db.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "TASK_NONE",
      ten_vai_tro: "None",
    },
  });
  const people = {},
    accounts = {};
  for (const name of [
    "requestManager",
    "supportManager",
    "requester",
    "worker",
    "worker2",
    "outsider",
    "noRights",
  ]) {
    const person = await db.nhan_su.create({
      data: {
        company_id: companyId,
        department_id: [
          "requestManager",
          "requester",
          "outsider",
          "noRights",
        ].includes(name)
          ? requestDept.id
          : supportDept.id,
        ho_ten: name,
        tinh_trang_lam_viec: "ACTIVE",
      },
    });
    people[name] = person;
    accounts[name] = await db.tai_khoan.create({
      data: {
        company_id: companyId,
        employee_id: person.id,
        ten_dang_nhap: `task-${companyId}-${name}`,
        ten_hien_thi: name,
        mat_khau_bam: "disabled",
        danh_sach_vai_tro: {
          create: { role_id: name === "noRights" ? none.id : full.id },
        },
      },
    });
  }
  for (const name of ["requester", "worker", "worker2"])
    await db.nhan_su.update({
      where: { id: people[name].id },
      data: {
        quan_ly_truc_tiep_id:
          people[name === "requester" ? "requestManager" : "supportManager"].id,
      },
    });
  await db.phong_ban.update({
    where: { id: requestDept.id },
    data: { nguoi_phu_trach_id: people.requestManager.id },
  });
  await db.phong_ban.update({
    where: { id: supportDept.id },
    data: { nguoi_phu_trach_id: people.supportManager.id },
  });
  const fields = {
    title: "Sửa máy tính",
    description: "Máy không lên nguồn",
    category: "IT",
    nature: "SUA_CHUA",
    priority: "BINH_THUONG",
    targetType: "CA_NHAN",
    targetId: people.worker.id,
    acceptance: "NGUOI_YEU_CAU",
    startAt: null,
    deadline: null,
  };
  const create = async (extra = {}) =>
    ok(
      await as(accounts.requester, () =>
        A.createSupportTask({ ...fields, requestId: randomUUID(), ...extra }),
      ),
    );
  const mutation = async (who, id, action, extra = {}) => {
    const row = await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } });
    return as(accounts[who], () =>
      A.mutateSupportTask({
        id,
        version: row.version,
        operationId: randomUUID(),
        action,
        ...extra,
      }),
    );
  };
  let task, firstFile;
  await t.test(
    "strict validation, identity, missing manager and retry",
    async () => {
      bad(await A.createSupportTask({ ...fields, requestId: randomUUID() }));
      bad(
        await as(accounts.noRights, () =>
          A.createSupportTask({ ...fields, requestId: randomUUID() }),
        ),
      );
      bad(
        await as(accounts.requester, () =>
          A.createSupportTask({
            ...fields,
            requestId: randomUUID(),
            companyId: companyId + 1,
          }),
        ),
      );
      bad(
        await as(accounts.requestManager, () =>
          A.createSupportTask({ ...fields, requestId: randomUUID() }),
        ),
      );
      bad(
        await createRaw({
          startAt: "2026-11-25T10:00:00Z",
          deadline: "2026-11-24T10:00:00Z",
        }),
      );
      const payload = { ...fields, requestId: randomUUID() };
      task = ok(
        await as(accounts.requester, () => A.createSupportTask(payload)),
      );
      assert.equal(
        ok(await as(accounts.requester, () => A.createSupportTask(payload))).id,
        task.id,
      );
      bad(
        await as(accounts.requester, () =>
          A.createSupportTask({ ...payload, title: "Changed" }),
        ),
      );
      const row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: task.id },
      });
      assert.equal(row.han_hoan_thanh, null);
      assert.equal(+row.bat_dau_luc, +row.created_at);
      assert.equal(row.nguoi_yeu_cau_id, people.requester.id);
      assert.equal(
        await db.lich_su_cong_viec.count({ where: { cong_viec_id: task.id } }),
        1,
      );
      assert.equal(
        await db.thong_bao_cong_viec.count({
          where: { cong_viec_id: task.id },
        }),
        4,
      );
    },
  );
  async function createRaw(extra) {
    return as(accounts.requester, () =>
      A.createSupportTask({ ...fields, requestId: randomUUID(), ...extra }),
    );
  }
  await t.test(
    "scoped reads and only the assigned employee may accept",
    async () => {
      for (const name of ["outsider", "worker2", "noRights"]) {
        bad(await as(accounts[name], () => A.getSupportTask(task.id)));
        bad(await mutation(name, task.id, "NHAN"));
      }
      const receive = {
        id: task.id,
        version: 1,
        operationId: randomUUID(),
        action: "NHAN",
      };
      const responses = await Promise.all(
        [1, 2].map(() =>
          as(accounts.worker, () => A.mutateSupportTask(receive)),
        ),
      );
      responses.forEach(ok);
      assert.equal(
        await db.lich_su_cong_viec.count({
          where: { cong_viec_id: task.id, hanh_dong: "NHAN" },
        }),
        1,
      );
      bad(
        await as(accounts.worker, () =>
          A.mutateSupportTask({ ...receive, reason: "different" }),
        ),
      );
    },
  );
  async function upload(who, id, version, file, uploadId = randomUUID()) {
    const f = new FormData();
    f.set("id", String(id));
    f.set("version", String(version));
    f.set("uploadId", uploadId);
    f.set("file", file);
    return as(accounts[who], () => A.uploadTaskFile(f));
  }
  await t.test(
    "real image evidence, idempotent upload, private downloads and invalid files",
    async () => {
      const bytes = await require("sharp")({
        create: { width: 10, height: 10, channels: 3, background: "#336699" },
      })
        .png()
        .toBuffer();
      const file = new File([bytes], "proof.png", { type: "image/png" }),
        uploadId = randomUUID();
      firstFile = ok(await upload("worker", task.id, 2, file, uploadId));
      const retry = ok(await upload("worker", task.id, 2, file, uploadId));
      assert.equal(retry.fileId, firstFile.fileId);
      bad(await upload("worker", task.id, 3, new File(["bad"], "bad.png")));
      const own = await as(accounts.worker, () =>
        GET(
          new Request(`http://localhost/media/task-files/${firstFile.fileId}`),
          { params: Promise.resolve({ id: String(firstFile.fileId) }) },
        ),
      );
      assert.equal(own.status, 200);
      assert.deepEqual(Buffer.from(await own.arrayBuffer()), bytes);
      assert.match(own.headers.get("cache-control"), /no-store/);
      assert.equal(
        (
          await as(accounts.outsider, () =>
            GET(new Request("http://localhost"), {
              params: Promise.resolve({ id: String(firstFile.fileId) }),
            }),
          )
        ).status,
        404,
      );
      bad(await upload("outsider", task.id, 3, file));
    },
  );
  await t.test(
    "finish -> return -> finish -> accept preserves rounds and completion timestamp",
    async () => {
      ok(
        await mutation("worker", task.id, "BAO_XONG", {
          evidenceIds: [firstFile.fileId],
        }),
      );
      let row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: task.id },
      });
      assert.equal(row.trang_thai, "CHO_NGHIEM_THU");
      assert.equal(row.nghiem_thu_luc, null);
      const oldTime = +row.bao_xong_luc;
      bad(await mutation("worker", task.id, "NGHIEM_THU"));
      bad(await mutation("requestManager", task.id, "NGHIEM_THU"));
      bad(await mutation("requester", task.id, "YEU_CAU_BO_SUNG"));
      ok(
        await mutation("requester", task.id, "YEU_CAU_BO_SUNG", {
          reason: "Kiểm tra thêm",
        }),
      );
      row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: task.id },
      });
      assert.equal(row.bao_xong_luc, null);
      assert.equal(row.so_lan_bao_xong, 1);
      bad(
        await mutation("worker", task.id, "BAO_XONG", {
          evidenceIds: [firstFile.fileId],
        }),
      );
      bad(
        await mutation("worker", task.id, "BAO_XONG", {
          addAcceptance: "KHONG_CAN",
        }),
      );
      ok(await mutation("worker", task.id, "BAO_XONG"));
      row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: task.id },
      });
      const done = +row.bao_xong_luc;
      assert(done >= oldTime);
      assert.equal(row.so_lan_bao_xong, 2);
      ok(await mutation("requester", task.id, "NGHIEM_THU"));
      row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: task.id },
      });
      assert.equal(row.trang_thai, "HOAN_THANH");
      assert.equal(+row.bao_xong_luc, done);
      assert(+row.nghiem_thu_luc >= done);
      bad(
        await mutation("supportManager", task.id, "HUY", {
          reason: "too late",
        }),
      );
      const file = await db.tep_cong_viec.findUniqueOrThrow({
        where: { id: firstFile.fileId },
      });
      assert.equal(
        (
          await db.lich_su_cong_viec.findUniqueOrThrow({
            where: { id: file.su_kien_bao_xong_id },
          })
        ).lan_bao_xong,
        1,
      );
    },
  );
  await t.test(
    "department notifications, no self-claim, manager assignment race and lost scope",
    async () => {
      const r = await create({
        targetType: "PHONG_BAN",
        targetId: supportDept.id,
      });
      const notices = await db.thong_bao_cong_viec.findMany({
        where: { cong_viec_id: r.id },
      });
      for (const name of ["worker", "worker2", "supportManager"])
        assert(notices.some((n) => n.tai_khoan_nhan_id === accounts[name].id));
      ok(await as(accounts.worker2, () => A.getSupportTask(r.id)));
      bad(await mutation("worker", r.id, "NHAN"));
      bad(
        await mutation("worker", r.id, "CHUYEN_DICH", {
          targetType: "CA_NHAN",
          targetId: people.worker.id,
          reason: "claim",
        }),
      );
      ok(
        await mutation("worker2", r.id, "TU_CHOI_CA_NHAN", {
          reason: "Đang bận",
        }),
      );
      assert.equal(
        (await db.cong_viec_ho_tro.findUnique({ where: { id: r.id } }))
          .trang_thai,
        "CHO_NHAN",
      );
      const row = await db.cong_viec_ho_tro.findUnique({ where: { id: r.id } });
      const race = await Promise.all(
        ["worker", "worker2"].map((name) =>
          as(accounts.supportManager, () =>
            A.mutateSupportTask({
              id: r.id,
              version: row.version,
              operationId: randomUUID(),
              action: "CHUYEN_DICH",
              targetType: "CA_NHAN",
              targetId: people[name].id,
              reason: "Phân công",
            }),
          ),
        ),
      );
      assert.equal(race.filter((x) => x.success).length, 1);
      const assigned = await db.cong_viec_ho_tro.findUniqueOrThrow({
          where: { id: r.id },
        }),
        winner =
          assigned.nguoi_duoc_yeu_cau_id === people.worker.id
            ? "worker"
            : "worker2",
        loser = winner === "worker" ? "worker2" : "worker";
      bad(await as(accounts[loser], () => A.getSupportTask(r.id)));
      const feed = ok(
        await as(accounts[loser], () => A.getTaskNotifications()),
      );
      assert.equal(feed.rows.find((n) => n.cong_viec_id === r.id).title, null);
      ok(await mutation(winner, r.id, "NHAN"));
    },
  );
  await t.test(
    "no acceptance and optional additional acceptance; stale edits",
    async () => {
      const r = await create({ acceptance: "KHONG_CAN" });
      ok(await mutation("worker", r.id, "NHAN"));
      ok(await mutation("worker", r.id, "BAO_XONG"));
      const row = await db.cong_viec_ho_tro.findUniqueOrThrow({
        where: { id: r.id },
      });
      assert.equal(row.trang_thai, "HOAN_THANH");
      assert.equal(row.nghiem_thu_luc, null);
      const r2 = await create({ acceptance: "KHONG_CAN" });
      ok(await mutation("worker", r2.id, "NHAN"));
      ok(
        await mutation("worker", r2.id, "BAO_XONG", {
          addAcceptance: "NGUOI_YEU_CAU",
        }),
      );
      assert.equal(
        (await db.cong_viec_ho_tro.findUnique({ where: { id: r2.id } }))
          .trang_thai,
        "CHO_NGHIEM_THU",
      );
      const r3 = await create();
      ok(
        await mutation("requester", r3.id, "SUA", {
          title: "Mới",
          deadline: "2030-01-01T00:00:00Z",
        }),
      );
      bad(
        await as(accounts.requester, () =>
          A.mutateSupportTask({
            id: r3.id,
            version: 1,
            operationId: randomUUID(),
            action: "SUA",
            title: "Cũ",
          }),
        ),
      );
    },
  );
  await t.test(
    "foreign tenant, database constraints, immutable evidence and atomic rollback",
    async () => {
      const foreign = await db.cong_ty.create({
        data: { ten_cong_ty: "Other company" },
      });
      const outsider = await db.nhan_su.create({
        data: {
          company_id: foreign.id,
          ho_ten: "Foreign",
          tinh_trang_lam_viec: "ACTIVE",
        },
      });
      bad(await createRaw({ targetId: outsider.id }));
      await assert.rejects(() =>
        db.lich_su_cong_viec.updateMany({
          where: { cong_viec_id: task.id },
          data: { ly_do: "rewrite" },
        }),
      );
      await assert.rejects(() =>
        db.tep_cong_viec.update({
          where: { id: firstFile.fileId },
          data: { su_kien_bao_xong_id: null },
        }),
      );
      const r = await create();
      await assert.rejects(() =>
        db.cong_viec_ho_tro.update({
          where: { id: r.id },
          data: { version: { increment: 1 }, tieu_de: "No event" },
        }),
      );
      await assert.rejects(() =>
        db.cong_viec_ho_tro.update({
          where: { id: r.id },
          data: {
            version: { increment: 1 },
            nguoi_duoc_yeu_cau_id: outsider.id,
          },
        }),
      );
      await db.$executeRawUnsafe(
        `CREATE FUNCTION test_task_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.phan_he='SUPPORT_TASK' THEN RAISE EXCEPTION 'test audit fail'; END IF; RETURN NEW; END $$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER test_task_audit_fail BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_task_audit_fail()`,
      );
      try {
        bad(await mutation("worker", r.id, "NHAN"));
        assert.equal(
          (await db.cong_viec_ho_tro.findUnique({ where: { id: r.id } }))
            .version,
          1,
        );
        assert.equal(
          await db.lich_su_cong_viec.count({ where: { cong_viec_id: r.id } }),
          1,
        );
      } finally {
        await db.$executeRawUnsafe(
          "DROP TRIGGER test_task_audit_fail ON nhat_ky_hoat_dong",
        );
        await db.$executeRawUnsafe("DROP FUNCTION test_task_audit_fail()");
      }
    },
  );
  await t.test(
    "line manager changes audited, cycles prevented even concurrently",
    async () => {
      const first = ok(
          await as(accounts.requestManager, () =>
            HR.getDirectManagerOptions(people.requestManager.id),
          ),
        ),
        second = ok(
          await as(accounts.supportManager, () =>
            HR.getDirectManagerOptions(people.supportManager.id),
          ),
        );
      const results = await Promise.all([
        as(accounts.requestManager, () =>
          HR.saveDirectManager({
            id: people.requestManager.id,
            managerId: people.supportManager.id,
            version: first.person.updated_at.toISOString(),
          }),
        ),
        as(accounts.supportManager, () =>
          HR.saveDirectManager({
            id: people.supportManager.id,
            managerId: people.requestManager.id,
            version: second.person.updated_at.toISOString(),
          }),
        ),
      ]);
      assert.equal(results.filter((r) => r.success).length, 1);
      await assert.rejects(() =>
        db.nhan_su.update({
          where: { id: people.worker.id },
          data: { quan_ly_truc_tiep_id: people.worker.id },
        }),
      );
    },
  );
  await t.test(
    "notification read scoped to account, permission revocation effective",
    async () => {
      const n = await db.thong_bao_cong_viec.findFirstOrThrow({
        where: {
          cong_viec_id: task.id,
          tai_khoan_nhan_id: accounts.requester.id,
        },
      });
      ok(await as(accounts.worker, () => A.readTaskNotification(n.id)));
      assert.equal(
        (await db.thong_bao_cong_viec.findUnique({ where: { id: n.id } }))
          .da_doc_luc,
        null,
      );
      ok(await as(accounts.requester, () => A.readTaskNotification(n.id)));
      assert(
        (await db.thong_bao_cong_viec.findUnique({ where: { id: n.id } }))
          .da_doc_luc,
      );
      await db.tai_khoan_vai_tro.deleteMany({
        where: { account_id: accounts.worker.id },
      });
      bad(await as(accounts.worker, () => A.getSupportTask(task.id)));
      assert.equal(
        (
          await as(accounts.worker, () =>
            GET(new Request("http://localhost"), {
              params: Promise.resolve({ id: String(firstFile.fileId) }),
            }),
          )
        ).status,
        404,
      );
      await db.tai_khoan_vai_tro.create({
        data: { account_id: accounts.worker.id, role_id: full.id },
      });
    },
  );
  // Test-only identities for browser verification; never grant roles to operating accounts.
  fs.writeFileSync(
    process.env.TASK_TEST_FIXTURES || "outputs/task-implementation-20261120/browser-fixtures.json",
    JSON.stringify({
      accounts,
      people,
      companyId,
      requestDept,
      supportDept,
      taskId: task.id,
    }),
    { mode: 0o600 },
  );
});
