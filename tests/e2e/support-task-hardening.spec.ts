import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
const f = JSON.parse(
  readFileSync(
    process.env.TASK_HARDENING_FIXTURES ||
      "outputs/task-review-20261125/hardening-fixtures.json",
    "utf8",
  ),
);
const out = process.env.TASK_QA_OUTPUT || "outputs/task-review-20261125";
const list =
  "/tasks?tab=requested&search=QA-PAGE&category=IT&status=CHO_NHAN&page=2";
test.setTimeout(90000);
test.beforeAll(() =>
  expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(
    /^\/sdg_tasks_test_\d+$/,
  ),
);
test.afterAll(() => db.$disconnect());
test("list filters survive navigation; in-memory edits reopen and explicit discard requires confirmation", async ({
  page,
  context,
}) => {
  await signAccount(context, f.accounts.requester);
  await page.goto(list);
  await expect(page.getByLabel("Tìm tiêu đề công việc")).toHaveValue("QA-PAGE");
  const groups = page.getByRole("navigation", {
    name: "Nhóm công việc",
    exact: true,
  });
  await expect(groups.getByRole("button")).toHaveCount(3);
  await expect(
    groups.getByRole("button", { name: "Tôi yêu cầu", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Hạng mục", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Hạng mục", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  await expect(page.getByText(/24 công việc · Trang 2\/2/)).toBeVisible();
  await page.screenshot({ path: `${out}/list-desktop.png`, fullPage: false });
  await page
    .getByRole("link")
    .filter({ hasText: /QA-PAGE/ })
    .first()
    .click();
  await expect(page).toHaveURL(/task=\d+/);
  const id = Number(new URL(page.url()).searchParams.get("task"));
  expect(id).toBeGreaterThan(0);
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  expect(new URL(page.url()).searchParams.get("search")).toBe("QA-PAGE");
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Thao tác khác", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Mở trang chi tiết", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${id}\\?returnTo=`));
  await page.getByRole("link", { name: /Quay lại danh sách/ }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  await expect(page.getByLabel("Tìm tiêu đề công việc")).toHaveValue("QA-PAGE");
  await expect(page.getByText(/24 công việc · Trang 2\/2/)).toBeVisible();
  await page
    .getByRole("link")
    .filter({ hasText: /QA-PAGE/ })
    .first()
    .click();
  const detail = page.getByRole("dialog");
  await detail
    .getByRole("button", { name: "Thao tác khác", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Sửa nội dung và thời gian", exact: true })
    .click();
  const originalTitle = await detail
    .getByLabel("Tiêu đề", { exact: true })
    .inputValue();
  await detail
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Tiêu đề tạm cần bỏ");
  await detail.getByLabel("Tiêu đề", { exact: true }).fill(originalTitle);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link")
    .filter({ hasText: /QA-PAGE/ })
    .first()
    .click();
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("button",{name:"Thao tác khác",exact:true})).toBeVisible();
  if ((await detail.getByLabel("Tiêu đề", { exact: true }).count()) === 0)
    await beginEdit(page);
  await expect(detail.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    originalTitle,
  );
  await detail
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Nội dung chưa lưu cần giữ");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link")
    .filter({ hasText: /QA-PAGE/ })
    .first()
    .click();
  await expect(detail.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Nội dung chưa lưu cần giữ",
  );
  await detail
    .getByRole("button", { name: "Thao tác khác", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Mở trang chi tiết", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${id}\\?returnTo=`));
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Nội dung chưa lưu cần giữ",
  );
  await page.goBack();
  await expect(page).toHaveURL(/task=\d+/);
  await expect(
    page.getByRole("dialog").getByLabel("Tiêu đề", { exact: true }),
  ).toHaveValue("Nội dung chưa lưu cần giữ");
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/tasks/${id}\\?returnTo=`));
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Nội dung chưa lưu cần giữ",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Bỏ chỉnh sửa", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Nội dung chưa lưu cần giữ",
  );
  expect(
    (await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } })).tieu_de,
  ).not.toBe("Nội dung chưa lưu cần giữ");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Bỏ chỉnh sửa", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /Quay lại danh sách/ }).click();
  await expect(page.getByLabel("Tìm tiêu đề công việc")).toHaveValue("QA-PAGE");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${out}/list-mobile.png`,
    fullPage: true,
    caret: "initial",
  });
});

