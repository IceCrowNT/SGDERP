/* eslint-disable @typescript-eslint/no-require-imports -- Real isolated PostgreSQL/auth; inject only request context and explicit failure boundaries. */
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const { randomUUID } = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");
const Module = require("node:module");
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
const { Prisma } = require("@prisma/client");
const { createSessionToken } = require("../../src/lib/session-token.ts");
const A = require("../../src/actions/support-task.ts");
const as = async (actor, fn) =>
  request.run(
    actor
      ? await createSessionToken({
          userId: actor.id,
          companyId: actor.company_id,
          sessionVersion: actor.phien_ban_dang_nhap,
        })
      : undefined,
    fn,
  );
const ok = (result) => {
  assert.equal(result.success, true, result.message);
  return result;
};
const blocked = (result, code) => {
  assert.equal(result.success, false);
  assert.equal(result.code, code);
  return result;
};
const originalTransaction = db.$transaction.bind(db);
const marker = "SENSITIVE_SQL_TICKET_CONTENT_KEY_SHOULD_NEVER_APPEAR";
const databaseError = () =>
  new Prisma.PrismaClientKnownRequestError(marker, {
    code: "P2010",
    clientVersion: "diagnostic-test",
    meta: { code: "42P01", message: marker },
  });
after(() => db.$disconnect());

