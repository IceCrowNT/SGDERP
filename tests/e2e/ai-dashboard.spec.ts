import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_ai_dashboard_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated dashboard database and mocked provider required");
test.describe.configure({ mode: "default" });
test.setTimeout(60_000);
const db = new PrismaClient();
const fixture = process.env.AI_DASHBOARD_FIXTURE ? JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE, "utf8")) : {};
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
const input = (page: Page) => chat(page).getByRole("textbox", { name: "Yêu cầu AI" });
const panel = (page: Page) => page.getByRole("complementary", { name: "Chi tiết công việc AI" });
const historyRegion = (page: Page) => (page.viewportSize()?.width ?? 1512) < 1024
  ? page.getByRole("dialog", { name: "Lịch sử chat", exact: true })
  : page.getByRole("complementary", { name: "Lịch sử hội thoại", exact: true });
async function openHistory(page: Page) {
  if (!await historyRegion(page).isVisible()) await chat(page).getByRole("button", { name: "Lịch sử chat", exact: true }).click();
  await expect(historyRegion(page)).toBeVisible();
}
async function historyAction(page: Page, action: string) {
  const current = historyRegion(page).locator('button[aria-current="page"]');
  await current.locator('..').getByRole('button', { name: /^Thao tác:/ }).click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}
async function closeHistory(page: Page) {
  if ((page.viewportSize()?.width ?? 1512) < 1024) await page.keyboard.press("Escape");
  else if (await historyRegion(page).isVisible()) await historyRegion(page).getByRole("button", { name: "Thu gọn lịch sử" }).click();
}
async function send(page: Page, text: string) {
  await expect(input(page)).toBeEnabled(); await input(page).fill(text);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
}
async function propose(page: Page, months = 60) {
  await send(page, `Đặt khấu hao mặc định tất cả loại tài sản thành ${months} tháng`);
  await expect(panel(page).getByRole("article")).toBeVisible();
  await expect(panel(page)).toContainText(`${months} tháng`);
  return Number(new URL(page.url()).searchParams.get("aiWork"));
}
test.beforeAll(async () => {
  const company = fixture.companyId, manager = fixture.accounts.manager;
  if (await db.vai_tro.findFirst({ where: { company_id: company, ma_vai_tro: "DESK" } })) {
    await db.loai_tai_san.updateMany({ where: { company_id: company }, data: { khau_hao_mac_dinh_thang: null } });
    await db.loai_tai_san.updateMany({ where: { company_id: company, ma_loai: "PC" }, data: { khau_hao_mac_dinh_thang: 60 } });
    await db.loai_tai_san.updateMany({ where: { company_id: company, ma_loai: "PRINTER" }, data: { khau_hao_mac_dinh_thang: 36 } });
    return;
  }
  await db.loai_tai_san.createMany({ data: [
    { company_id: company, ma_loai: "PRINTER", ten_loai: "Máy in HCNS", khau_hao_mac_dinh_thang: 36 },
    { company_id: company, ma_loai: "PC", ten_loai: "Máy tính", khau_hao_mac_dinh_thang: 60 },
    { company_id: company, ma_loai: "OLD", ten_loai: "Thiết bị ngừng dùng", dang_su_dung: false },
  ] });
  const department = await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "DESK", ten_phong_ban: "Thử bàn làm việc" } });
  const person = await db.nhan_su.create({ data: { company_id: company, department_id: department.id, ho_ten: "Người dùng thử dashboard", tinh_trang_lam_viec: "ACTIVE" } });
  await db.tai_khoan.update({ where: { id: manager.id }, data: { employee_id: person.id } });
  const permissions = await db.quyen.findMany({ where: { phan_he: "WORKFLOW", hanh_dong: { in: ["VIEW", "CREATE", "MANAGE", "APPROVE", "EXECUTE"] } } });
  const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: "DESK", ten_vai_tro: "Thử workflow dashboard", danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  await db.tai_khoan_vai_tro.create({ data: { account_id: manager.id, role_id: role.id } });
  const template = await db.mau_quy_trinh.create({ data: { company_id: company, tai_khoan_tao_id: manager.id, ma: "DESK", ten: "Thử dashboard" } });
  await db.ho_so_quy_trinh.createMany({ data: Array.from({ length: 12 }, (_, i) => ({ company_id: company, mau_quy_trinh_id: template.id, tieu_de: `Hồ sơ dashboard ${i}`, noi_dung: "test", nguoi_gui_id: person.id, phong_nguoi_gui_id: department.id, tai_khoan_tao_id: manager.id })) });
});
test.afterAll(async () => db.$disconnect());
test.beforeEach(async ({ page, context }) => {
  // Keep independent UI cases outside the shared pilot's five-minute rate window.
  // Only this fixture account in the required isolated database is touched; audit rows remain.
  await db.nhat_ky_hoat_dong.updateMany({ where: { company_id: fixture.companyId, account_id: fixture.accounts.manager.id, phan_he: "AI", hanh_dong: { in: ["AI_REQUEST", "AI_DONE"] } }, data: { created_at: new Date(Date.now() - 600_000) } });
  await signAccount(context, fixture.accounts.manager); await page.setViewportSize({ width: 1512, height: 982 }); await page.goto("/?aiChat=new"); await expect(input(page)).toBeEnabled({ timeout: 25000 }); });

