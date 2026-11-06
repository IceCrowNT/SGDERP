import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
const run = randomUUID().slice(0, 8);
let companyId: number,
  otherId: number,
  departmentId: number,
  secondDept: number,
  foreignPerson: number,
  foreignRole: number;
let adminRole: number, staffRole: number;
let admin: {
  id: number;
  company_id: number;
  phien_ban_dang_nhap: number;
};
let hr: typeof admin;
const action = (r: Request) =>
  r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, req: Request, input: unknown) {
  return (
    await page.request.post(new URL(req.url()).pathname, {
      headers: {
        "Next-Action": req.headers()["next-action"],
        "Content-Type": req.headers()["content-type"],
      },
      data: JSON.stringify([input]),
    })
  ).text();
}
async function person(name: string, status: "ACTIVE" | "LEFT" = "ACTIVE") {
  return db.nhan_su.create({
    data: {
      company_id: companyId,
      department_id: departmentId,
      ho_ten: name,
      tinh_trang_lam_viec: status,
    },
  });
}
async function edit(page: Page, name: string) {
  await page.goto("/employees");
  await page.getByLabel("Tìm nhân sự").fill(name);
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
}
async function save(page: Page) {
  const sending = page.waitForRequest(action);
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  const req = await sending;
  await expect
    .poll(
      async () =>
        (await page.getByRole("dialog").count()) === 0 ||
        (await page
          .getByRole("button", { name: "Đã lưu thông tin bàn giao" })
          .isVisible()),
    )
    .toBe(true);
  if (
    await page
      .getByRole("button", { name: "Đã lưu thông tin bàn giao" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Đã lưu thông tin bàn giao" })
      .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return req;
}
test.beforeAll(async () => {
  companyId = (
    await db.cong_ty.create({ data: { ten_cong_ty: `Lifecycle ${run}` } })
  ).id;
  otherId = (
    await db.cong_ty.create({ data: { ten_cong_ty: `Other lifecycle ${run}` } })
  ).id;
  departmentId = (
    await db.phong_ban.create({
      data: {
        company_id: companyId,
        ma_phong_ban: "KD",
        ten_phong_ban: "Kinh doanh thử nghiệm",
      },
    })
  ).id;
  secondDept = (
    await db.phong_ban.create({
      data: {
        company_id: companyId,
        ma_phong_ban: "HCNS",
        ten_phong_ban: "HCNS thử nghiệm",
      },
    })
  ).id;
  foreignPerson = (
    await db.nhan_su.create({
      data: {
        company_id: otherId,
        ho_ten: "Ngoài công ty",
        tinh_trang_lam_viec: "ACTIVE",
      },
    })
  ).id;
  foreignRole = (
    await db.vai_tro.create({
      data: {
        company_id: otherId,
        ma_vai_tro: "OTHER",
        ten_vai_tro: "Other",
      },
    })
  ).id;
  const view = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "VIEW" },
  });
  const manage = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "MANAGE" },
  });
  adminRole = (
    await db.vai_tro.create({
      data: {
        company_id: companyId,
        ma_vai_tro: "ADMIN",
        ten_vai_tro: "Quản trị thử nghiệm",
      },
    })
  ).id;
  await db.vai_tro_quyen.createMany({
    data: (await db.quyen.findMany({ where: { pham_vi: "ALL" } })).map((q) => ({
      role_id: adminRole,
      permission_id: q.id,
    })),
  });
  staffRole = (
    await db.vai_tro.create({
      data: {
        company_id: companyId,
        ma_vai_tro: "STAFF",
        ten_vai_tro: "Nhân viên thử nghiệm",
        danh_sach_quyen: { create: { permission_id: view.id } },
      },
    })
  ).id;
  const hrRole = await db.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "HR_TEST",
      ten_vai_tro: "Quản lý HR thử nghiệm",
      danh_sach_quyen: { create: { permission_id: manage.id } },
    },
  });
  admin = await db.tai_khoan.create({
    data: {
      company_id: companyId,
      ten_dang_nhap: `lc-admin-${run}`,
      ten_hien_thi: "Admin",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { role_id: adminRole } },
    },
  });
  hr = await db.tai_khoan.create({
    data: {
      company_id: companyId,
      ten_dang_nhap: `lc-hr-${run}`,
      ten_hien_thi: "HR",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { role_id: hrRole.id } },
    },
  });
});
test.afterAll(async () => {
  for (const id of [companyId, otherId].filter(Boolean)) {
    await db.phong_ban.updateMany({
      where: { company_id: id },
      data: { nguoi_phu_trach_id: null },
    });
    await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: id } });
    await db.tai_khoan.deleteMany({ where: { company_id: id } });
    await db.nhan_su.deleteMany({ where: { company_id: id } });
    await db.phong_ban.deleteMany({ where: { company_id: id } });
    await db.vai_tro.deleteMany({ where: { company_id: id } });
    await db.cong_ty.delete({ where: { id: id } });
  }
  await db.$disconnect();
});

