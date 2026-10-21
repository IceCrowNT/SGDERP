import { expect, test, type Page } from "@playwright/test";

const username = process.env.E2E_ADMIN_USERNAME;
const password = process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!username || !password) {
    throw new Error("Cần E2E_ADMIN_USERNAME và E2E_ADMIN_PASSWORD để chạy kiểm thử admin.");
  }

  await page.goto("/login");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL("/");
}

test("khách chưa đăng nhập được chuyển về trang đăng nhập", async ({ page }) => {
  await page.goto("/departments");
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("cơ cấu phòng ban với quyền admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/departments");
    await expect(page.getByRole("heading", { name: "Cơ cấu tổ chức" })).toBeVisible();
  });

  test("hiển thị và lọc dữ liệu đối chiếu 1Office", async ({ page }) => {
    await expect(page.getByText("Nguồn chuẩn: 1Office")).toBeVisible();
    await expect(page.getByText("18/18 đơn vị nghiệp vụ đang khớp 1Office")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sửa metadata / })).toHaveCount(18);

    await page.getByRole("tab", { name: "Đối chiếu 1Office" }).click();
    await page.getByPlaceholder(/^Tìm theo tên/).fill("HCNS");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("HCNS");
    await expect(rows.first()).toContainText("Khớp 1Office");
  });

  test("khóa trường nguồn và cho phép sửa metadata ERP", async ({ page }) => {
    await page.getByRole("button", { name: "Sửa metadata BAN KIỂM SOÁT" }).click();
    const dialog = page.getByRole("dialog", { name: "Cập nhật metadata ERP" });
    await expect(dialog.locator("input").nth(0)).toBeDisabled();
    await expect(dialog.locator('input[name="code"]')).toBeEditable();
    await expect(dialog.locator('textarea[name="description"]')).toBeEditable();
  });

  test("ghi đọc lại metadata và hoàn tác", async ({ page }) => {
    test.skip(process.env.E2E_ALLOW_WRITES !== "1", "Chỉ chạy khi cho phép ghi có hoàn tác.");

    await page.getByRole("button", { name: "Sửa metadata BAN KIỂM SOÁT" }).click();
    const description = page.locator('textarea[name="description"]');
    const baseline = await description.inputValue();
    const marker = `E2E_PLAYWRIGHT_${Date.now()}`;

    await description.fill(marker);
    await page.getByRole("button", { name: "Lưu metadata" }).click();
    await expect(page.getByText("Đã cập nhật metadata ERP của đơn vị.")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Sửa metadata BAN KIỂM SOÁT" }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(marker);
    await page.locator('textarea[name="description"]').fill(baseline);
    await page.getByRole("button", { name: "Lưu metadata" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Sửa metadata BAN KIỂM SOÁT" }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(baseline);
  });

  test("giao diện đối chiếu hoạt động trên mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "Đối chiếu 1Office" }).click();
    await expect(page.getByText("Tên nguồn")).toHaveCount(18);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