test("task feedback: actionable scope, independent supplement reason, safe errors and retry identity", async (t) => {
  const company = await db.cong_ty.create({
    data: { ten_cong_ty: "Task feedback " + randomUUID() },
  });
  const requestDept = await db.phong_ban.create({
    data: {
      company_id: company.id,
      ma_phong_ban: "REQUEST",
      ten_phong_ban: "Phòng gửi kiểm thử",
    },
  });
  const supportDept = await db.phong_ban.create({
    data: {
      company_id: company.id,
      ma_phong_ban: "SUPPORT",
      ten_phong_ban: "Phòng hỗ trợ kiểm thử",
    },
  });
  const permissions = await db.quyen.findMany({
    where: { phan_he: "SUPPORT_TASK" },
    select: { id: true, hanh_dong: true },
  });
  const full = await db.vai_tro.create({
    data: {
      company_id: company.id,
      ma_vai_tro: "FEEDBACK",
      ten_vai_tro: "Feedback test",
      danh_sach_quyen: {
        create: permissions.map((p) => ({ permission_id: p.id })),
      },
    },
  });
  const none = await db.vai_tro.create({
    data: {
      company_id: company.id,
      ma_vai_tro: "NONE",
      ten_vai_tro: "No rights",
    },
  });
  const people = {},
    accounts = {};
  for (const name of [
    "requestManager",
    "requester",
    "supportManager",
    "worker",
    "worker2",
    "noRights",
  ]) {
    people[name] = await db.nhan_su.create({
      data: {
        company_id: company.id,
        ho_ten: name,
        tinh_trang_lam_viec: "ACTIVE",
        department_id: ["requestManager", "requester", "noRights"].includes(
          name,
        )
          ? requestDept.id
          : supportDept.id,
      },
    });
    accounts[name] = await db.tai_khoan.create({
      data: {
        company_id: company.id,
        employee_id: people[name].id,
        ten_dang_nhap: `feedback-${company.id}-${name}`,
        ten_hien_thi: name,
        mat_khau_bam: "disabled-test-login",
        danh_sach_vai_tro: {
          create: { role_id: name === "noRights" ? none.id : full.id },
        },
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
  const row = (id) => db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } });
  const create = async (title, extra = {}, who = "requester") =>
    ok(
      await as(accounts[who], () =>
        A.createSupportTask({
          requestId: randomUUID(),
          title,
          description: "Synthetic diagnostic description",
          category: "IT",
          nature: "HO_TRO",
          priority: "BINH_THUONG",
          targetType: "CA_NHAN",
          targetId: people.worker.id,
          acceptance: "NGUOI_YEU_CAU",
          startAt: null,
          deadline: null,
          ...extra,
        }),
      ),
    );
  const mutate = async (who, id, action, extra = {}) => {
    const current = await row(id);
    return ok(
      await as(accounts[who], () =>
        A.mutateSupportTask({
          id,
          version: current.version,
          action,
          operationId: randomUUID(),
          ...extra,
        }),
      ),
    );
  };
  const receive = await create("feedback-receive");
  const doing = await create("feedback-doing");
  await mutate("worker", doing.id, "NHAN");
  const supplement = await create("feedback-supplement");
  await mutate("worker", supplement.id, "NHAN");
  await mutate("worker", supplement.id, "BAO_XONG");
  await mutate("requester", supplement.id, "YEU_CAU_BO_SUNG", {
    reason: "Bổ sung kết quả kiểm tra đã yêu cầu",
  });
  const accept = await create(
    "feedback-accept",
    { targetId: people.worker2.id },
    "worker",
  );
  await mutate("worker2", accept.id, "NHAN");
  await mutate("worker2", accept.id, "BAO_XONG");
  const waiting = await create("feedback-waiting");
  await mutate("worker", waiting.id, "NHAN");
  await mutate("worker", waiting.id, "BAO_XONG");
  const closed = await create("feedback-closed", { acceptance: "KHONG_CAN" });
  await mutate("worker", closed.id, "NHAN");
  await mutate("worker", closed.id, "BAO_XONG");
  const requested = await create(
    "feedback-requested",
    { targetId: people.worker2.id, acceptance: "KHONG_CAN" },
    "worker",
  );
  const pool = await create("feedback-pool", {
    targetType: "PHONG_BAN",
    targetId: supportDept.id,
  });
  const another = await create("feedback-other-worker", {
    targetId: people.worker2.id,
  });

  await t.test(
    "actionable is exactly own receive/doing/supplement/acceptance; legacy tabs and filters remain",
    async () => {
      const list = ok(
        await as(accounts.worker, () =>
          A.getSupportTasks({ tab: "actionable" }),
        ),
      );
      assert.deepEqual(
        new Set(list.rows.map((x) => x.id)),
        new Set([receive.id, doing.id, supplement.id, accept.id]),
      );
      assert.equal(list.total, 4);
      for (const id of [
        waiting.id,
        closed.id,
        requested.id,
        pool.id,
        another.id,
      ])
        assert(!list.rows.some((x) => x.id === id));
      const filtered = ok(
        await as(accounts.worker, () =>
          A.getSupportTasks({ tab: "actionable", status: "CAN_BO_SUNG" }),
        ),
      );
      assert.deepEqual(
        filtered.rows.map((x) => x.id),
        [supplement.id],
      );
      for (const tab of [
        "all",
        "receive",
        "doing",
        "waiting",
        "accept",
        "requested",
        "closed",
        "department",
      ])
        ok(await as(accounts.worker, () => A.getSupportTasks({ tab })));
      assert.equal(
        (
          await as(accounts.requester, () =>
            A.getSupportTasks({ tab: "actionable", search: "feedback-doing" }),
          )
        ).total,
        0,
      );
    },
  );

  await t.test(
    "actionable respects EXECUTE and ACCEPT separately after permission changes",
    async () => {
      const restricted = await db.vai_tro.create({
        data: {
          company_id: company.id,
          ma_vai_tro: "RESTRICTED",
          ten_vai_tro: "Restricted worker",
          danh_sach_quyen: {
            create: [
              {
                permission_id: permissions.find((p) => p.hanh_dong === "VIEW")
                  .id,
              },
            ],
          },
        },
      });
      await db.tai_khoan_vai_tro.deleteMany({
        where: { account_id: accounts.worker.id },
      });
      await db.tai_khoan_vai_tro.create({
        data: { account_id: accounts.worker.id, role_id: restricted.id },
      });
      try {
        const viewOnly = ok(
          await as(accounts.worker, () =>
            A.getSupportTasks({ tab: "actionable" }),
          ),
        );
        assert.equal(viewOnly.total, 0);
        assert.equal(viewOnly.rows.length, 0);
        assert(
          (await as(accounts.worker, () => A.getSupportTasks({ tab: "all" })))
            .total > 0,
        );
        const acceptPermission = permissions.find(
          (p) => p.hanh_dong === "ACCEPT",
        ).id;
        await db.vai_tro_quyen.create({
          data: { role_id: restricted.id, permission_id: acceptPermission },
        });
        const reviewer = ok(
          await as(accounts.worker, () =>
            A.getSupportTasks({ tab: "actionable" }),
          ),
        );
        assert.deepEqual(
          reviewer.rows.map((x) => x.id),
          [accept.id],
        );
        assert.equal(reviewer.total, 1);
        await db.vai_tro_quyen.delete({
          where: {
            role_id_permission_id: {
              role_id: restricted.id,
              permission_id: acceptPermission,
            },
          },
        });
        await db.vai_tro_quyen.create({
          data: {
            role_id: restricted.id,
            permission_id: permissions.find((p) => p.hanh_dong === "EXECUTE")
              .id,
          },
        });
        const worker = ok(
          await as(accounts.worker, () =>
            A.getSupportTasks({ tab: "actionable" }),
          ),
        );
        assert.deepEqual(
          new Set(worker.rows.map((x) => x.id)),
          new Set([receive.id, doing.id, supplement.id]),
        );
        assert.equal(worker.total, 3);
      } finally {
        await db.tai_khoan_vai_tro.deleteMany({
          where: { account_id: accounts.worker.id },
        });
        await db.tai_khoan_vai_tro.create({
          data: { account_id: accounts.worker.id, role_id: full.id },
        });
      }
    },
  );

  await t.test(
    "latest supplement reason survives history pagination and disappears after reporting again",
    async () => {
      const detail = ok(
        await as(accounts.worker, () => A.getSupportTask(supplement.id, 2)),
      );
      assert.equal(detail.history.length, 0);
      assert.equal(
        detail.latestSupplement.ly_do,
        "Bổ sung kết quả kiểm tra đã yêu cầu",
      );
      assert.equal(
        detail.latestSupplement.nhan_su_thao_tac.id,
        people.requester.id,
      );
      await mutate("worker", supplement.id, "BAO_XONG");
      const reported = ok(
        await as(accounts.worker, () => A.getSupportTask(supplement.id)),
      );
      assert.equal(reported.latestSupplement, null);
    },
  );

  await t.test(
    "validation, missing session, revoked permissions and stale version keep precise recovery",
    async () => {
      blocked(
        await as(accounts.worker, () => A.getSupportTasks({ tab: "invalid" })),
        "VALIDATION",
      );
      const validation = blocked(
        await as(accounts.worker, () => A.createSupportTask({})),
        "VALIDATION",
      );
      assert(validation.fieldErrors.title.length);
      assert.equal(validation.reference, null);
      const login = blocked(
        await as(null, () => A.getSupportTasks()),
        "UNAUTHENTICATED",
      );
      assert.equal(login.message, "Vui lòng đăng nhập.");
      assert.equal(login.recovery, "sign_in");
      const denied = blocked(
        await as(accounts.noRights, () => A.getSupportTasks()),
        "FORBIDDEN",
      );
      assert.equal(
        denied.message,
        "Phiên hoặc quyền truy cập đã thay đổi. Vui lòng tải lại trang.",
      );
      assert.equal(denied.recovery, "reload");
      const stale = blocked(
        await as(accounts.worker, () =>
          A.mutateSupportTask({
            id: doing.id,
            version: 1,
            action: "BAO_XONG",
            operationId: randomUUID(),
          }),
        ),
        "CONFLICT",
      );
      assert.equal(
        stale.message,
        "Công việc vừa thay đổi. Tải lại để xem trạng thái mới; nội dung đang nhập được giữ.",
      );
      assert.equal(stale.recovery, "reload");
      assert.equal(stale.reference, null);
    },
  );

  await t.test(
    "database error inside currentActor is LOAD_FAILED and only safe correlated metadata is logged",
    async () => {
      const logs = [],
        previousLog = console.error;
      console.error = (...args) => logs.push(args);
      db.$transaction = (callback, options) =>
        originalTransaction(
          (tx) =>
            callback(
              new Proxy(tx, {
                get(target, prop) {
                  if (prop === "tai_khoan")
                    return new Proxy(target.tai_khoan, {
                      get(delegate, key) {
                        if (key === "findFirst")
                          return async () => {
                            throw databaseError();
                          };
                        return Reflect.get(delegate, key);
                      },
                    });
                  return Reflect.get(target, prop);
                },
              }),
            ),
          options,
        );
      try {
        const result = blocked(
          await as(accounts.worker, () => A.getSupportTask(doing.id)),
          "LOAD_FAILED",
        );
        assert.equal(result.recovery, "retry");
        assert.match(result.message, /tải/);
        assert.doesNotMatch(result.message, /lưu/);
        assert.match(result.reference, /^CV-[A-F0-9]{12}$/);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][1].reference, result.reference);
        assert.equal(logs[0][1].action, "getSupportTask");
        assert.equal(logs[0][1].prismaCode, "P2010");
        assert.equal(logs[0][1].sqlState, "42P01");
        assert(!JSON.stringify({ result, logs }).includes(marker));
        assert.deepEqual(
          Object.keys(logs[0][1]).sort(),
          ["action", "operation", "prismaCode", "reference", "sqlState"].sort(),
        );
      } finally {
        db.$transaction = originalTransaction;
        console.error = previousLog;
      }
    },
  );

  await t.test(
    "unknown write acknowledgement keeps retry safe with the same operation id and creates one event",
    async () => {
      const target = await create("feedback-retry", {
        acceptance: "KHONG_CAN",
      });
      await mutate("worker", target.id, "NHAN");
      const current = await row(target.id),
        payload = {
          id: target.id,
          version: current.version,
          action: "BAO_XONG",
          operationId: randomUUID(),
          addAcceptance: "KHONG_CAN",
          evidenceIds: [],
        };
      const logs = [],
        previousLog = console.error;
      console.error = (...args) => logs.push(args);
      db.$transaction = async (...args) => {
        await originalTransaction(...args);
        throw databaseError();
      };
      try {
        const result = blocked(
          await as(accounts.worker, () => A.mutateSupportTask(payload)),
          "SAVE_FAILED",
        );
        assert.equal(result.recovery, "retry");
        assert.match(result.message, /Chưa xác nhận/);
        assert.equal(logs[0][1].action, "BAO_XONG");
        assert.equal(logs[0][1].reference, result.reference);
        assert(!JSON.stringify({ result, logs }).includes(marker));
      } finally {
        db.$transaction = originalTransaction;
        console.error = previousLog;
      }
      const committed = await row(target.id),
        notificationCount = await db.thong_bao_cong_viec.count({
          where: { cong_viec_id: target.id },
        });
      assert.equal(committed.trang_thai, "HOAN_THANH");
      const retried = ok(
        await as(accounts.worker, () => A.mutateSupportTask(payload)),
      );
      assert.equal(retried.version, committed.version);
      assert.equal(
        await db.lich_su_cong_viec.count({
          where: { cong_viec_id: target.id, hanh_dong: "BAO_XONG" },
        }),
        1,
      );
      assert.equal(
        await db.thong_bao_cong_viec.count({
          where: { cong_viec_id: target.id },
        }),
        notificationCount,
      );
    },
  );
});