test("handoff is available above long content and the replacement receives before completing", async ({
  page,
  context,
}) => {
  await signAccount(context, f.accounts.requester);
  await page.goto("/tasks");
  await page
    .getByRole("button", { name: "Yêu cầu hỗ trợ", exact: true })
    .click();
  const form = page.getByRole("dialog");
  const title = "Bàn giao trình duyệt " + Date.now();
  await form.getByLabel("Tiêu đề", { exact: true }).fill(title);
  await form
    .getByLabel("Nội dung", { exact: true })
    .fill("Kiểm tra kết nối máy in và in thử tài liệu.\n".repeat(60));
  await form
    .getByRole("combobox", { name: "Người hỗ trợ *", exact: true })
    .click();
  await page.getByRole("option", { name: "worker", exact: true }).click();
  await form.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/, { timeout: 30000 });
  const url = page.url(),
    id = Number(new URL(url).pathname.split("/").at(-1));
  await signAccount(context, f.accounts.worker);
  await page.goto(url);
  await page.getByRole("button", { name: "Nhận việc", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Gửi nghiệm thu", exact: true }),
  ).toBeVisible();
  await signAccount(context, f.accounts.supportManager);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Thao tác khác", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Bàn giao người thực hiện", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Nhân viên được giao", exact: true })
    .click();
  await page.getByRole("option", { name: "worker2", exact: true }).click();
  await page
    .getByRole("textbox", { name: /Lý do bàn giao/ })
    .fill("Bàn giao để đồng nghiệp tiếp tục kiểm tra máy in");
  await page
    .getByRole("button", { name: "Bàn giao công việc", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } }))
          .trang_thai,
    )
    .toBe("CHO_NHAN");
  await signAccount(context, f.accounts.worker2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Gửi nghiệm thu", exact: true }),
  ).toHaveCount(0);
  const receive = page.getByRole("button", { name: "Nhận việc", exact: true });
  await expect(receive).toBeVisible();
  const position = await receive.boundingBox();
  expect(position).not.toBeNull();
  expect(position!.y + position!.height).toBeLessThan(844);
  expect(position!.height).toBeGreaterThanOrEqual(40);
  expect(position!.width).toBeGreaterThanOrEqual(40);
  writeFileSync(
    `${out}/primary-action-mobile.json`,
    JSON.stringify(
      {
        viewport: { width: 390, height: 844 },
        action: "Nhận việc",
        bounds: position,
        longDescriptionLines: 60,
      },
      null,
      2,
    ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${out}/handoff-mobile.png`,
    fullPage: false,
    caret: "initial",
  });
  await receive.click();
  await page
    .getByRole("button", { name: "Gửi nghiệm thu", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } }))
          .trang_thai,
    )
    .toBe("CHO_NGHIEM_THU");
  await signAccount(context, f.accounts.requester);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Nghiệm thu và đóng", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id } }))
          .trang_thai,
    )
    .toBe("HOAN_THANH");
});

async function createUiTask(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  acceptance: "KHONG_CAN" | "NGUOI_YEU_CAU" | "QUAN_LY" = "NGUOI_YEU_CAU",
) {
  await signAccount(context, f.accounts.requester);
  await page.goto("/tasks");
  await page
    .getByRole("button", { name: "Yêu cầu hỗ trợ", exact: true })
    .click();
  const form = page.getByRole("dialog");
  const title = "QA giản lược " + acceptance + " " + Date.now();
  await form.getByLabel("Tiêu đề", { exact: true }).fill(title);
  await form
    .getByLabel("Nội dung", { exact: true })
    .fill("Kiểm tra máy in và xác nhận kết quả.");
  await form
    .getByRole("combobox", { name: "Người hỗ trợ *", exact: true })
    .click();
  await page.getByRole("option", { name: "worker", exact: true }).click();
  if (acceptance !== "NGUOI_YEU_CAU") {
    await form
      .getByRole("combobox", { name: "Nghiệm thu", exact: true })
      .click();
    await page
      .getByRole("option", {
        name:
          acceptance === "KHONG_CAN"
            ? "Không cần"
            : "Quản lý trực tiếp người yêu cầu nghiệm thu",
        exact: true,
      })
      .click();
  }
  await form.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/, { timeout: 30000 });
  return {
    url: page.url(),
    id: Number(new URL(page.url()).pathname.split("/").at(-1)),
    title,
  };
}
async function beginEdit(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Thao tác khác", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Sửa nội dung và thời gian", exact: true })
    .click();
}

test("one mobile primary action receives then completes without acceptance or an intermediate form", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context, "KHONG_CAN");
  const initial = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  expect(initial.han_hoan_thanh).toBeNull();
  expect(initial.bat_dau_luc.getTime()).toBe(initial.created_at.getTime());
  await signAccount(context, f.accounts.worker);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(task.url);
  await expect(
    page.getByRole("heading", { name: task.title, exact: true }),
  ).toHaveCount(1);
  const receive = page.getByRole("button", { name: "Nhận việc", exact: true });
  await receive.focus();
  await page.keyboard.press("Enter");
  const finish = page.getByRole("button", { name: "Báo xong", exact: true });
  await expect(finish).toHaveCount(1);
  await expect(finish).toBeEnabled();
  await expect(page.getByLabel(/Thêm bằng chứng/)).toBeAttached();
  const position = await finish.boundingBox();
  expect(position!.height).toBeGreaterThanOrEqual(40);
  expect(position!.y + position!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${out}/simple-work-mobile.png`,
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Đổi giao diện", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: `${out}/simple-work-mobile-dark.png`,
    fullPage: false,
  });
  await finish.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("HOAN_THANH");
  const done = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  expect(done.bao_xong_luc).not.toBeNull();
  expect(done.nghiem_thu_luc).toBeNull();
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "BAO_XONG" },
    }),
  ).toBe(1);
});

