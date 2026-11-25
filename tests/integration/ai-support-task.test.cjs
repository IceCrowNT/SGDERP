/* eslint-disable @typescript-eslint/no-require-imports -- Real test DB/auth; stub request context and provider HTTP only. */
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { AsyncLocalStorage } = require("node:async_hooks");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs"),
  Module = require("node:module");
assert.match(
  new URL(process.env.DATABASE_URL).pathname,
  /^\/sdg_tasks_test_\d+$/,
);
const f = JSON.parse(
  fs.readFileSync(
    process.env.TASK_TEST_FIXTURES || "outputs/task-ai-20261120/fixtures.json",
  ),
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
const { askAi } = require("../../src/actions/ai.ts");
const { getAiChat } = require("../../src/actions/ai-chat.ts");
const {
  executeAiSupportTaskTool: execute,
} = require("../../src/actions/ai-support-task.ts");
const {
  createSupportTask,
  getCreatedTaskByRequest,
} = require("../../src/actions/support-task.ts");
const { storeAiSecret } = require("../../src/lib/ai-secret-store.ts");
const { canUseBusinessTool } = require("../../src/lib/ai-tool-access.ts");
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
const args = (extra) => ({
  title: "Máy in không hoạt động",
  description: "Kiểm tra kết nối máy in tại phòng yêu cầu.",
  targetType: "CA_NHAN",
  targetId: f.people.worker.id,
  acceptance: "NGUOI_YEU_CAU",
  ...extra,
});
const run = (name, input, a = f.accounts.requester) =>
  as(a, () => execute(name, input, randomUUID()));
const reply = (name, input) =>
  Response.json({
    status: "completed",
    output: [
      {
        type: "function_call",
        name,
        arguments: JSON.stringify(input),
        call_id: randomUUID(),
      },
    ],
    usage: { input_tokens: 10, output_tokens: 2 },
  });
let transport, originalFetch, savedChat;
before(async () => {
  originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    return transport(JSON.parse(opts.body));
  };
  if (
    !(await db.ket_noi_ai.findFirst({
      where: { company_id: f.companyId, la_mac_dinh: true },
    }))
  )
    await db.ket_noi_ai.create({
      data: {
        company_id: f.companyId,
        ten_ket_noi: "Mock ticket test",
        la_mac_dinh: true,
        model_mac_dinh: "test-model",
        cau_hinh_gia: {
          version: 1,
          model: "test-model",
          input: "1",
          cached: "0.5",
          output: "2",
        },
        han_muc_chi_phi_thang: "100",
        tham_chieu_bi_mat: await storeAiSecret(
          f.companyId,
          "sk-test-support-ticket-secret-0000",
        ),
        hau_to_khoa: "0000",
      },
    });
});
after(async () => {
  global.fetch = originalFetch;
  await db.$disconnect();
});
test("lookup returns only scoped minimal directory and readiness", async () => {
  const r = await run("lookup_support_targets", {
    kind: "people",
    search: "worker",
  });
  assert(
    r.output.rows.some((x) => x.id === f.people.worker.id && x.canReceive),
  );
  assert(
    r.output.rows.every((x) =>
      Object.keys(x).every((k) =>
        ["id", "kind", "name", "code", "position", "department", "canReceive", "unavailableReason"].includes(k),
      ),
    ),
  );
  const d = await run("lookup_support_targets", {
    kind: "departments",
    search: "phong ho tro",
  });
  assert.equal(d.output.rows[0].id, f.supportDept.id);
  assert.equal(d.output.rows[0].canReceive, true);
  assert((await run("lookup_support_targets", { kind: "people", search: "" })).output.rows.length > 0);
  assert(
    (
      await run(
        "lookup_support_targets",
        { kind: "people", search: "worker" },
        f.accounts.noRights,
      )
    ).output.error,
  );
  assert((await run("prepare_support_ticket", args(), null)).output.error);
});
test("IT resolves job title, aliases and codes; missing department falls back to people without inventing a team", async () => {
  const worker = await db.nhan_su.findUniqueOrThrow({where:{id:f.people.worker.id}});
  const department = await db.phong_ban.findUniqueOrThrow({where:{id:f.supportDept.id}});
  try {
    await db.nhan_su.update({where:{id:worker.id},data:{chuc_vu:"Nhân viên IT"}});
    for (const search of ["IT", "CNTT", "Công nghệ thông tin", worker.ma_nhan_su]) {
      const r = await run("lookup_support_targets", {kind:"all",search});
      assert(r.output.rows.some(x=>x.id===worker.id && x.kind==="people" && x.position==="Nhân viên IT" && x.canReceive));
      assert(r.trace.supportTargets.some(x=>x.id===worker.id));
      assert(r.trace.references.some(x=>x.kind==="people" && x.ids.includes(worker.id)));
    }
    const fallback = await run("lookup_support_targets", {kind:"departments", search:"IT"});
    assert.equal(fallback.output.fallbackToPeople,true);
    assert(fallback.output.rows.some(x=>x.id===worker.id && x.kind==="people"));
    await db.nhan_su.update({where:{id:worker.id},data:{quan_ly_truc_tiep_id:null}});
    const inherited = await run("lookup_support_targets", {kind:"people",search:worker.ma_nhan_su});
    assert.equal(inherited.output.rows[0].canReceive,true);
    await db.phong_ban.update({where:{id:department.id},data:{nguoi_phu_trach_id:null}});
    const blocked = await run("lookup_support_targets", {kind:"people",search:worker.ma_nhan_su});
    assert.equal(blocked.output.rows[0].canReceive,false);
    assert.match(blocked.output.rows[0].unavailableReason,/quản lý|phụ trách/);
  } finally {
    await db.phong_ban.update({where:{id:department.id},data:{nguoi_phu_trach_id:department.nguoi_phu_trach_id}});
    await db.nhan_su.update({where:{id:worker.id},data:{chuc_vu:worker.chuc_vu,quan_ly_truc_tiep_id:worker.quan_ly_truc_tiep_id}});
  }
});
test("directory supports empty query and stable paging, with department abbreviations and no foreign results", async () => {
  const created=[];
  try {
    for(let i=0;i<23;i++) created.push(await db.phong_ban.create({data:{company_id:f.companyId,ma_phong_ban:`PAGE-${i}`,ten_phong_ban:`Phòng Hành chính Nhân sự ${i}`}}));
    const first=await run("lookup_support_targets",{kind:"departments",search:"PAGE",page:1});
    const second=await run("lookup_support_targets",{kind:"departments",search:"PAGE",page:2});
    assert.equal(first.output.rows.length,20);assert.equal(first.output.nextPage,2);
    assert.equal(second.output.rows.length,3);assert.equal(second.output.nextPage,null);
    assert.equal(new Set([...first.output.rows,...second.output.rows].map(x=>x.id)).size,23);
    assert(first.output.rows.every(x=>created.some(d=>d.id===x.id) && !x.canReceive && x.unavailableReason));
    const code=await run("lookup_support_targets",{kind:"departments",search:"PAGE-0"});assert.equal(code.output.rows.length,1);
    const empty=await run("lookup_support_targets",{kind:"all",search:""});assert(empty.output.rows.length>0);
    assert((await run("lookup_support_targets",{kind:"all",search:"",page:0})).output.error);
  } finally { await db.phong_ban.deleteMany({where:{id:{in:created.map(x=>x.id)},company_id:f.companyId}}); }
});
test("model lookup -> draft -> persisted chat -> concurrent confirm creates exactly one ticket/event/notification set", async () => {
  const before = await db.cong_viec_ho_tro.count({
    where: { company_id: f.companyId },
  });
  let calls = 0;
  transport = async (body) => {
    const names = body.tools.map((t) => t.name);
    assert(names.includes("lookup_support_targets"));
    assert(names.includes("prepare_support_ticket"));
    if (calls++ === 0)
      return reply("lookup_support_targets", {
        kind: "people",
        search: "worker",
      });
    const output = JSON.parse(
      body.input.find((x) => x.type === "function_call_output").output,
    );
    assert(output.rows.some((x) => x.id === f.people.worker.id));
    return reply("prepare_support_ticket", args());
  };
  const key = randomUUID();
  const r = ok(
    await as(f.accounts.requester, () =>
      askAi({
        requestId: key,
        message: "Nhờ worker kiểm tra máy in không hoạt động",
        job: "GENERAL",
      }),
    ),
  );
  assert.equal(calls, 2);
  assert.equal(r.draft.kind, "support-ticket");
  assert.equal(r.draft.values.deadline, null);
  assert.equal(r.draft.values.startAt, null);
  assert.equal(
    await db.cong_viec_ho_tro.count({ where: { company_id: f.companyId } }),
    before,
  );
  savedChat = r.conversationId;
  const chat = ok(
    await as(f.accounts.requester, () => getAiChat({ id: savedChat })),
  );
  const draft = chat.messages.find((m) => m.supportTaskDraft).supportTaskDraft;
  assert.equal(draft.requestId, key);
  assert.equal(draft.values.targetId, f.people.worker.id);
  assert.equal(
    ok(await as(f.accounts.requester, () => getCreatedTaskByRequest(key))).task,
    null,
  );
  const input = {
    ...draft.values,
    title: "Tiêu đề đã sửa trước gửi",
    requestId: key,
  };
  const results = await Promise.all([
    as(f.accounts.requester, () => createSupportTask(input)),
    as(f.accounts.requester, () => createSupportTask(input)),
  ]);
  results.forEach(ok);
  assert.equal(results[0].id, results[1].id);
  assert.equal(
    await db.cong_viec_ho_tro.count({ where: { company_id: f.companyId } }),
    before + 1,
  );
  const row = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: results[0].id },
  });
  assert.equal(row.nguoi_yeu_cau_id, f.people.requester.id);
  assert.equal(row.tieu_de, input.title);
  assert.equal(row.han_hoan_thanh, null);
  assert.equal(
    await db.lich_su_cong_viec.count({ where: { cong_viec_id: row.id } }),
    1,
  );
  const notifications = await db.thong_bao_cong_viec.findMany({
    where: { cong_viec_id: row.id },
  });
  assert(notifications.length >= 3);
  assert.equal(
    new Set(notifications.map((n) => n.tai_khoan_nhan_id)).size,
    notifications.length,
  );
  const recovered = ok(
    await as(f.accounts.requester, () => getCreatedTaskByRequest(key)),
  ).task;
  assert.equal(recovered.id, row.id);
  assert.equal(recovered.tieu_de, input.title);
  assert.equal(
    ok(await as(f.accounts.worker, () => getCreatedTaskByRequest(key))).task,
    null,
  );
  const repeated = ok(
    await as(f.accounts.requester, () =>
      askAi({
        requestId: key,
        message: "Nhờ worker kiểm tra máy in không hoạt động",
        job: "GENERAL",
      }),
    ),
  );
  assert.equal(repeated.conversationId, savedChat);
  assert.equal(calls, 2);
});
test("department preview, bad target, spoofed requester, missing manager and invalid deadline", async () => {
  assert(
    (
      await run(
        "prepare_support_ticket",
        args({ targetType: "PHONG_BAN", targetId: f.supportDept.id }),
      )
    ).draft,
  );
  assert(
    (await run("prepare_support_ticket", args({ targetId: 2147483647 }))).output
      .error,
  );
  const foreign = await db.nhan_su.findFirstOrThrow({
    where: { company_id: { not: f.companyId } },
  });
  assert(
    (await run("prepare_support_ticket", args({ targetId: foreign.id }))).output
      .error,
  );
  assert(
    (
      await run(
        "prepare_support_ticket",
        args({ requesterId: f.people.worker.id }),
      )
    ).output.error,
  );
  assert(
    (
      await run(
        "prepare_support_ticket",
        args({ deadline: "2020-01-01T00:00:00+07:00" }),
      )
    ).output.error,
  );
  const row = await db.nhan_su.findUniqueOrThrow({
    where: { id: f.people.requester.id },
  });
  const department = await db.phong_ban.findUniqueOrThrow({where:{id:row.department_id}});
  try {
    await db.phong_ban.update({where:{id:department.id},data:{nguoi_phu_trach_id:null}});
    await db.nhan_su.update({
      where: { id: row.id },
      data: { quan_ly_truc_tiep_id: null },
    });
    assert((await run("prepare_support_ticket", args())).output.error);
  } finally {
    await db.phong_ban.update({where:{id:department.id},data:{nguoi_phu_trach_id:department.nguoi_phu_trach_id}});
    await db.nhan_su.update({
      where: { id: row.id },
      data: { quan_ly_truc_tiep_id: row.quan_ly_truc_tiep_id },
    });
  }
});
test("LOOKUP and revoked rights reject forged tools, persisted draft and confirmation", async () => {
  assert.equal(
    canUseBusinessTool(
      { taskActions: ["VIEW", "CREATE"] },
      "LOOKUP",
      "prepare_support_ticket",
    ),
    false,
  );
  transport = async (body) => {
    assert(!body.tools.some((t) => t.name === "prepare_support_ticket"));
    return reply("prepare_support_ticket", args());
  };
  assert.equal(
    (
      await as(f.accounts.requester, () =>
        askAi({
          requestId: randomUUID(),
          message: "Soạn ticket",
          job: "LOOKUP",
        }),
      )
    ).success,
    false,
  );
  const grant = await db.vai_tro_quyen.findFirstOrThrow({
    where: {
      vai_tro: { company_id: f.companyId, ma_vai_tro: "TASK_TEST" },
      quyen: { phan_he: "SUPPORT_TASK", hanh_dong: "CREATE" },
    },
  });
  try {
    await db.vai_tro_quyen.delete({
      where: {
        role_id_permission_id: {
          role_id: grant.role_id,
          permission_id: grant.permission_id,
        },
      },
    });
    assert((await run("prepare_support_ticket", args())).output.error);
    assert.equal(
      (await as(f.accounts.requester, () => getAiChat({ id: savedChat })))
        .success,
      false,
    );
    assert.equal(
      (
        await as(f.accounts.requester, () =>
          createSupportTask({
            ...args(),
            category: "IT",
            nature: "HO_TRO",
            priority: "BINH_THUONG",
            startAt: null,
            deadline: null,
            requestId: randomUUID(),
          }),
        )
      ).success,
      false,
    );
    transport = async (body) => {
      assert(!body.tools.some((t) => t.name.includes("support_")));
      return reply("prepare_support_ticket", args());
    };
    assert.equal(
      (
        await as(f.accounts.requester, () =>
          askAi({
            requestId: randomUUID(),
            message: "Soạn ticket",
            job: "GENERAL",
          }),
        )
      ).success,
      false,
    );
  } finally {
    await db.vai_tro_quyen.create({ data: grant });
  }
  ok(await as(f.accounts.requester, () => getAiChat({ id: savedChat })));
});
