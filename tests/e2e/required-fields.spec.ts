import { expect, test } from "@playwright/test";
import { fixtureSession, cleanFixtures } from "../helpers/account-fixture";

test.afterEach(async () => { await cleanFixtures(); });
for (const editing of [false, true]) {
  test(`department ${editing ? "edit" : "create"}: required labels and empty values`, async ({ page, context }) => {
    await fixtureSession(context, "HR", "MANAGE");
    await page.goto("/departments");
    if (editing) await page.getByRole("button", { name: /^Sửa phòng ban / }).first().click();
    else await page.getByRole("button", { name: "Thêm phòng ban", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Trường bắt buộc.", { exact: false })).toBeVisible();
    await expect(dialog.locator('[data-slot="form-label"] span[aria-hidden="true"]')).toHaveCount(2);
    expect(await dialog.locator('[data-slot="form-label"] span[aria-hidden="true"]').first().evaluate(el => getComputedStyle(el, "::after").content)).toBe('"*"');
    const name = dialog.getByLabel("Tên phòng ban", { exact: true });
    const code = dialog.getByLabel("Mã phòng ban", { exact: true });
    await expect(name).toHaveAttribute("aria-required", "true");
    await expect(code).toHaveAttribute("aria-required", "true");
    await expect(dialog.getByRole("combobox")).not.toHaveAttribute("aria-required", "true");
    await name.fill("   ");
    await code.clear();
    const requests: string[] = [];
    page.on("request", r => { if (r.method() === "POST") requests.push(r.url()); });
    await dialog.getByRole("button", { name: "Lưu phòng ban" }).click();
    await expect(dialog.getByText("Vui lòng nhập tên phòng ban", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Vui lòng nhập mã phòng ban", { exact: true })).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    expect(requests).toHaveLength(0);
    await name.fill("Phòng thử");
    await expect(name).toHaveAttribute("aria-invalid", "false");
    await expect(dialog.getByText("Vui lòng nhập mã phòng ban", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (!editing) await page.screenshot({ path: "outputs/required-department-mobile.png" });
  });
  test(`employee ${editing ? "edit" : "create"}: required labels and missing name/department`, async ({ page, context }) => {
    await fixtureSession(context, "HR", "MANAGE");
    await page.goto("/employees");
    if (editing) await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).first().click();
    else await page.getByRole("button", { name: "Thêm nhân sự", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator('[data-slot="form-label"] span[aria-hidden="true"]')).toHaveCount(3);
    const name = dialog.getByLabel("Họ và tên", { exact: true });
    const department = dialog.getByRole("combobox", { name: "Phòng ban", exact: true });
    const status = dialog.getByRole("combobox", { name: "Tình trạng làm việc", exact: true });
    for (const field of [name, department, status]) await expect(field).toHaveAttribute("aria-required", "true");
    await expect(dialog.getByLabel("Chức vụ", { exact: true })).not.toHaveAttribute("aria-required", "true");
    await name.fill("   ");
    const requests: string[] = [];
    page.on("request", r => { if (r.method() === "POST") requests.push(r.url()); });
    await dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(dialog.getByText("Vui lòng nhập họ và tên", { exact: true })).toBeVisible();
    await expect(name).toBeFocused();
    if (!editing) {
      await expect(department).toHaveAttribute("aria-invalid", "true");
      await expect(dialog.locator('[data-slot="form-message"]').filter({ hasText: "Chọn phòng ban" })).toBeVisible();
      await name.fill("Nhân sự thử");
      await dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
      await expect(department).toBeFocused();
    }
    expect(requests).toHaveLength(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (!editing) await page.screenshot({ path: "outputs/required-employee-mobile.png" });
  });
}
