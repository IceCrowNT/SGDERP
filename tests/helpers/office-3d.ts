import { expect, type Page } from "@playwright/test";

export async function openRoomLocations(page: Page) {
  const information = page.locator("#building-information");
  if (await information.isHidden())
    await page.getByRole("button", { name: "Hiện bảng thông tin", exact: true }).click();
  const list = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Danh sách vị trí" }) });
  await expect(list).toBeVisible();
  if (!(await list.evaluate((el) => (el as HTMLDetailsElement).open)))
    await list.locator("summary").click();
}
export async function refreshOfficeData(page: Page) {
  await page.getByRole("button", { name: "Thao tác không gian", exact: true }).click();
  await page.getByRole("menuitem", { name: "Cập nhật dữ liệu", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đang cập nhật dữ liệu" })).toHaveCount(0);
}
export async function chooseRoomPoint(page: Page, name: string) {
  await openRoomLocations(page);
  await page.getByRole("button", { name: `Chọn ${name}`, exact: true }).click();
}
