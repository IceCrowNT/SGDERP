import sharp from "sharp";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signAccount } from "../helpers/account-fixture";
import { PrismaClient } from "@prisma/client";
test.setTimeout(90000);
const db = new PrismaClient();
const fixture = JSON.parse(
  readFileSync(
    process.env.TASK_TEST_FIXTURES ||
      "outputs/task-implementation-20261120/browser-fixtures.json",
    "utf8",
  ),
);
test.beforeAll(() => {
  expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(
    /^\/sdg_tasks_test_\d+$/,
  );
});
test.afterAll(() => db.$disconnect());
test("dashboard request, department assignment, evidence and acceptance across accounts", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signAccount(context, fixture.accounts.requester);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Yêu cầu hỗ trợ", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("requester", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Hạng mục", exact: true }),
  ).not.toBeVisible();
  const title = "Ticket trình duyệt " + Date.now();
  await dialog.getByLabel("Tiêu đề", { exact: true }).fill(title);
  await dialog
    .getByLabel("Nội dung", { exact: true })
    .fill("Kiểm tra luồng hỗ trợ trên trình duyệt");
  await dialog.getByRole("combobox", { name: "Gửi tới", exact: true }).click();
  await page.getByRole("option", { name: "Phòng ban", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Phòng hỗ trợ *", exact: true })
    .click();
  await page.getByRole("option", { name: "Phòng hỗ trợ", exact: true }).click();
  await expect(
    dialog.getByLabel("Hạn hoàn thành", { exact: true }),
  ).toHaveValue("");
  await dialog
    .getByRole("button", { name: "Gửi yêu cầu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/, { timeout: 30000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const url = page.url();
  await signAccount(context, fixture.accounts.worker);
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Xác nhận nhận việc", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tôi không thể hỗ trợ" }),
  ).toBeVisible();
  await signAccount(context, fixture.accounts.supportManager);
  await page.goto("/tasks/department");
  await page.getByRole("link").filter({ hasText: title }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ghi chú / lý do", exact: false })
    .fill("Giao nhân viên phụ trách");
  await page
    .getByRole("combobox", { name: "Nhân viên được giao", exact: true })
    .click();
  await page.getByRole("option", { name: "worker", exact: true }).click();
  await page
    .getByRole("button", { name: "Giao cho nhân viên", exact: true })
    .click();
  await expect(
    page.getByText("Đã cập nhật công việc", { exact: true }),
  ).toBeVisible();
  await signAccount(context, fixture.accounts.worker);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Xác nhận nhận việc", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Báo xong công việc", exact: true }),
  ).toBeVisible();
  await page.getByLabel(/Thêm bằng chứng/).setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#248855" },
    })
      .png()
      .toBuffer(),
  });
  await expect(
    page.getByRole("link", { name: "evidence.png", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "evidence.png", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Báo xong công việc", exact: true })
    .click();
  await expect(
    page.getByText("Chờ nghiệm thu · Phòng hỗ trợ", { exact: true }),
  ).toBeVisible();
  await signAccount(context, fixture.accounts.requester);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Nghiệm thu và đóng", exact: true })
    .click();
  await expect(
    page.getByText("Hoàn thành · Phòng hỗ trợ", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "outputs/task-implementation-20261120/detail-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.goto("/tasks");
  await expect(page.getByRole("link").filter({ hasText: title })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Công việc của tôi", exact: true }),
  ).toHaveCSS("font-size", "20px");
  await page.screenshot({
    path: "outputs/task-implementation-20261120/board-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page
    .getByRole("button", { name: "Đổi giao diện", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/task-implementation-20261120/detail-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(errors).toEqual([]);
});
test("unauthorized account has no task access, form errors preserve content, notifications work", async ({
  page,
  context,
}) => {
  await signAccount(context, fixture.accounts.noRights);
  await page.goto("/tasks");
  await expect(page.getByRole("alert")).toContainText(/quyền|Phiên/);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Yêu cầu hỗ trợ", exact: true }),
  ).toHaveCount(0);
  await signAccount(context, fixture.accounts.requester);
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Thông báo công việc/ }).click();
  await expect(
    page.getByRole("heading", { name: "Thông báo công việc" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Yêu cầu hỗ trợ", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Giữ nội dung khi lỗi");
  await dialog
    .getByLabel("Nội dung", { exact: true })
    .fill("Không chọn người hỗ trợ");
  await dialog
    .getByRole("button", { name: "Gửi yêu cầu", exact: true })
    .click();
  await expect(
    dialog.getByText("Chọn người hoặc phòng hỗ trợ", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Giữ nội dung khi lỗi",
  );
  await page.screenshot({
    path: "outputs/task-implementation-20261120/form-error.png",
    fullPage: true,
    caret: "initial",
  });
});
test("task permissions can be configured and HR manager is saved independently", async ({
  page,
  context,
}) => {
  // Reset only the isolated fixture: a prior interrupted run may have saved its first change.
  expect((await db.nhan_su.updateMany({where: {id: fixture.people.worker2.id, company_id: fixture.companyId}, data: {quan_ly_truc_tiep_id: fixture.people.supportManager.id}})).count).toBe(1);
  const role = await db.vai_tro.findFirstOrThrow({
    where: { company_id: fixture.companyId, ma_vai_tro: "TASK_TEST" },
  });
  const permissions = await db.quyen.findMany({
    where: { phan_he: { in: ["ROLES", "ACCOUNTS"] }, hanh_dong: "MANAGE" },
  });
  await db.vai_tro_quyen.createMany({
    data: permissions.map((p) => ({ role_id: role.id, permission_id: p.id })),
    skipDuplicates: true,
  });
  await signAccount(context, fixture.accounts.supportManager);
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  const code = "TASK_BROWSER_" + Date.now();
  await page.getByLabel("Mã vai trò", { exact: true }).fill(code);
  await page.getByLabel("Tên vai trò", { exact: true }).fill(code);
  for (const name of ["Xem công việc liên quan", "Nhận và thực hiện"])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const created = await db.vai_tro.findFirstOrThrow({
    where: { company_id: fixture.companyId, ma_vai_tro: code },
    include: { danh_sach_quyen: { include: { quyen: true } } },
  });
  expect(
    created.danh_sach_quyen
      .filter((x) => x.quyen.phan_he === "SUPPORT_TASK")
      .map((x) => x.quyen.hanh_dong)
      .sort(),
  ).toEqual(["EXECUTE", "VIEW"]);
  await page.goto("/employees");
  await page.getByLabel("Tìm nhân sự", { exact: true }).fill("worker2");
  await page
    .getByRole("button", { name: "Xem hồ sơ worker2", exact: true })
    .click();
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem / thay đổi", exact: true })
    .click();
  const manager = page.getByRole("combobox", {
    name: "Quản lý trực tiếp",
    exact: true,
  });
  await expect(manager).toContainText("supportManager");
  await manager.click();
  await page
    .getByRole("option", { name: "requestManager", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lưu quản lý trực tiếp", exact: true })
    .click();
  await expect(manager).toContainText("requestManager");
  await expect
    .poll(
      async () =>
        (
          await db.nhan_su.findUniqueOrThrow({
            where: { id: fixture.people.worker2.id },
          })
        ).quan_ly_truc_tiep_id,
    )
    .toBe(fixture.people.requestManager.id);
  await manager.click();
  await page
    .getByRole("option", { name: "supportManager", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lưu quản lý trực tiếp", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.nhan_su.findUniqueOrThrow({
            where: { id: fixture.people.worker2.id },
          })
        ).quan_ly_truc_tiep_id,
    )
    .toBe(fixture.people.supportManager.id);
});