test("manager supplement preserves reason after network failure and retries the same operation before final acceptance", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context, "QUAN_LY");
  await signAccount(context, f.accounts.worker);
  await page.goto(task.url);
  await page.getByRole("button", { name: "Nhận việc", exact: true }).click();
  await page.getByLabel(/Thêm bằng chứng/).setInputFiles({
    name: "proof-simple.png",
    mimeType: "image/png",
    buffer: await (
      await import("sharp")
    )
      .default({
        create: { width: 12, height: 12, channels: 3, background: "#286b3e" },
      })
      .png()
      .toBuffer(),
  });
  await expect(
    page.getByRole("checkbox", {
      name: "Gửi bằng chứng proof-simple.png",
      exact: true,
    }),
  ).toBeChecked();
  await page.screenshot({ path: `${out}/work-desktop.png`, fullPage: false });
  await page
    .getByRole("button", { name: "Gửi nghiệm thu", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("CHO_NGHIEM_THU");
  await signAccount(context, f.accounts.requestManager);
  await page.goto(task.url);
  await page
    .getByRole("button", { name: "Yêu cầu bổ sung", exact: true })
    .click();
  const reason = page.getByRole("textbox", {
    name: /Nội dung cần bổ sung/,
  });
  await reason.fill("Cần ảnh trang in thử rõ chữ và xác nhận kết nối.");
  const operations: string[] = [];
  let abortOnce = true;
  await page.route("**/*", async (route) => {
    const request = route.request(),
      body = request.postData() || "";
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      body.includes("YEU_CAU_BO_SUNG")
    ) {
      const match = body.match(
        /(?:\\?")operationId(?:\\?")\s*:\s*(?:\\?")([0-9a-f-]{36})/,
      );
      if (match) operations.push(match[1]);
      if (abortOnce) {
        abortOnce = false;
        await route.abort("failed");
        return;
      }
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Gửi yêu cầu bổ sung", exact: true })
    .click();
  await expect(
    page.locator('footer[aria-label="Thao tác công việc"]').getByRole("alert"),
  ).toContainText(/kết quả|kết nối|thử lại/i);
  await expect(reason).toHaveValue(
    "Cần ảnh trang in thử rõ chữ và xác nhận kết nối.",
  );
  await expect(reason).toBeDisabled();
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "YEU_CAU_BO_SUNG" },
    }),
  ).toBe(0);
  await page.screenshot({
    path: `${out}/retry-preserves-reason.png`,
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Kiểm tra lần gửi", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("CAN_BO_SUNG");
  expect(operations).toHaveLength(2);
  expect(operations[1]).toBe(operations[0]);
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "YEU_CAU_BO_SUNG" },
    }),
  ).toBe(1);
  await page.unrouteAll({ behavior: "wait" });
  await signAccount(context, f.accounts.worker);
  await page.goto("/tasks?tab=actionable");
  await expect(
    page.getByRole("link").filter({ hasText: task.title }),
  ).toBeVisible();
  await page.goto(task.url);
  await expect(
    page
      .getByText("Cần ảnh trang in thử rõ chữ và xác nhận kết nối.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Gửi nghiệm thu", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("CHO_NGHIEM_THU");
  const reported = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  await page.goto("/tasks?tab=actionable");
  await expect(
    page.getByRole("link").filter({ hasText: task.title }),
  ).toHaveCount(0);
  await signAccount(context, f.accounts.requestManager);
  await page.goto("/tasks?tab=actionable");
  await expect(
    page.getByRole("link").filter({ hasText: task.title }),
  ).toBeVisible();
  await page.goto(task.url);
  await page
    .getByRole("button", { name: "Nghiệm thu và đóng", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("HOAN_THANH");
  const accepted = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  expect(accepted.bao_xong_luc!.getTime()).toBe(
    reported.bao_xong_luc!.getTime(),
  );
  expect(accepted.so_lan_bao_xong).toBe(2);
});

test("stale edits keep entered values while loading the current version and explicit retry uses the new base", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context);
  await beginEdit(page);
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Sửa kèm tệp mô tả " + task.id);
  await page.getByLabel("Thêm tệp mô tả", { exact: true }).setInputFiles({
    name: "description-during-edit.png",
    mimeType: "image/png",
    buffer: await (
      await import("sharp")
    )
      .default({
        create: { width: 12, height: 12, channels: 3, background: "#286b3e" },
      })
      .png()
      .toBuffer(),
  });
  await expect(
    page.getByRole("link", {
      name: "description-during-edit.png",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).tieu_de,
    )
    .toBe("Sửa kèm tệp mô tả " + task.id);
  await expect(
    page.locator('footer[aria-label="Thao tác công việc"]').getByRole("alert"),
  ).toHaveCount(0);
  await beginEdit(page);
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Bản sửa đang nhập " + task.id);
  const other = await context.newPage();
  await other.goto(task.url);
  await beginEdit(other);
  await other
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Đã đổi từ phiên khác " + task.id);
  await other
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).tieu_de,
    )
    .toBe("Đã đổi từ phiên khác " + task.id);
  await other.close();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.locator('footer[aria-label="Thao tác công việc"]').getByRole("alert"),
  ).toContainText(/thay đổi|cũ|cập nhật/i);
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Bản sửa đang nhập " + task.id,
  );
  await page.getByRole("button", { name: "Xem cập nhật", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Bản sửa đang nhập " + task.id,
  );
  expect(
    (await db.cong_viec_ho_tro.findUniqueOrThrow({ where: { id: task.id } }))
      .tieu_de,
  ).toBe("Đã đổi từ phiên khác " + task.id);
  await page.screenshot({
    path: `${out}/conflict-preserves-edit.png`,
    fullPage: false,
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Dùng bản mới", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(
    "Bản sửa đang nhập " + task.id,
  );
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).tieu_de,
    )
    .toBe("Bản sửa đang nhập " + task.id);
});

