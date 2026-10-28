import { expect, test, type BrowserContext } from "@playwright/test";
import { fixtureSession, cleanFixtures } from "../helpers/account-fixture";
async function session(context: BrowserContext, level: "VIEW" | "MANAGE" | "NONE") { return fixtureSession(context, "HR", level); }
test.afterEach(async () => { await cleanFixtures(); });

test("requires login and HR read permission", async ({ page, context }) => {
  await page.goto("/departments");
  await expect(page).toHaveURL(/\/login$/);
  await session(context, "NONE");
  await page.goto("/departments");
  await expect(page.getByText("Bạn không có quyền truy cập danh mục phòng ban.")).toBeVisible();
});

test("reader can search, expand and open personnel without reconciliation controls", async ({ page, context }) => {
  await session(context, "VIEW");
  await page.goto("/departments");
  await expect(page.getByRole("heading", { name: "Phòng ban", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Đối soát/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Thông tin nội bộ/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Mở rộng/ }).first().click();
  const collapse = page.getByRole("button", { name: /^Thu gọn/ }).first();
  await collapse.click();
  await expect(page.getByRole("button", { name: /^Mở rộng/ }).first()).toBeVisible();
  await page.getByLabel("Tìm phòng ban").fill("HCNS");
  await expect(page.getByText("PHÒNG HÀNH CHÍNH NHÂN SỰ", { exact: true })).toBeVisible();
  const people = page.getByRole("list", { name: "Nhân sự trực thuộc PHÒNG HÀNH CHÍNH NHÂN SỰ", exact: true });
  await expect(people).toBeVisible();
  expect(await people.getByRole("listitem").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Thu gọn PHÒNG HÀNH CHÍNH NHÂN SỰ", exact: true }).click();
  await expect(people).toHaveCount(0);
  await page.getByRole("button", { name: "Mở rộng PHÒNG HÀNH CHÍNH NHÂN SỰ", exact: true }).click();
  await expect(people).toBeVisible();
  await page.getByRole("link", { name: /hồ sơ/ }).click();
  await expect(page).toHaveURL(/employees\?departmentId=/);
});

test("manager sees accurate snapshot wording and editable internal fields", async ({ page, context }) => {
  await session(context, "MANAGE");
  await page.goto("/departments");
  await page.getByRole("button", { name: "Thông tin nội bộ BAN KIỂM SOÁT", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("input").first()).toBeDisabled();
  await expect(dialog.locator('input[name="code"]')).toBeEditable();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: /Đối soát/ }).click();
  await expect(page.getByText(/Đây không phải kiểm tra trực tiếp/)).toBeVisible();
  await page.getByLabel("Tìm đơn vị đối soát").fill("HCNS");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Khớp bản đã lưu");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("dialog").getByRole("button", { name: /Close|Đóng/ }).click();
  await page.getByRole("tab", { name: "Danh sách phòng ban" }).click();
  await page.getByLabel("Tìm phòng ban").fill("xyz-no-match");
  await expect(page.getByText("Không tìm thấy phòng ban phù hợp.")).toBeVisible();
  await page.getByLabel("Tìm phòng ban").fill("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


test("organization chart supports selection, collapse, zoom and mobile", async ({ page, context }) => {
  await session(context, "VIEW");
  await page.goto("/departments");
  await page.getByRole("tab", { name: "Sơ đồ tổ chức" }).click();
  const chart = page.getByRole("region", { name: "Sơ đồ cơ cấu tổ chức" });
  await expect(chart).toBeVisible();
  const positions = await chart.locator("foreignObject").evaluateAll(elements => elements.map(element => ({
    y: Number(element.getAttribute("y")),
    company: !element.hasAttribute("data-department-id"),
  })));
  const company = positions.find(node => node.company);
  expect(company).toBeDefined();
  expect(positions.filter(node => !node.company).every(node => node.y > company!.y)).toBe(true);

  await page.getByRole("button", { name: "Xem nhân sự PHÒNG HÀNH CHÍNH NHÂN SỰ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("hồ sơ trực thuộc");
  await page.getByRole("dialog").getByRole("button", { name: /Close|Đóng/ }).click();
  const child = page.getByRole("button", { name: "Xem nhân sự Bộ phận CSKH - Phòng Kinh Doanh", exact: true });
  await expect(child).toHaveCount(1);
  await page.getByRole("button", { name: "Thu nhánh PHÒNG KINH DOANH", exact: true }).click();
  await expect(child).toHaveCount(0);
  await page.getByRole("button", { name: "Mở nhánh PHÒNG KINH DOANH", exact: true }).click();
  await expect(child).toHaveCount(1);
  await page.getByRole("button", { name: "Phóng to sơ đồ", exact: true }).click();
  await expect(page.getByText("90%", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Vừa màn hình" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/department-chart-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Vừa màn hình" }).click();
  await page.screenshot({ path: "outputs/department-chart-desktop.png" });
});