test("chat first, no sample suggestions; input and job survive tabs, workflow pagination and Back", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Bàn làm việc", exact: true })).toBeVisible();
  await expect(page.getByText("Truy cập nhanh", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Tổng quan công việc" })).toHaveCount(0);
  const before = await db.hoi_thoai_ai.count({ where: { account_id: fixture.accounts.manager.id } });
  await expect(chat(page).getByRole("button", { name: "Tìm máy in ở phòng HCNS", exact: true })).toHaveCount(0);
  await expect(chat(page).getByText("Bạn muốn tra cứu hoặc cập nhật hồ sơ nào?")).toHaveCount(0);
  await expect(chat(page).getByText(/Nội dung và hồ sơ liên quan được gửi/)).toHaveCount(0);
  await input(page).fill("Tìm máy in ở phòng HCNS");
  await expect(input(page)).toHaveValue("Tìm máy in ở phòng HCNS");
  expect(await db.hoi_thoai_ai.count({ where: { account_id: fixture.accounts.manager.id } })).toBe(before);
  const box = await input(page).boundingBox(); expect(box!.y + box!.height).toBeLessThan(982);
  await chat(page).getByRole("combobox", { name: "Tác vụ AI", exact: true }).click();
  await page.getByRole("option", { name: "Tra cứu dữ liệu", exact: true }).click();
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("link", { name: "Bản nháp của tôi 12", exact: true }).click();
  await expect(page.getByText("10 hồ sơ / 12 hồ sơ phù hợp. Trang 1/2.")).toBeVisible();
  await page.getByRole("link", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("2 hồ sơ / 12 hồ sơ phù hợp. Trang 2/2.")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("aiChat")).toBe("new");
  await page.getByRole("tab", { name: "Trợ lý AI", exact: true }).click();
  await expect(input(page)).toHaveValue("Tìm máy in ở phòng HCNS");
  await expect(chat(page).getByRole("combobox", { name: "Tác vụ AI", exact: true })).toContainText("Tra cứu dữ liệu");
  await page.goBack(); await expect(page.getByRole("tab", { name: "Việc của tôi", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goForward(); await expect(input(page)).toHaveValue("Tìm máy in ở phòng HCNS");
  await page.screenshot({ path: "outputs/ai-dashboard/desktop-chat.png" });
});

test("pending chat survives tab switching; markup is safe; history restores and archives", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await send(page, 'Chậm **kiểm tra** <script>window.bad=true</script>');
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("tab", { name: "Trợ lý AI", exact: true }).click();
  await expect(chat(page).getByRole("log")).toContainText("Phản hồi kiểm thử");
  await expect(input(page)).toHaveValue("");
  expect(await page.evaluate(() => "bad" in window)).toBe(false);
  await expect(chat(page).getByRole("log").locator("strong")).toHaveCount(2);
  const url = page.url(); await page.reload(); await expect(chat(page).getByRole("log")).toContainText("Phản hồi kiểm thử");
  await openHistory(page);
  await historyAction(page, "Lưu trữ chat");
  await closeHistory(page); await expect(input(page)).toBeDisabled();
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click();
  await expect(chat(page).getByRole("log")).not.toContainText("Phản hồi kiểm thử");
  await page.goto(url); await expect(input(page)).toBeDisabled();
  await openHistory(page);
  const history = historyRegion(page);
  await history.getByRole("button", { name: "Đã lưu trữ", exact: true }).click();
  await expect(history.getByRole("button", { name: /Chậm/ }).first()).toBeVisible();
  await historyAction(page, "Khôi phục chat");
  await expect(input(page)).toBeEnabled();
  await closeHistory(page); await expect(input(page)).toBeEnabled(); expect(errors).toEqual([]);
});

test("selected work restores, expands and reopens from My work; approval writes once", async ({ page }) => {
  const id = await propose(page);
  await expect(panel(page)).toContainText("36 tháng (3 năm)");
  await expect(panel(page)).toContainText("3 loại cần đổi");
  await expect(panel(page)).not.toContainText("Phiên bản");
  expect(await db.loai_tai_san.count({ where: { company_id: fixture.companyId, khau_hao_mac_dinh_thang: 60 } })).toBe(1);
  await page.reload(); await expect(panel(page).getByRole("article")).toBeVisible();
  await panel(page).getByRole("button", { name: "Mở rộng bảng", exact: true }).click(); await expect(input(page)).not.toBeVisible();
  await panel(page).getByRole("button", { name: "Thu nhỏ bảng", exact: true }).click(); await expect(input(page)).toBeVisible();
  await page.screenshot({ path: "outputs/ai-dashboard/desktop-plan.png" });
  await panel(page).getByRole("button", { name: "Đóng bảng công việc", exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("region", { name: "Công việc AI đã lưu" }).getByRole("button", { name: /Khấu hao mặc định loại tài sản/ }).first().click();
  await expect(panel(page).getByRole("article", { name: `Công việc AI ${id}` })).toBeVisible();
  await panel(page).getByRole("button", { name: "Duyệt và thực hiện (3)", exact: true }).click();
  await expect(panel(page)).toContainText("Đã cập nhật 3 loại; 1 loại không cần đổi.");
  await page.reload(); await expect(panel(page)).toContainText("Đã hoàn tất");
  await expect(panel(page).getByRole("button", { name: /Duyệt và thực hiện/ })).toHaveCount(0);
  expect(await db.nhat_ky_hoat_dong.count({ where: { doi_tuong_id: `cong_viec_ai:${id}`, hanh_dong: "AI_WORK_APPROVE" } })).toBe(1);
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click(); await expect(panel(page)).toHaveCount(0);
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await expect(page.getByRole("region", { name: "Công việc AI đã lưu" })).toContainText("Đã hoàn tất");
});

test("stale plan requires refresh; adjustment returns to composer without committing", async ({ page }) => {
  const id = await propose(page, 48);
  const category = await db.loai_tai_san.findFirstOrThrow({ where: { company_id: fixture.companyId, ma_loai: "PRINTER" } });
  await db.loai_tai_san.update({ where: { id: category.id }, data: { khau_hao_mac_dinh_thang: 24 } });
  await panel(page).getByRole("button", { name: "Duyệt và thực hiện (4)", exact: true }).click();
  await expect(panel(page)).toContainText("Danh mục đã thay đổi sau khi lập bảng");
  await panel(page).getByRole("button", { name: "Làm mới bảng để duyệt lại", exact: true }).click();
  await expect(panel(page)).toContainText("24 tháng (2 năm)");
  await panel(page).getByRole("button", { name: "Điều chỉnh yêu cầu", exact: true }).click();
  await expect(input(page)).toHaveValue("Đặt khấu hao mặc định cho tất cả loại tài sản thành 48 tháng");
  expect((await db.cong_viec_ai.findUniqueOrThrow({ where: { id } })).trang_thai).toBe("DA_HUY");
  expect((await db.loai_tai_san.findUniqueOrThrow({ where: { id: category.id } })).khau_hao_mac_dinh_thang).toBe(24);
});

test("mobile work pane fits in light/dark and preserves chat input", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await propose(page, 72);
  await expect(input(page)).not.toBeVisible();
  await expect(panel(page).getByRole("region", { name: "Bảng khấu hao trước và sau" })).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/ai-dashboard/mobile-plan-${dark ? "dark" : "light"}.png` });
  }
  await chat(page).getByRole("button", { name: "Trao đổi", exact: true }).click();
  await input(page).fill("Giữ nội dung đang soạn");
  await chat(page).getByRole("button", { name: "Bảng công việc", exact: true }).click();
  await panel(page).getByRole("button", { name: "Hủy công việc", exact: true }).click();
  await expect(panel(page)).toContainText("Đã hủy công việc");
  await chat(page).getByRole("button", { name: "Trao đổi", exact: true }).click(); await expect(input(page)).toHaveValue("Giữ nội dung đang soạn");
  await page.reload(); await expect(panel(page).getByRole("article", { name: `Công việc AI ${id}` })).toContainText("Đã hủy công việc");
  await openHistory(page);
  await expect(page.getByRole("dialog", { name: "Lịch sử chat", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await closeHistory(page); await expect(chat(page).getByRole("button", { name: "Lịch sử chat", exact: true })).toBeFocused();
});

test("draft survives tabs and panel close; existing form commits only after save", async ({ page }) => {
  const before = await db.vi_tri.count({ where: { company_id: fixture.companyId } });
  await send(page, "Thêm vị trí thử dashboard");
  await expect(panel(page).getByRole("button", { name: "Kiểm tra và lưu", exact: true })).toBeVisible();
  expect(await db.vi_tri.count({ where: { company_id: fixture.companyId } })).toBe(before);
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("link", { name: "Bản nháp của tôi 12", exact: true }).click();
  await page.getByRole("tab", { name: "Trợ lý AI", exact: true }).click();
  await panel(page).getByRole("button", { name: "Đóng bảng công việc", exact: true }).click();
  await chat(page).getByRole("button", { name: "Bản nháp chờ kiểm tra và lưu", exact: true }).click();
  await panel(page).getByRole("button", { name: "Kiểm tra và lưu", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Kiểm tra hồ sơ trước khi lưu" });
  await expect(editor.getByLabel("Tên vị trí", { exact: true })).toHaveValue("Vị trí thử dashboard");
  await editor.getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(editor).not.toBeVisible(); await expect(chat(page)).toContainText("Đã lưu vị trí.");
  expect(await db.vi_tri.count({ where: { company_id: fixture.companyId } })).toBe(before + 1);
});

test("nonpilot account sees only permitted personal workspace and no AI data", async ({ page, context }) => {
  await signAccount(context, fixture.accounts.none); await page.goto("/?desk=ai&view=draft&aiWork=1");
  await expect(chat(page)).toHaveCount(0); await expect(page.getByRole("tab", { name: "Trợ lý AI", exact: true })).toHaveCount(0);
  await expect(page.getByText("Chưa có nhóm công việc phù hợp với tài khoản của bạn.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Bản nháp của tôi/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bàn làm việc", exact: true })).toBeVisible();
});

test("transport error retains the request and retry completes without losing the conversation", async ({ page }) => {
  const text = "Mất kết nối thử dashboard";
  let aborted = false;
  await page.route("**/*", async route => {
    if (!aborted && route.request().method() === "POST" && route.request().postData()?.includes(text)) { aborted = true; return route.abort("failed"); }
    return route.continue();
  });
  await send(page, text);
  await expect(chat(page).getByRole("alert")).toContainText("Mất kết nối");
  await expect(input(page)).toHaveValue(text);
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("tab", { name: "Trợ lý AI", exact: true }).click();
  await expect(input(page)).toHaveValue(text);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page).getByRole("log")).toContainText("Phản hồi kiểm thử");
  await expect(input(page)).toHaveValue("");
  expect(aborted).toBe(true);
});

for (const mobile of [false, true]) test(`archived chat restores at composer, retries failure, and continues same conversation (${mobile ? "mobile" : "desktop"})`, async ({ page }) => {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await send(page, "Tin trước khi lưu trữ");
  await expect(input(page)).toHaveValue("");
  const id = Number(new URL(page.url()).searchParams.get("aiChat"));
  await input(page).fill("Tin viết tiếp sau khôi phục");
  await openHistory(page);
  await historyAction(page, "Lưu trữ chat");
  await closeHistory(page);
  await expect(input(page)).toBeDisabled();
  const restore = chat(page).getByRole("button", { name: "Khôi phục để chat tiếp", exact: true });
  await expect(restore).toBeVisible();
  let aborted = false;
  await page.route("**/*", async route => {
    const body = route.request().postData() ?? "";
    if (!aborted && route.request().method() === "POST" && body.includes('"archived":false') && body.includes('"id":')) { aborted = true; return route.abort("failed"); }
    return route.continue();
  });
  await restore.click(); await expect(chat(page).getByRole("alert")).toContainText("Chưa xác nhận được trạng thái lưu trữ");
  await expect(input(page)).toBeDisabled(); await expect(input(page)).toHaveValue("Tin viết tiếp sau khôi phục");
  expect((await db.hoi_thoai_ai.findUniqueOrThrow({ where: { id } })).trang_thai).toBe("LUU_TRU");
  await restore.click(); await expect(input(page)).toBeEnabled();
  await expect(restore).toHaveCount(0); await expect(input(page)).toHaveValue("Tin viết tiếp sau khôi phục");
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(input(page)).toHaveValue("");
  expect(new URL(page.url()).searchParams.get("aiChat")).toBe(String(id));
  expect(await db.tin_nhan_ai.count({ where: { hoi_thoai_id: id } })).toBe(4);
  await page.reload(); await expect(input(page)).toBeEnabled();
  await expect(chat(page).getByRole("log")).toContainText("Tin viết tiếp sau khôi phục");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `outputs/ai-history-sidebar/continued-${mobile ? "mobile" : "desktop"}.png` });
});

test("closing slow history leaves the current composer usable", async ({ page }) => {
  await closeHistory(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let intercepted = false;
  await page.route("**/*", async route => {
    const body = route.request().postData() ?? "";
    if (!intercepted && route.request().method() === "POST" && body.includes('"archived":false') && !body.includes('"id":')) { intercepted = true; await gate; }
    return route.continue();
  });
  try {
    await openHistory(page);
    await expect.poll(() => intercepted).toBe(true);
    await closeHistory(page);
    await expect(input(page)).toBeEnabled();
    await input(page).fill("Nội dung giữ khi lịch sử đang tải");
    await expect(chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
  } finally { release(); }
  await expect(input(page)).toHaveValue("Nội dung giữ khi lịch sử đang tải");
});

test("desktop sidebar shows saved titles, switches chats and keeps title through follow-up", async ({ page }) => {
  const history = historyRegion(page);
  await expect(history).toBeVisible();
  await expect(chat(page).getByRole("heading", { name: "Chat mới", exact: true })).toBeVisible();
  await send(page, "Tra cứu máy in tại phòng HCNS"); await expect(input(page)).toHaveValue("");
  const firstId = Number(new URL(page.url()).searchParams.get("aiChat"));
  expect((await db.hoi_thoai_ai.findUniqueOrThrow({ where: { id: firstId } })).tieu_de).toBe("Tra cứu máy in tại phòng HCNS");
  await expect(chat(page).getByRole("heading", { name: "Tra cứu máy in tại phòng HCNS", exact: true })).toBeVisible();
  await send(page, "Cho tôi xem thêm thông tin"); await expect(input(page)).toHaveValue("");
  await expect(chat(page).getByRole("heading", { name: "Tra cứu máy in tại phòng HCNS", exact: true })).toBeVisible();
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click();
  await send(page, "Tra cứu vị trí phòng họp"); await expect(input(page)).toHaveValue("");
  await history.getByRole("button", { name: /^Tra cứu máy in tại phòng HCNS/ }).click();
  await expect(input(page)).toBeEnabled();
  expect(new URL(page.url()).searchParams.get("aiChat")).toBe(String(firstId));
  await expect(chat(page).getByRole("log")).toContainText("Cho tôi xem thêm thông tin");
  await expect(history.getByRole("button", { name: /^Tra cứu máy in tại phòng HCNS/ })).toHaveAttribute("aria-current", "page");
  await expect(history.locator("button[title]").first()).toHaveAttribute("title", "Tra cứu vị trí phòng họp");
  await send(page, "Tiếp tục cuộc trò chuyện cũ"); await expect(input(page)).toHaveValue("");
  await expect(history.locator("button[title]").first()).toHaveAttribute("title", "Tra cứu máy in tại phòng HCNS");
  await input(page).fill("Bản đang nhập"); await closeHistory(page); await openHistory(page);
  await expect(input(page)).toHaveValue("Bản đang nhập");
  await page.reload(); await expect(input(page)).toBeEnabled();
  await expect(chat(page).getByRole("heading", { name: "Tra cứu máy in tại phòng HCNS", exact: true })).toBeVisible();
  await expect(history.locator("button[title]").first()).toHaveAttribute("title", "Tra cứu máy in tại phòng HCNS");
  const left = await history.boundingBox(), right = await chat(page).boundingBox();
  expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/ai-history-sidebar/desktop-history.png" });
  await propose(page, 72); await expect(history).toBeHidden();
  await panel(page).getByRole("button", { name: "Đóng bảng công việc" }).click();
  await expect(history).toBeVisible();
});

test("legacy titles, pagination, invalid sources and owner isolation", async ({ page }) => {
  const owner = { company_id: fixture.companyId, account_id: fixture.accounts.manager.id };
  const created: number[] = [];
  async function seed(title: string, question: string, account = owner.account_id, invalid = false) {
    const requestId = crypto.randomUUID();
    const row = await db.hoi_thoai_ai.create({ data: { ...owner, account_id: account, tieu_de: title, danh_sach_tin_nhan: { create: [
      { ma_yeu_cau: requestId, vai_tro: "NGUOI_DUNG", trang_thai: "HOAN_TAT", noi_dung: question },
      { ma_yeu_cau: requestId, vai_tro: "TRO_LY", trang_thai: "HOAN_TAT", noi_dung: "Nội dung lịch sử", du_lieu_kem_theo: { version: 1, ngu_canh: invalid ? [{ tool: "search_assets", filters: {}, references: [{ kind: "assets", ids: [2147483647] }] }] : [] } },
    ] } } }); created.push(row.id); return row.id;
  }
  try {
    const legacy = await seed("Cuộc trò chuyện", "  Lịch sử cũ\n  máy in HCNS  ");
    for (let i = 0; i < 21; i++) await seed(`Hội thoại phân trang ${i}`, `Câu hỏi ${i}`);
    await seed("Tiêu đề không được lộ", "Câu hỏi nguồn mất", owner.account_id, true);
    await seed("Chat tài khoản khác không được lộ", "Câu hỏi riêng", fixture.accounts.none.id);
    // Equal timestamps must page deterministically by id without skipping rows.
    await db.hoi_thoai_ai.updateMany({ where: { id: { in: created } }, data: { updated_at: new Date() } });
    await page.reload(); await expect(input(page)).toBeEnabled();
    const history = historyRegion(page);
    await expect(history.getByRole("button", { name: /^Cuộc trò chuyện không khả dụng/ })).toBeVisible();
    await expect(history).not.toContainText("Tiêu đề không được lộ");
    await expect(history).not.toContainText("Chat tài khoản khác không được lộ");
    await expect(history.getByRole("button", { name: /^Lịch sử cũ máy in HCNS/ })).toHaveCount(0);
    await history.getByRole("button", { name: "Xem thêm hội thoại" }).click();
    await history.getByRole("button", { name: /^Lịch sử cũ máy in HCNS/ }).click();
    await expect(chat(page).getByRole("heading", { name: "Lịch sử cũ máy in HCNS", exact: true })).toBeVisible();
    expect((await db.hoi_thoai_ai.findUniqueOrThrow({ where: { id: legacy } })).tieu_de).toBe("Cuộc trò chuyện");
    await history.getByRole("button", { name: /^Cuộc trò chuyện không khả dụng/ }).click();
    await expect(chat(page).getByRole("alert")).toContainText("Không mở được hội thoại");
    await expect(chat(page).getByRole("heading", { name: "Chat mới", exact: true })).toBeVisible();
    await expect(chat(page).getByRole("log")).not.toContainText("Nội dung lịch sử");
  } finally { await db.hoi_thoai_ai.deleteMany({ where: { id: { in: created }, ...owner } }); await db.hoi_thoai_ai.deleteMany({ where: { id: { in: created }, company_id: owner.company_id, account_id: fixture.accounts.none.id } }); }
});
