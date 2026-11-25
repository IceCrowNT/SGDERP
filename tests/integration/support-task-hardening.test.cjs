/* eslint-disable @typescript-eslint/no-require-imports -- Real isolated PostgreSQL/auth; stub only request cookies/cache. */
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
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
const { db } = require("../../src/lib/db.ts");
const { createSessionToken } = require("../../src/lib/session-token.ts");
const A = require("../../src/actions/support-task.ts");
const HR = require("../../src/actions/employee-manager.ts");
const Departments = require("../../src/actions/department.ts");
const Employees = require("../../src/actions/employee.ts");
const { GET } = require("../../src/app/media/task-files/[id]/route.ts");
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
};
const bad = (r) => {
  assert.equal(r.success, false);
  return r;
};
after(() => db.$disconnect());

test("task hardening: minimal roles, inherited managers, handoff, notifications and recovery", async (t) => {
  const company = await db.cong_ty.create({
    data: { ten_cong_ty: "Task hardening " + randomUUID() },
  });
  const requestDept = await db.phong_ban.create({
    data: {
      company_id: company.id,
      ma_phong_ban: "REQUEST",
      ten_phong_ban: "Phòng yêu cầu kiểm thử",
    },
  });
  const supportDept = await db.phong_ban.create({
    data: {
      company_id: company.id,
      ma_phong_ban: "SUPPORT",
      ten_phong_ban: "Phòng hỗ trợ kiểm thử",
    },
  });
  const emptyDept = await db.phong_ban.create({
    data: {
      company_id: company.id,
      ma_phong_ban: "EMPTY",
      ten_phong_ban: "Phòng chưa khai báo quản lý",
    },
  });
  const permissions = await db.quyen.findMany({
    where: {
      OR: [{ phan_he: "SUPPORT_TASK" }, { phan_he: "HR", hanh_dong: "MANAGE" }],
    },
  });
  const grants = {
    requester: ["VIEW", "CREATE", "ACCEPT"],
    requestManager: ["VIEW", "CREATE", "ACCEPT"],
    supportManager: ["VIEW", "MANAGE", "ACCEPT"],
    worker: ["VIEW", "EXECUTE"],
    worker2: ["VIEW", "EXECUTE"],
    outsider: ["VIEW", "EXECUTE", "ACCEPT"],
    unconfigured: ["VIEW", "CREATE", "ACCEPT"],
  };
  const people = {},
    accounts = {},
    roles = {};
  for (const [name, actions] of Object.entries(grants)) {
    const role = await db.vai_tro.create({
      data: {
        company_id: company.id,
        ma_vai_tro: name,
        ten_vai_tro: name,
        danh_sach_quyen: {
          create: permissions
            .filter((p) =>
              p.phan_he === "SUPPORT_TASK"
                ? actions.includes(p.hanh_dong)
                : name === "supportManager",
            )
            .map((p) => ({ permission_id: p.id })),
        },
      },
    });
    roles[name] = role;
    people[name] = await db.nhan_su.create({
      data: {
        company_id: company.id,
        department_id:
          name === "unconfigured"
            ? emptyDept.id
            : ["requester", "requestManager", "outsider"].includes(name)
              ? requestDept.id
              : supportDept.id,
        ho_ten: name,
        tinh_trang_lam_viec: "ACTIVE",
      },
    });
    accounts[name] = await db.tai_khoan.create({
      data: {
        company_id: company.id,
        employee_id: people[name].id,
        ten_dang_nhap: `hardening-${company.id}-${name}`,
        ten_hien_thi: name,
        mat_khau_bam: "disabled-for-test-login",
        danh_sach_vai_tro: { create: { role_id: role.id } },
      },
    });
  }
  await db.phong_ban.update({
    where: { id: requestDept.id },
    data: { nguoi_phu_trach_id: people.requestManager.id },
  });
  await db.phong_ban.update({
    where: { id: supportDept.id },
    data: { nguoi_phu_trach_id: people.supportManager.id },
  });
  const fields = {
    title: "Kiểm thử cải thiện công việc",
    description: "Máy in không hoạt động",
    category: "IT",
    nature: "HO_TRO",
    priority: "BINH_THUONG",
    targetType: "CA_NHAN",
    targetId: people.worker.id,
    acceptance: "NGUOI_YEU_CAU",
    startAt: null,
    deadline: null,
  };
  const create = (extra = {}, who = "requester") =>
    as(accounts[who], () =>
      A.createSupportTask({ ...fields, requestId: randomUUID(), ...extra }),
    );
  const row = (id) => db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } });
  const mutate = async (who, id, action, extra = {}) =>
    as(accounts[who], () =>
      row(id).then((r) =>
        A.mutateSupportTask({
          id,
          version: r.version,
          operationId: randomUUID(),
          action,
          ...extra,
        }),
      ),
    );
  const setManager = async (name, managerId) => {
    const person = await db.nhan_su.findUniqueOrThrow({
      where: { id: people[name].id },
    });
    return as(accounts.supportManager, () =>
      HR.saveDirectManager({
        id: person.id,
        version: person.updated_at.toISOString(),
        managerId,
      }),
    );
  };
  await t.test(
    "department heads supply managers, explicit exception wins without backfill",
    async () => {
      const options = ok(
        await as(accounts.requester, () => A.getTaskOptions()),
      );
      assert.equal(options.me.managerId, people.requestManager.id);
      assert.equal(
        options.people.find((p) => p.id === people.worker.id).managerId,
        people.supportManager.id,
      );
      assert.equal(
        options.people.find((p) => p.id === people.worker.id).canReceive,
        true,
      );
      const task = ok(await create());
      const created = await row(task.id);
      assert.equal(created.quan_ly_nguoi_yeu_cau_id, people.requestManager.id);
      assert.equal(created.quan_ly_ben_ho_tro_id, people.supportManager.id);
      assert.equal(
        (
          await db.nhan_su.findUniqueOrThrow({
            where: { id: people.worker.id },
          })
        ).quan_ly_truc_tiep_id,
        null,
      );
      ok(await setManager("worker", people.requestManager.id));
      const exception = await row(ok(await create()).id);
      assert.equal(exception.quan_ly_ben_ho_tro_id, people.requestManager.id);
      ok(await setManager("worker", null));
      assert.equal(
        (await row(task.id)).quan_ly_ben_ho_tro_id,
        people.supportManager.id,
        "existing task snapshot stays unchanged",
      );
    },
  );
  await t.test(
    "root head can request without a superior; missing configured head stays blocked; effective cycles rejected",
    async () => {
      const head = await row(
        ok(await create({ acceptance: "KHONG_CAN" }, "requestManager")).id,
      );
      assert.equal(head.quan_ly_nguoi_yeu_cau_id, null);
      bad(await create({ acceptance: "QUAN_LY" }, "requestManager"));
      bad(await create({}, "unconfigured"));
      bad(await setManager("supportManager", people.worker.id));
      assert.equal(
        (
          await db.nhan_su.findUniqueOrThrow({
            where: { id: people.supportManager.id },
          })
        ).quan_ly_truc_tiep_id,
        null,
      );
    },
  );
  await t.test(
    "department head/parent changes and employee moves reject inherited cycles without writes",
    async () => {
      ok(await setManager("requestManager", people.worker.id));
      const beforeDepartment = await db.phong_ban.findUniqueOrThrow({
        where: { id: supportDept.id },
      });
      const auditCount = () =>
        db.nhat_ky_hoat_dong.count({ where: { company_id: company.id } });
      const beforeAudit = await auditCount();
      const base = {
        id: supportDept.id,
        name: supportDept.ten_phong_ban,
        code: supportDept.ma_phong_ban,
        parentId: null,
        headEmployeeId: people.supportManager.id,
      };
      const head = bad(
        await as(accounts.supportManager, () =>
          Departments.updateDepartment({
            ...base,
            headEmployeeId: people.requester.id,
          }),
        ),
      );
      assert.match(head.message, /vòng|chu trình/i);
      const parent = bad(
        await as(accounts.supportManager, () =>
          Departments.updateDepartment({ ...base, parentId: requestDept.id }),
        ),
      );
      assert.match(parent.message, /vòng|chu trình/i);
      assert.deepEqual(
        await db.phong_ban.findUniqueOrThrow({ where: { id: supportDept.id } }),
        beforeDepartment,
      );
      assert.equal(await auditCount(), beforeAudit);
      ok(await setManager("requestManager", null));
      ok(await setManager("supportManager", people.requestManager.id));
      const beforePerson = await db.nhan_su.findUniqueOrThrow({
        where: { id: people.requestManager.id },
      });
      const beforeMoveAudit = await auditCount();
      const moved = bad(
        await as(accounts.supportManager, () =>
          Employees.updateEmployee({
            id: people.requestManager.id,
            fullName: people.requestManager.ho_ten,
            departmentId: supportDept.id,
            employmentStatus: "ACTIVE",
          }),
        ),
      );
      assert.match(moved.message, /vòng|chu trình/i);
      assert.deepEqual(
        await db.nhan_su.findUniqueOrThrow({
          where: { id: people.requestManager.id },
        }),
        beforePerson,
      );
      assert.equal(await auditCount(), beforeMoveAudit);
      ok(await setManager("supportManager", null));
    },
  );
  let handoffTask, proofId;
  await t.test(
    "file events keep audit without notifying; report completion is not active work",
    async () => {
      handoffTask = ok(await create());
      ok(await mutate("worker", handoffTask.id, "NHAN"));
      const before = await db.thong_bao_cong_viec.count({
        where: { cong_viec_id: handoffTask.id },
      });
      const bytes = await require("sharp")({
        create: { width: 12, height: 12, channels: 3, background: "#286b3e" },
      })
        .png()
        .toBuffer();
      const current = await row(handoffTask.id),
        form = new FormData(),
        key = randomUUID();
      for (const [k, v] of Object.entries({
        id: String(current.id),
        version: String(current.version),
        uploadId: key,
      }))
        form.set(k, v);
      form.set(
        "file",
        new File([bytes], "proof-before-handoff.png", { type: "image/png" }),
      );
      const upload = ok(
        await as(accounts.worker, () => A.uploadTaskFile(form)),
      );
      proofId = upload.fileId;
      ok(await as(accounts.worker, () => A.uploadTaskFile(form)));
      assert.equal(
        await db.thong_bao_cong_viec.count({
          where: { cong_viec_id: current.id },
        }),
        before,
      );
      assert.equal(
        await db.lich_su_cong_viec.count({
          where: { cong_viec_id: current.id, hanh_dong: "THEM_TEP" },
        }),
        1,
      );
      ok(
        await mutate("worker", current.id, "BAO_XONG", {
          evidenceIds: [proofId],
        }),
      );
      const doing = ok(
        await as(accounts.worker, () => A.getSupportTasks({ tab: "doing" })),
      );
      assert(!doing.rows.some((x) => x.id === current.id));
      const waiting = ok(
        await as(accounts.worker, () => A.getSupportTasks({ tab: "waiting" })),
      );
      assert(waiting.rows.some((x) => x.id === current.id));
      const task = await row(current.id);
      assert(task.bao_xong_luc);
      assert.equal(task.nghiem_thu_luc, null);
      bad(
        await mutate("supportManager", current.id, "BAN_GIAO", {
          personId: people.worker2.id,
          reason: "Không bàn giao khi đang chờ duyệt",
        }),
      );
      ok(
        await mutate("requester", current.id, "YEU_CAU_BO_SUNG", {
          reason: "Bổ sung kết quả in thử",
        }),
      );
    },
  );
  await t.test(
    "handoff after account lock keeps evidence/rounds, requires new acceptance and preserves final completion time",
    async () => {
      await db.tai_khoan.update({
        where: { id: accounts.worker.id },
        data: { cho_phep_dang_nhap: false },
      });
      const before = await row(handoffTask.id),
        key = randomUUID();
      const input = {
        id: before.id,
        version: before.version,
        operationId: key,
        action: "BAN_GIAO",
        personId: people.worker2.id,
        reason: "Người cũ ngừng làm việc; bàn giao tiếp tục",
      };
      try {
        bad(await as(accounts.requester, () => A.mutateSupportTask(input)));
        ok(await as(accounts.supportManager, () => A.mutateSupportTask(input)));
        ok(await as(accounts.supportManager, () => A.mutateSupportTask(input)));
        const after = await row(before.id);
        assert.equal(after.trang_thai, "CHO_NHAN");
        assert.equal(after.nguoi_thuc_hien_id, null);
        assert.equal(after.nhan_luc, null);
        assert.equal(after.nguoi_duoc_yeu_cau_id, people.worker2.id);
        assert.equal(after.so_lan_bao_xong, 1);
        const proof = await db.tep_cong_viec.findUniqueOrThrow({
          where: { id: proofId },
        });
        assert(proof.su_kien_bao_xong_id);
        assert.equal(proof.tai_khoan_tai_id, accounts.worker.id);
        assert.equal(
          await db.lich_su_cong_viec.count({
            where: { cong_viec_id: before.id, operation_id: key },
          }),
          1,
        );
        const history = await db.lich_su_cong_viec.findFirstOrThrow({
          where: { cong_viec_id: before.id, operation_id: key },
        });
        assert.equal(history.du_lieu_sau.ban_giao, true);
        assert.equal(
          (
            await as(accounts.worker2, () =>
              GET(new Request("http://localhost"), {
                params: Promise.resolve({ id: String(proofId) }),
              }),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await as(accounts.worker, () =>
              GET(new Request("http://localhost"), {
                params: Promise.resolve({ id: String(proofId) }),
              }),
            )
          ).status,
          404,
        );
        bad(await mutate("worker2", before.id, "BAO_XONG"));
        ok(await mutate("worker2", before.id, "NHAN"));
        ok(await mutate("worker2", before.id, "BAO_XONG"));
        const finished = await row(before.id);
        assert.equal(finished.so_lan_bao_xong, 2);
        assert(finished.bao_xong_luc);
        ok(await mutate("requester", before.id, "NGHIEM_THU"));
        const accepted = await row(before.id);
        assert.equal(
          accepted.bao_xong_luc.toISOString(),
          finished.bao_xong_luc.toISOString(),
        );
        assert(accepted.nghiem_thu_luc >= accepted.bao_xong_luc);
      } finally {
        await db.tai_khoan.update({
          where: { id: accounts.worker.id },
          data: { cho_phep_dang_nhap: true },
        });
      }
    },
  );
  await t.test(
    "handoff enforces same department/reviewer/worker restrictions and serializes concurrent changes",
    async () => {
      const task = ok(await create());
      ok(await mutate("worker", task.id, "NHAN"));
      bad(
        await mutate("supportManager", task.id, "BAN_GIAO", {
          personId: people.worker2.id,
        }),
      );
      bad(
        await mutate("supportManager", task.id, "BAN_GIAO", {
          personId: people.worker.id,
          reason: "Cùng người",
        }),
      );
      bad(
        await mutate("supportManager", task.id, "BAN_GIAO", {
          personId: people.outsider.id,
          reason: "Khác phòng",
        }),
      );
      bad(
        await mutate("supportManager", task.id, "BAN_GIAO", {
          personId: people.requester.id,
          reason: "Người nghiệm thu",
        }),
      );
      const current = await row(task.id);
      const input = {
        id: current.id,
        version: current.version,
        action: "BAN_GIAO",
        personId: people.worker2.id,
        reason: "Bàn giao",
      };
      const results = await Promise.all([
        as(accounts.supportManager, () =>
          A.mutateSupportTask({ ...input, operationId: randomUUID() }),
        ),
        as(accounts.supportManager, () =>
          A.mutateSupportTask({ ...input, operationId: randomUUID() }),
        ),
      ]);
      assert.equal(results.filter((r) => r.success).length, 1);
      assert.equal((await row(task.id)).version, current.version + 1);
      const notices = ok(
        await as(accounts.worker, () => A.getTaskNotifications()),
      );
      const storedNotice = await db.thong_bao_cong_viec.findFirstOrThrow({
        where: {
          cong_viec_id: task.id,
          version_su_kien: current.version + 1,
          tai_khoan_nhan_id: accounts.worker.id,
        },
      });
      const handoffNotice = notices.rows.find((n) => n.id === storedNotice.id);
      assert(handoffNotice, "former worker receives a handoff event");
      assert.equal(
        handoffNotice.title,
        null,
        "former worker cannot see the task title after leaving its scope",
      );
      assert.equal(
        handoffNotice.summary,
        null,
        "former worker cannot see task actors or history after leaving its scope",
      );
      bad(await as(accounts.worker, () => A.getSupportTask(task.id)));
    },
  );
  await t.test(
    "reviewer replacement stays on requester side and self notifications are excluded",
    async () => {
      const task = ok(await create());
      const notices = await db.thong_bao_cong_viec.findMany({
        where: { cong_viec_id: task.id },
      });
      assert(
        !notices.some((n) => n.tai_khoan_nhan_id === accounts.requester.id),
      );
      assert(notices.some((n) => n.tai_khoan_nhan_id === accounts.worker.id));
      assert(
        notices.some((n) => n.tai_khoan_nhan_id === accounts.requestManager.id),
      );
      assert(
        notices.some((n) => n.tai_khoan_nhan_id === accounts.supportManager.id),
      );
      bad(
        await mutate("supportManager", task.id, "DOI_NGUOI_NGHIEM_THU", {
          personId: people.outsider.id,
          reason: "Không thuộc bên yêu cầu",
        }),
      );
      bad(
        await mutate("supportManager", task.id, "DOI_NGUOI_NGHIEM_THU", {
          personId: people.supportManager.id,
          reason: "Không phải quản lý bên yêu cầu",
        }),
      );
      ok(
        await mutate("supportManager", task.id, "DOI_NGUOI_NGHIEM_THU", {
          personId: people.requestManager.id,
          reason: "Quản lý bên yêu cầu nghiệm thu",
        }),
      );
      const stored = await row(task.id);
      assert.equal(stored.nguoi_nghiem_thu_id, people.requestManager.id);
      assert.equal(stored.che_do_nghiem_thu, "QUAN_LY");
      const change = await db.lich_su_cong_viec.findFirstOrThrow({
        where: { cong_viec_id: task.id, hanh_dong: "DOI_NGUOI_NGHIEM_THU" },
      });
      assert.equal(
        await db.thong_bao_cong_viec.count({
          where: {
            cong_viec_id: task.id,
            version_su_kien: change.version,
            tai_khoan_nhan_id: accounts.supportManager.id,
          },
        }),
        0,
      );
    },
  );
  await t.test(
    "bounded concurrent creates and paged reads keep audit and counts consistent",
    async () => {
      const durations = [];
      const start = performance.now();
      for (let batch = 0; batch < 6; batch++)
        await Promise.all(
          Array.from({ length: 4 }, async (_, i) => {
            const began = performance.now();
            ok(await create({ title: `QA-PAGE ${batch * 4 + i + 1}` }));
            durations.push(performance.now() - began);
          }),
        );
      const began = performance.now();
      const page = ok(
        await as(accounts.requester, () =>
          A.getSupportTasks({ tab: "requested", search: "QA-PAGE", page: 2 }),
        ),
      );
      const readMs = performance.now() - began;
      assert.equal(page.total, 24);
      assert.equal(page.rows.length, 4);
      assert.equal(page.pages, 2);
      const tasks = await db.cong_viec_ho_tro.findMany({
        where: { company_id: company.id, tieu_de: { startsWith: "QA-PAGE" } },
        select: { id: true },
      });
      assert.equal(
        await db.lich_su_cong_viec.count({
          where: {
            cong_viec_id: { in: tasks.map((t) => t.id) },
            hanh_dong: "TAO",
          },
        }),
        24,
      );
      const sorted = durations.toSorted((a, b) => a - b);
      const metrics = {
        scope:
          "isolated DB, 24 audited creates in batches of 4; not a production capacity claim",
        created: 24,
        concurrency: 4,
        totalMs: Math.round(performance.now() - start),
        medianCreateMs: Math.round(sorted[Math.floor(sorted.length / 2)]),
        p95CreateMs: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
        pageReadMs: Math.round(readMs),
      };
      const out = path.resolve("outputs/task-review-20261125");
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(
        path.join(out, "performance.json"),
        JSON.stringify(metrics, null, 2),
      );
    },
  );
  const f =
    process.env.TASK_HARDENING_FIXTURES ||
    path.resolve("outputs/task-review-20261125/hardening-fixtures.json");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(
    f,
    JSON.stringify({
      companyId: company.id,
      accounts,
      people,
      requestDept,
      supportDept,
      roles,
      handoffTaskId: handoffTask.id,
    }),
    { mode: 0o600 },
  );
});
