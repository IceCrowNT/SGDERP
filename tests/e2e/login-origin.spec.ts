import { expect, test } from "@playwright/test";

// Regression: dev HMR was blocked on this loopback hostname, preventing hydration.
for (const hostname of ["localhost", "127.0.2.2"]) {
  test(`login is interactive on ${hostname}`, async ({ page, baseURL }) => {
    const url = new URL("/login", baseURL);
    url.hostname = hostname;
    await page.goto(url.toString());

    const username = page.getByRole("textbox", { name: "Tên đăng nhập" });
    const password = page.getByLabel("Mật khẩu", { exact: true });
    const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await expect(username).toBeEnabled();
    await expect(password).toBeEnabled();
    await expect(submit).toBeEnabled();

    await username.fill("login-form-check");
    await password.fill("Not-a-real-password");
    await expect(username).toHaveValue("login-form-check");
    await expect(password).toHaveValue("Not-a-real-password");

    // Exercise the hydrated submit handler without attempting a real login.
    await username.clear();
    await submit.click();
    await expect(page.getByText("Vui lòng nhập tên đăng nhập", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url.toString());
  });
}