test("one save creates profile and optional account atomically; roles and partial fields validated", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await signAccount(context, admin);
  await page.goto("/employees");
  await page.getByRole("button", { name: "Thêm nhân sự", exact: true }).click();
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Người tạo kèm tài khoản");
  await page.getByRole("combobox", { name: "Phòng ban", exact: true }).click();
  await page
    .getByRole("option", { name: "Kinh doanh thử nghiệm", exact: true })
    .click();
  const username = `lc-created-${run}`;
  await page.getByText("Tùy chọn nâng cao", { exact: true }).click();
  await page.getByLabel("Tên đăng nhập mới", { exact: true }).fill(username);
  await page
    .getByLabel("Mật khẩu khởi tạo", { exact: true })
    .fill("Test-only-123");
  await page
    .getByRole("checkbox", { name: "Nhân viên thử nghiệm", exact: true })
    .check();
  await page.screenshot({ path: "outputs/hr-lifecycle/create-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/hr-lifecycle/create-mobile.png" });
  const req = await save(page);
  const input = JSON.parse(req.postData()!)[0];
  const account = await db.tai_khoan.findUniqueOrThrow({
    where: { ten_dang_nhap: username },
    include: { nhan_su: true, danh_sach_vai_tro: true },
  });
  expect(account.nhan_su?.ho_ten).toBe(input.fullName);
  expect(account.danh_sach_vai_tro.map((r) => r.role_id)).toEqual([
    staffRole,
  ]);
  expect(await bcrypt.compare("Test-only-123", account.mat_khau_bam)).toBe(
    true,
  );
  expect(
    await replay(page, req, {
      ...input,
      fullName: "Không được tạo vì trùng username",
    }),
  ).toContain('"success":false');
  expect(
    await db.nhan_su.count({
      where: {
        company_id: companyId,
        ho_ten: "Không được tạo vì trùng username",
      },
    }),
  ).toBe(0);
  expect(
    await replay(page, req, {
      ...input,
      accountUsername: `lc-foreign-${run}`,
      accountRoleIds: [foreignRole],
    }),
  ).toContain("Vai trò không hợp lệ");
  expect(
    await replay(page, req, {
      ...input,
      accountUsername: "!",
      accountPassword: "Test-only-123",
    }),
  ).toContain("fieldErrors");
  const audit = await db.nhat_ky_hoat_dong.findMany({
    where: { company_id: companyId },
  });
  expect(JSON.stringify(audit)).not.toContain("Test-only-123");
  expect(JSON.stringify(audit)).not.toContain(account.mat_khau_bam);
  await signAccount(context, hr);
  await page.reload();
  await page.getByRole("button", { name: "Thêm nhân sự", exact: true }).click();
  await expect(
    page.getByLabel("Tên đăng nhập mới", { exact: true }),
  ).toHaveCount(0);
  expect(
    await replay(page, req, { ...input, accountUsername: `lc-forged-${run}` }),
  ).toContain("Không có quyền quản lý tài khoản");
  expect(
    await replay(page, req, {
      fullName: "Chỉ có hồ sơ",
      departmentId,
      employmentStatus: "ACTIVE",
    }),
  ).toContain('"success":true');
  const only = await db.nhan_su.findFirstOrThrow({
    where: { company_id: companyId, ho_ten: "Chỉ có hồ sơ" },
    include: { _count: { select: { danh_sach_tai_khoan: true } } },
  });
  expect(only._count.danh_sach_tai_khoan).toBe(0);
});