test("lost completion response retries the committed operation without creating a second completion event", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context, "KHONG_CAN");
  await signAccount(context, f.accounts.worker);
  await page.goto(task.url);
  await page.getByRole("button", { name: "Nhận việc", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Báo xong", exact: true }),
  ).toBeEnabled();
  const operations: string[] = [];
  let dropOnce = true;
  await page.route("**/*", async (route) => {
    const request = route.request(),
      body = request.postData() || "";
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      body.includes("BAO_XONG")
    ) {
      const match = body.match(
        /(?:\\?")operationId(?:\\?")\s*:\s*(?:\\?")([0-9a-f-]{36})/,
      );
      if (match) operations.push(match[1]);
      if (dropOnce) {
        dropOnce = false;
        const result = await route.fetch();
        expect(result.ok()).toBe(true);
        await route.abort("failed");
        return;
      }
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Báo xong", exact: true }).click();
  await expect(
    page.locator('footer[aria-label="Thao tác công việc"]').getByRole("alert"),
  ).toContainText(/kết quả|kết nối|thử lại/i);
  const committed = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  expect(committed.trang_thai).toBe("HOAN_THANH");
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "BAO_XONG" },
    }),
  ).toBe(1);
  await page.screenshot({ path: `${out}/unknown-result.png`, fullPage: false });
  await page
    .getByRole("button", { name: "Kiểm tra lần gửi", exact: true })
    .click();
  await expect(
    page.locator('footer[aria-label="Thao tác công việc"]').getByRole("alert"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Báo xong", exact: true }),
  ).toHaveCount(0);
  expect(operations).toHaveLength(2);
  expect(operations[1]).toBe(operations[0]);
  const after = await db.cong_viec_ho_tro.findUniqueOrThrow({
    where: { id: task.id },
  });
  expect(after.version).toBe(committed.version);
  expect(after.bao_xong_luc!.getTime()).toBe(committed.bao_xong_luc!.getTime());
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "BAO_XONG" },
    }),
  ).toBe(1);
});

