import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
const f = JSON.parse(
  readFileSync(
    process.env.TASK_TEST_FIXTURES || "outputs/task-ai-20261120/fixtures.json",
    "utf8",
  ),
);
test.beforeAll(() =>
  expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(
    /^\/sdg_tasks_test_\d+$/,
  ),
);
test.afterAll(() => db.$disconnect());
test("AI ticket: recover draft, edit, confirm, reopen saved ticket without duplicate", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signAccount(context, f.accounts.requester);
  await page.goto("/?aiChat=new");
  const count = await db.cong_viec_ho_tro.count({
    where: { company_id: f.companyId },
  });
  const chat = page.getByRole("region", { name: "Trợ lý AI", exact: true });
  await chat
    .getByRole("textbox", { name: "Yêu cầu AI", exact: true })
    .fill("Nhờ worker kiểm tra máy in không hoạt động");
  await chat.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  const panel = page.getByRole("complementary", {
    name: "Chi tiết công việc AI",
    exact: true,
  });
  await expect(panel.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Máy in cần hỗ trợ",
    { timeout: 45000 },
  );
  expect(
    await db.cong_viec_ho_tro.count({ where: { company_id: f.companyId } }),
  ).toBe(count);
  const conversation = await db.hoi_thoai_ai.findFirstOrThrow({
    where: { account_id: f.accounts.requester.id },
    orderBy: { id: "desc" },
  });
  const message = await db.tin_nhan_ai.findFirstOrThrow({
    where: { hoi_thoai_id: conversation.id, vai_tro: "TRO_LY" },
  });
  const draft = (
    message.du_lieu_kem_theo as { supportTaskDraft: { requestId: string } }
  ).supportTaskDraft;
  await page.reload();
  // History must restore the server-owned draft, not just component state.
  await chat
    .getByRole("button", { name: "Mở yêu cầu hỗ trợ", exact: true })
    .click();
  await expect(panel.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Máy in cần hỗ trợ",
  );
  await expect(panel.getByLabel("Hạn hoàn thành", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    panel.getByRole("combobox", { name: "Hạng mục", exact: true }),
  ).not.toBeVisible();
  await expect(panel.getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel.getByLabel("Tiêu đề", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/task-ai-20261120/ai-draft-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await panel
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Máy in: đã kiểm tra nguồn điện");
  await panel.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Đã gửi yêu cầu hỗ trợ.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      db.cong_viec_ho_tro.count({ where: { company_id: f.companyId } }),
    )
    .toBe(count + 1);
  const created = await db.cong_viec_ho_tro.findFirstOrThrow({
    where: { company_id: f.companyId, request_id: draft.requestId },
  });
  expect(created.tieu_de).toBe("Máy in: đã kiểm tra nguồn điện");
  expect(created.han_hoan_thanh).toBeNull();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await chat
    .getByRole("button", { name: "Mở yêu cầu hỗ trợ", exact: true })
    .click();
  await expect(panel.getByText(/Yêu cầu này đã được gửi:/)).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Gửi yêu cầu", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "Mở công việc", exact: true }),
  ).toHaveAttribute("href", `/tasks/${created.id}`);
  expect(
    await db.cong_viec_ho_tro.count({ where: { company_id: f.companyId } }),
  ).toBe(count + 1);
  await page.screenshot({
    path: "outputs/task-ai-20261120/ai-created-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  expect(errors).toEqual([]);
});

test('IT lookup offers real people, distinguishes duplicate names, preserves text and keeps HCNS as the support location', async ({ page, context }) => {
  test.setTimeout(120000);
  const ids = [f.people.worker.id, f.people.worker2.id, f.people.noRights.id];
  const original = await db.nhan_su.findMany({ where: { id: { in: ids }, company_id: f.companyId } });
  try {
    await db.nhan_su.updateMany({ where: { id: { in: ids }, company_id: f.companyId }, data: { chuc_vu: 'Nhân viên IT', ho_ten: 'Nguyễn Văn An' } });
    await signAccount(context, f.accounts.requester);
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.goto('/?aiChat=new');
    const chat = page.getByRole('region', { name: 'Trợ lý AI', exact: true });
    const input = chat.getByRole('textbox', { name: 'Yêu cầu AI', exact: true });
    await input.fill('Nhờ IT đổ mực máy in phòng HCNS');
    await chat.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
    const worker = original.find(p=>p.id===f.people.worker2.id)!;
    const choose = chat.getByRole('button', { name: `Chọn Nguyễn Văn An (${worker.ma_nhan_su})`, exact: true });
    await expect(choose).toBeEnabled({timeout:45000});
    const blocked = original.find(p=>p.id===f.people.noRights.id)!;
    await expect(chat.getByRole('button',{name:`Chọn Nguyễn Văn An (${blocked.ma_nhan_su})`,exact:true})).toBeDisabled();
    await expect(chat.getByText('Chưa có tài khoản hoạt động với quyền nhận việc.',{exact:true})).toBeVisible();
    const conversationId=Number(new URL(page.url()).searchParams.get('aiChat'));
    await page.reload(); await expect(choose).toBeEnabled();
    const messages=await db.tin_nhan_ai.count({where:{hoi_thoai_id:conversationId}});
    await input.fill('Ưu tiên xử lý buổi chiều.'); await choose.click();
    await expect(input).toHaveValue(/Ưu tiên xử lý buổi chiều\.[\s\S]*Chọn người tiếp nhận:/);
    expect(await db.tin_nhan_ai.count({where:{hoi_thoai_id:conversationId}})).toBe(messages);
    await input.fill('');
    await page.screenshot({path:'outputs/ai-targets-20261123/choices-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>document.documentElement.classList.add('dark'));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'outputs/ai-targets-20261123/choices-mobile.png'});
    await choose.click();
    const panel=page.getByRole('complementary',{name:'Chi tiết công việc AI',exact:true});
    await expect(panel.getByLabel('Tiêu đề',{exact:true})).toHaveValue('Đổ mực máy in phòng HCNS',{timeout:45000});
    const answer=await db.tin_nhan_ai.findFirstOrThrow({where:{hoi_thoai_id:conversationId,vai_tro:'TRO_LY'},orderBy:{id:'desc'}});
    const draft=(answer.du_lieu_kem_theo as {supportTaskDraft:{requestId:string;values:{targetId:number;description:string}}}).supportTaskDraft;
    expect(draft.values.targetId).toBe(worker.id);expect(draft.values.description).toContain('HCNS');
    expect(await db.cong_viec_ho_tro.count({where:{company_id:f.companyId,request_id:draft.requestId}})).toBe(0);
  } finally {
    for(const person of original) await db.nhan_su.update({where:{id:person.id},data:{chuc_vu:person.chuc_vu,ho_ten:person.ho_ten}});
  }
});