test("department head can hold several offices without granting account rights; tenant and inactive guards", async ({
  page,
  context,
}) => {
  await signAccount(context, hr);
  const head = await person("Trưởng phòng kiêm nhiệm");
  const left = await person("Người đã nghỉ thử nghiệm", "LEFT");
  await page.goto("/departments");
  await page
    .getByRole("button", {
      name: "Sửa phòng ban Kinh doanh thử nghiệm",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", { name: "Người phụ trách phòng ban", exact: true })
    .click();
  await page.getByRole("option", { name: new RegExp(head.ma_nhan_su) }).click();
  const sent = page.waitForRequest(action);
  await page
    .getByRole("button", { name: "Lưu phòng ban", exact: true })
    .click();
  const req = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const input = JSON.parse(req.postData()!)[0];
  expect(
    await replay(page, req, {
      ...input,
      id: secondDept,
      name: "HCNS thử nghiệm",
      code: "HCNS",
    }),
  ).toContain('"success":true');
  expect(
    await db.phong_ban.count({
      where: { nguoi_phu_trach_id: head.id },
    }),
  ).toBe(2);
  expect(
    await db.tai_khoan.count({ where: { employee_id: head.id } }),
  ).toBe(0);
  expect(
    await replay(page, req, { ...input, headEmployeeId: foreignPerson }),
  ).toContain("cùng công ty");
  expect(
    await replay(page, req, { ...input, headEmployeeId: left.id }),
  ).toContain("đang làm việc");
  await expect(
    db.phong_ban.update({
      where: { id: departmentId },
      data: { nguoi_phu_trach_id: foreignPerson },
    }),
  ).rejects.toThrow();
  await page.reload();
  await expect(
    page.getByText("Phụ trách: Trưởng phòng kiêm nhiệm", { exact: true }),
  ).toHaveCount(2);
});

test("leaving locks all accounts and revokes sessions; rehiring never reactivates accounts", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const employee = await person("Nhân sự nghỉ việc kiểm thử");
  const accounts = [];
  for (const role of [staffRole, adminRole])
    accounts.push(
      await db.tai_khoan.create({
        data: {
          company_id: companyId,
          employee_id: employee.id,
          ten_dang_nhap: `lc-leave-${role}-${run}`,
          ten_hien_thi: employee.ho_ten,
          mat_khau_bam: await bcrypt.hash("Test-only-123", 10),
          danh_sach_vai_tro: { create: { role_id: role } },
        },
      }),
    );
  const oldContext = await browser.newContext();
  try {
    await signAccount(oldContext, accounts[0]);
    const oldPage = await oldContext.newPage();
    await oldPage.goto("/employees");
    await expect(
      oldPage.getByRole("heading", { name: "Hồ sơ nhân sự", exact: true }),
    ).toBeVisible();
    await signAccount(context, hr);
    await edit(page, employee.ho_ten);
    await page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Tình trạng làm việc", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Đã nghỉ việc", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "tất cả tài khoản" }),
    ).toBeVisible();
    const req = await save(page);
    const input = JSON.parse(req.postData()!)[0];
    const updated = await db.tai_khoan.findMany({
      where: { employee_id: employee.id },
    });
    expect(updated).toHaveLength(2);
    for (const a of updated)
      expect(a).toMatchObject({
        cho_phep_dang_nhap: false,
        phien_ban_dang_nhap: 1,
      });
    expect(
      await db.nhat_ky_hoat_dong.count({
        where: {
          company_id: companyId,
          phan_he: "AUTH",
          doi_tuong_id: { in: accounts.map((a) => String(a.id)) },
        },
      }),
    ).toBe(2);
    await oldPage.reload();
    await expect(oldPage).toHaveURL(/\/login/);
    await oldPage
      .getByLabel("Tên đăng nhập", { exact: true })
      .fill(accounts[0].ten_dang_nhap);
    await oldPage.getByLabel("Mật khẩu", { exact: true }).fill("Test-only-123");
    await oldPage
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
    await expect(
      oldPage
        .getByRole("main")
        .getByText("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động."),
    ).toBeVisible();
    expect(
      await replay(page, req, { ...input, employmentStatus: "ACTIVE" }),
    ).toContain('"success":true');
    expect(
      await db.tai_khoan.count({
        where: {
          employee_id: employee.id,
          cho_phep_dang_nhap: true,
        },
      }),
    ).toBe(0);
    expect(
      await replay(page, req, { ...input, employmentStatus: "LEFT" }),
    ).toContain('"success":true');
  } finally {
    await oldContext.close();
  }
});