test("direct recipient can decline with a recorded reason", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context);
  await signAccount(context, f.accounts.worker);
  await page.goto(task.url);
  await page
    .getByRole("button", { name: "Từ chối yêu cầu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Từ chối yêu cầu", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: /Lý do từ chối/ }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("textbox", { name: /Lý do từ chối/ }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: /Lý do từ chối/ })
    .fill("Không thuộc chuyên môn, cần chuyển cho đơn vị phù hợp.");
  await page
    .getByRole("button", { name: "Từ chối yêu cầu", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await db.cong_viec_ho_tro.findUniqueOrThrow({
            where: { id: task.id },
          })
        ).trang_thai,
    )
    .toBe("TU_CHOI");
  const event = await db.lich_su_cong_viec.findFirstOrThrow({
    where: { cong_viec_id: task.id, hanh_dong: "TU_CHOI_YEU_CAU" },
  });
  expect(event.ly_do).toBe(
    "Không thuộc chuyên môn, cần chuyển cho đơn vị phù hợp.",
  );
});

test("lost upload response survives panel reopen and reselecting the same file replays one upload", async ({
  page,
  context,
}) => {
  const task = await createUiTask(page, context, "KHONG_CAN");
  await signAccount(context, f.accounts.worker);
  await page.goto(task.url);
  await page.getByRole("button", { name: "Nhận việc", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Báo xong", exact: true }),
  ).toBeEnabled();
  await page.goto(
    "/tasks?" +
      new URLSearchParams({
        tab: "actionable",
        search: task.title,
        task: String(task.id),
      }),
  );
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  const filePath = `${out}/lost-upload.png`;
  writeFileSync(
    filePath,
    await (
      await import("sharp")
    )
      .default({
        create: { width: 14, height: 14, channels: 3, background: "#35654d" },
      })
      .png()
      .toBuffer(),
  );
  let dropOnce = true;
  const uploads: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request(),
      body = request.postData() || "";
    if (
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      body.includes("lost-upload.png")
    ) {
      const match = body.match(
        /name="[^"]*uploadId"[\s\S]*?([0-9a-f]{8}-[0-9a-f-]{27})/,
      );
      expect(match, "The request includes the original upload receipt").not.toBeNull();
      uploads.push(match![1]);
      if (dropOnce) {
        dropOnce = false;
        // Chromium omits file bytes from intercepted multipart bodies. Restore
        // the exact fixture bytes before forwarding, then lose only the response.
        const boundary = request.headers()["content-type"].match(/boundary=(.+)$/)?.[1];
        expect(boundary).toBeTruthy();
        const fileHeader = body.indexOf('filename="lost-upload.png"');
        expect(fileHeader).toBeGreaterThan(0);
        const byteStart = body.indexOf("\r\n\r\n", fileHeader) + 4;
        const byteEnd = body.indexOf(`\r\n--${boundary}`, byteStart);
        expect(byteEnd).toBeGreaterThanOrEqual(byteStart);
        const forwarded = Buffer.concat([
          Buffer.from(body.slice(0, byteStart)),
          readFileSync(filePath),
          Buffer.from(body.slice(byteEnd)),
        ]);
        const result = await route.fetch({ postData: forwarded });
        expect(result.ok()).toBe(true);
        const responseBody = await result.text();
        writeFileSync(`${out}/lost-upload-server-response.txt`, responseBody);
        expect(responseBody).toContain('"success":true');
        await route.abort("failed");
        return;
      }
    }
    await route.continue();
  });
  await expect(panel.getByRole("button", { name: "Thêm tệp", exact: true })).toBeEnabled();
  await panel.getByLabel(/Thêm bằng chứng/).setInputFiles(filePath);
  await expect(
    panel.getByRole("alert").filter({ hasText: /kết quả tải tệp/i }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Báo xong", exact: true }),
  ).toBeDisabled();
  expect(
    await db.tep_cong_viec.count({
      where: { cong_viec_id: task.id, ten_goc: "lost-upload.png" },
    }),
  ).toBe(1);
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "THEM_TEP" },
    }),
  ).toBe(1);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await page.getByRole("link").filter({ hasText: task.title }).click();
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Báo xong", exact: true }),
  ).toBeDisabled();
  await expect(panel.getByRole("button", { name: "Chọn lại tệp", exact: true })).toBeEnabled();
  await panel.getByLabel(/Thêm bằng chứng/).setInputFiles(filePath);
  await expect(
    panel.getByRole("button", { name: "Báo xong", exact: true }),
  ).toBeEnabled();
  expect(uploads).toHaveLength(2);
  expect(uploads[1]).toBe(uploads[0]);
  expect(
    await db.tep_cong_viec.count({
      where: { cong_viec_id: task.id, ten_goc: "lost-upload.png" },
    }),
  ).toBe(1);
  expect(
    await db.lich_su_cong_viec.count({
      where: { cong_viec_id: task.id, hanh_dong: "THEM_TEP" },
    }),
  ).toBe(1);
});
