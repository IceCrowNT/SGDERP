import { expect, type Page } from "@playwright/test";

export async function openRoomLocations(page: Page) {
  const list = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Danh sách vị trí" }) });
  await expect(list).toBeVisible();
  if (!(await list.evaluate((el) => (el as HTMLDetailsElement).open)))
    await list.locator("summary").click();
}
export async function chooseRoomPoint(page: Page, name: string) {
  await openRoomLocations(page);
  await page.getByRole("button", { name: `Chọn ${name}`, exact: true }).click();
}