test("leaving the last administrator rolls back person and account changes", async ({
  page,
  context,
}) => {
  const employee = await person("Quản trị cuối cùng thử nghiệm");
  await db.tai_khoan.update({
    where: { id: admin.id },
    data: { employee_id: employee.id },
  });
  await signAccount(context, hr);
  await edit(page, employee.ho_ten);
  // Capture update action with a harmless save before testing rollback.
  const req = await save(page);
  const input = JSON.parse(req.postData()!)[0];
  expect(
    await replay(page, req, { ...input, employmentStatus: "LEFT" }),
  ).toContain("bàn giao quyền quản trị");
  expect(
    (
      await db.nhan_su.findUniqueOrThrow({
        where: { id: employee.id },
      })
    ).tinh_trang_lam_viec,
  ).toBe("ACTIVE");
  expect(
    (
      await db.tai_khoan.findUniqueOrThrow({
        where: { id: admin.id },
      })
    ).cho_phep_dang_nhap,
  ).toBe(true);
});

test("account edits cannot reopen a departed employee; concurrent account creation and departure stay consistent", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const employee = await person("Kiểm thử cấp tài khoản đồng thời");
  const account = await db.tai_khoan.create({
    data: {
      company_id: companyId,
      employee_id: employee.id,
      ten_dang_nhap: `lc-race-${run}`,
      ten_hien_thi: employee.ho_ten,
      mat_khau_bam: "disabled",
    },
  });
  await signAccount(context, admin);
  await page.goto("/accounts");
  await page
    .getByRole("row")
    .filter({ hasText: account.ten_dang_nhap })
    .getByRole("button", { name: "Sửa tài khoản", exact: true })
    .click();
  const sent = page.waitForRequest(action);
  await page
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  const accountReq = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const accountInput = JSON.parse(accountReq.postData()!)[0];
  await edit(page, employee.ho_ten);
  await expect(
    page.getByRole("list", { name: "Tài khoản liên kết" }),
  ).toContainText(account.ten_dang_nhap);
  const employeeReq = await save(page);
  const employeeInput = JSON.parse(employeeReq.postData()!)[0];
  const race = await Promise.all([
    replay(page, employeeReq, { ...employeeInput, employmentStatus: "LEFT" }),
    replay(page, accountReq, {
      ...accountInput,
      id: undefined,
      username: `lc-race-new-${run}`,
      password: "Test-only-123",
      roleIds: [staffRole],
    }),
  ]);
  expect(race[0]).toContain('"success":true');
  expect(
    race[1].includes('"success":true') || race[1].includes("đã nghỉ việc"),
  ).toBe(true);
  expect(
    await db.tai_khoan.count({
      where: {
        employee_id: employee.id,
        cho_phep_dang_nhap: true,
      },
    }),
  ).toBe(0);
  expect(
    await replay(page, accountReq, { ...accountInput, isActive: true }),
  ).toContain("Không thể mở tài khoản");
  await page.goto("/accounts");
  await page
    .getByRole("row")
    .filter({ hasText: account.ten_dang_nhap })
    .getByRole("button", { name: "Sửa tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Cho phép đăng nhập", exact: true }),
  ).toBeDisabled();
});
