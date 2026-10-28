import { expect, test } from "@playwright/test";
import { fixtureSession, cleanFixtures } from "../helpers/account-fixture";

test.afterEach(async () => { await cleanFixtures(); });

test("old AI URL requires login and shows a pause notice", async ({ page, context }) => {
  await page.goto("/ai-documents");
  await expect(page).toHaveURL(/\/login$/);
  await fixtureSession(context, "SYSTEM", "NONE");
  await page.goto("/ai-documents");
  await expect(page.getByRole("heading", { name: "Tính năng tạm hoãn" })).toBeVisible();
  await expect(page.locator("main input, main textarea, main form")).toHaveCount(0);
  await page.getByRole("link", { name: "Về trang tổng quan" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("SYSTEM manager cannot access the retired pilot on desktop or mobile", async ({ page, context }) => {
  await fixtureSession(context, "SYSTEM", "MANAGE");
  await page.goto("/ai-documents");
  await expect(page.getByRole("heading", { name: "Tính năng tạm hoãn" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hồ sơ thanh toán AI/ })).toHaveCount(0);
  await expect(page.getByText("CÔNG CỤ AI", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Xuất Word|Chuẩn bị yêu cầu/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Tính năng tạm hoãn" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
