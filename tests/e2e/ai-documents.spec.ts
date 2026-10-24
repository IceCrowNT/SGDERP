import { expect, test, type BrowserContext } from "@playwright/test";
import { SignJWT } from "jose";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
// Local signed fixtures: exercises guards/UI without creating users or writing business data.
async function session(context: BrowserContext, level: "VIEW" | "NONE") {
  const token = await new SignJWT({ userId: -1, username: "ai-lab-test", fullName: "AI Lab Test", employeeCode: "TEST", companyId: -1, roleCodes: [], permissions: { SYSTEM: level } })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET || "sdg_erp_super_secret_jwt_key_default_2026"));
  const url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Signed fixtures are local-only");
  await context.addCookies([{ name: "sdg_session", value: token, url }]);
}

test("AI lab requires login and SYSTEM permission", async ({ page, context }) => {
  await page.goto("/ai-documents");
  await expect(page).toHaveURL(/\/login$/);
  await session(context, "NONE");
  await page.goto("/ai-documents");
  await expect(page.getByRole("heading", { name: "Không có quyền truy cập" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hồ sơ thanh toán AI/ })).toHaveCount(0);
});

test("AI lab validates, prepares sample and invalidates stale output", async ({ page, context }) => {
  await session(context, "VIEW");
  await page.goto("/ai-documents");
  await expect(page.getByRole("link", { name: /Hồ sơ thanh toán AI/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chưa kết nối AI" })).toBeVisible();
  await page.getByRole("button", { name: "Chuẩn bị yêu cầu" }).click();
  await expect(page.getByText("Nhập người đề nghị", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dùng dữ liệu mẫu" }).click();
  await page.getByRole("button", { name: "Chuẩn bị yêu cầu" }).click();
  await expect(page.getByLabel("Nội dung yêu cầu")).toHaveValue(/1.500.000 VND/);
  await page.getByLabel("Người đề nghị", { exact: true }).fill("Thay đổi người đề nghị");
  await expect(page.getByLabel("Nội dung yêu cầu")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Sao chép yêu cầu" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Hồ sơ thanh toán AI", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("exports a real Word package using current form values", async ({ page, context }, testInfo) => {
  const { execFileSync } = await import("node:child_process");
  await session(context, "VIEW");
  await page.goto("/ai-documents");
  await page.getByRole("button", { name: "Xuất Word", exact: true }).click();
  await expect(page.getByText("Nhập người đề nghị", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dùng dữ liệu mẫu" }).click();
  await page.getByLabel("Kính gửi (không bắt buộc)").fill("Ban giám đốc & Phòng kế toán");
  await page.getByLabel("Ngày lập (không bắt buộc)").fill("2026-10-22");
  await page.getByLabel("Tổng tiền (VND, không dấu phân cách)", { exact: true }).fill("2500000");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất Word", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Ho-so-thanh-toan.docx");
  const path = testInfo.outputPath("Ho-so-thanh-toan.docx");
  await download.saveAs(path);
  const xml = execFileSync("unzip", ["-p", path, "word/document.xml"], { encoding: "utf8" });
  expect(xml).toContain("GIẤY ĐỀ NGHỊ THANH TOÁN");
  expect(xml).toContain("TỜ TRÌNH");
  expect(xml).toContain("2.500.000 đồng");
  expect(xml).not.toContain("1.500.000");
  expect(xml).toContain("Ban giám đốc &amp; Phòng kế toán");
  expect(xml).toContain("Ngày 22 tháng 10 năm 2026");
  expect(xml).toContain("w:pageBreakBefore");
});

test("API settings are server-managed without credential inputs", async ({ page, context }) => {
  await session(context, "VIEW");
  await page.goto("/ai-documents");
  await expect(page.getByRole("heading", { name: "Kết nối OpenAI API" })).toBeVisible();
  await expect(page.getByText("Kết nối AI do quản trị viên cấu hình trên máy chủ. Người dùng không cần nhập API key.")).toBeVisible();
  await expect(page.getByLabel("OpenAI API key", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Model", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chuẩn bị cấu hình", exact: true })).toHaveCount(0);
  // Any real environment key must never appear in SSR HTML / serialized props.
  const html = await page.content();
  const response = await page.request.get("/ai-documents");
  const source = await response.text();
  if (process.env.OPENAI_API_KEY?.trim()) {
    expect(html.includes(process.env.OPENAI_API_KEY.trim())).toBe(false);
    expect(source.includes(process.env.OPENAI_API_KEY.trim())).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
