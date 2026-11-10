import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { signAccount } from "../helpers/account-fixture";

const p = new PrismaClient();
const run = randomUUID().slice(0, 8);
let companyId: number,
  otherCompanyId: number,
  personId: number,
  adminId: number,
  roleId: number;
const password = `Test-${randomUUID()}`;
let admin: {
  id: number;
  company_id: number;
  phien_ban_dang_nhap: number;
};
test.beforeAll(async () => {
  const company = await p.cong_ty.create({
    data: { ten_cong_ty: `Identity test ${run}` },
  });
  companyId = company.id;
  otherCompanyId = (
    await p.cong_ty.create({
      data: { ten_cong_ty: `Other identity test ${run}` },
    })
  ).id;
  const dept = await p.phong_ban.create({
    data: {
      company_id: companyId,
      ma_phong_ban: "TEST",
      ten_phong_ban: "Phòng kiểm thử",
    },
  });
  const person = await p.nhan_su.create({
    data: {
      company_id: companyId,
      department_id: dept.id,
      ma_nhan_su: "TEST-PERSON",
      ho_ten: "Nhân sự kiểm thử",
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  personId = person.id;
  const role = await p.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "ADMIN",
      ten_vai_tro: "Quản trị kiểm thử",
    },
  });
  roleId = role.id;
  await p.vai_tro_quyen.createMany({
    data: (await p.quyen.findMany({ where: { pham_vi: "ALL" } })).map((q) => ({
      role_id: roleId,
      permission_id: q.id,
    })),
  });
  admin = await p.tai_khoan.create({
    data: {
      company_id: companyId,
      employee_id: person.id,
      ten_dang_nhap: `identity-admin-${run}`,
      ten_hien_thi: person.ho_ten,
      mat_khau_bam: await bcrypt.hash(password, 10),
      danh_sach_vai_tro: { create: { role_id: roleId } },
    },
  });
  adminId = admin.id;
});
test.afterAll(async () => {
  for (const id of [companyId, otherCompanyId].filter(Boolean)) {
    await p.nhat_ky_hoat_dong.deleteMany({ where: { company_id: id } });
    await p.tai_khoan.deleteMany({ where: { company_id: id } });
    await p.nhan_su.deleteMany({ where: { company_id: id } });
    await p.vai_tro.deleteMany({ where: { company_id: id } });
    await p.phong_ban.deleteMany({ where: { company_id: id } });
    await p.cong_ty.delete({ where: { id: id } });
  }
  await p.$disconnect();
});
test("DB supports zero/multiple accounts and rejects cross-company links", async () => {
  const employee = await p.nhan_su.create({
    data: {
      company_id: companyId,
      ma_nhan_su: "NO-ACCOUNT",
      ho_ten: "Người không dùng ERP",
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  expect(
    await p.tai_khoan.count({
      where: { employee_id: employee.id },
    }),
  ).toBe(0);
  const before = await p.nhan_su.count({
    where: { company_id: companyId },
  });
  const account = await p.tai_khoan.create({
    data: {
      company_id: companyId,
      employee_id: personId,
      ten_dang_nhap: `identity-second-${run}`,
      ten_hien_thi: "Tài khoản thứ hai",
      mat_khau_bam: "disabled-for-login",
    },
  });
  expect(
    await p.tai_khoan.count({ where: { employee_id: personId } }),
  ).toBe(2);
  await p.tai_khoan.update({
    where: { id: account.id },
    data: { cho_phep_dang_nhap: false },
  });
  expect(
    await p.nhan_su.count({ where: { company_id: companyId } }),
  ).toBe(before);
  expect(
    (await p.nhan_su.findUniqueOrThrow({ where: { id: personId } }))
      .tinh_trang_lam_viec,
  ).toBe("ACTIVE");
  await expect(
    p.tai_khoan.create({
      data: {
        company_id: otherCompanyId,
        employee_id: personId,
        ten_dang_nhap: `cross-company-${run}`,
        ten_hien_thi: "Invalid",
        mat_khau_bam: "disabled",
      },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  const foreignDepartment = await p.phong_ban.create({
    data: {
      company_id: otherCompanyId,
      ma_phong_ban: "OTHER",
      ten_phong_ban: "Other",
    },
  });
  await expect(
    p.nhan_su.update({
      where: { id: employee.id },
      data: { department_id: foreignDepartment.id },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  await p.tai_khoan.delete({ where: { id: account.id } });
});
test("UI creates a profile independently and two accounts without extra people", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  await page.goto("/employees");
  await page.getByRole("button", { name: "Thêm nhân sự" }).click();
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Người mới kiểm thử");
  await expect(page.getByText("Tự cấp khi lưu")).toBeVisible();
  await page.getByRole("combobox", { name: "Phòng ban", exact: true }).click();
  await page
    .getByRole("option", { name: "Phòng kiểm thử", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Tạo tài khoản đăng nhập", exact: true })
    .uncheck();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const employee = await p.nhan_su.findFirstOrThrow({
    where: { company_id: companyId, ho_ten: "Người mới kiểm thử" },
  });
  expect(
    await p.tai_khoan.count({
      where: { employee_id: employee.id },
    }),
  ).toBe(0);
  const count = await p.nhan_su.count({
    where: { company_id: companyId },
  });
  for (const suffix of ["personal", "extra"]) {
    await page.goto("/accounts");
    await page
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Nhân sự sở hữu" }).click();
    await page
      .getByRole("option", { name: new RegExp(employee.ma_nhan_su) })
      .click();
    await page
      .getByLabel("Tên đăng nhập", { exact: true })
      .fill(`identity-${suffix}-${run}`);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Lưu tài khoản" }).click();
    await page
      .getByRole("button", { name: "Đã lưu thông tin bàn giao" })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByText(`identity-${suffix}-${run}`, { exact: true }),
    ).toBeVisible();
  }
  expect(
    await p.tai_khoan.count({
      where: { employee_id: employee.id },
    }),
  ).toBe(2);
  expect(
    await p.nhan_su.count({ where: { company_id: companyId } }),
  ).toBe(count);
  await page.goto("/employees");
  await page.getByLabel("Tìm nhân sự").fill(employee.ma_nhan_su);
  await page.getByRole("button", { name: `Xem hồ sơ ${employee.ho_ten}`, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("2 tài khoản");
  await page.getByRole("button", { name: "Đóng hồ sơ", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("combobox", { name: "Tình trạng làm việc" }),
  ).toContainText("Tất cả tình trạng");
  await page.screenshot({
    path: "outputs/identity-employees-mobile.png",
    fullPage: true,
  });
  await page.goto("/accounts");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const html = await page.content();
  const account = await p.tai_khoan.findUniqueOrThrow({
    where: { ten_dang_nhap: `identity-personal-${run}` },
  });
  expect(html).not.toContain(account.mat_khau_bam);
  await page
    .getByRole("row")
    .filter({ hasText: `identity-extra-${run}` })
    .getByRole("button", { name: "Sửa tài khoản" })
    .click();
  await page.getByLabel("Cho phép đăng nhập").uncheck();
  await page.getByRole("button", { name: "Lưu tài khoản" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await p.nhan_su.count({ where: { company_id: companyId } }),
  ).toBe(count);
});
test("login uses account permissions; blocked or revoked sessions are rejected", async ({
  page,
  context,
}) => {
  const user = await p.tai_khoan.create({
    data: {
      company_id: companyId,
      employee_id: personId,
      ten_dang_nhap: `identity-plain-${run}`,
      ten_hien_thi: "Cá nhân",
      mat_khau_bam: await bcrypt.hash(password, 10),
    },
  });
  await page.goto("/login");
  await page
    .getByLabel("Tên đăng nhập", { exact: true })
    .fill(user.ten_dang_nhap);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/accounts");
  await expect(
    page.getByText("Không có quyền quản lý tài khoản."),
  ).toBeVisible();
  await p.tai_khoan.update({
    where: { id: user.id },
    data: { cho_phep_dang_nhap: false },
  });
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);
  await p.tai_khoan.update({
    where: { id: user.id },
    data: { cho_phep_dang_nhap: true, phien_ban_dang_nhap: { increment: 1 } },
  });
  await signAccount(context, user); // old version
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);
});
test("last active administrator cannot remove own admin role", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  await page.goto("/accounts");
  await page
    .getByRole("row")
    .filter({ hasText: `identity-admin-${run}` })
    .getByRole("button", { name: "Sửa tài khoản" })
    .click();
  await page.getByLabel("Quản trị kiểm thử", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Lưu tài khoản" }).click();
  await expect(
    page.getByText(/Phải giữ ít nhất một tài khoản quản trị hoạt động/),
  ).toBeVisible();
  expect(
    await p.tai_khoan_vai_tro.count({
      where: { account_id: adminId, role_id: roleId },
    }),
  ).toBe(1);
});
test("HR list and 3D count people, including people with no account", async ({
  page,
  context,
}) => {
  const added = await p.nhan_su.create({
    data: {
      company_id: companyId,
      ma_nhan_su: "3D-NO-ACCOUNT",
      ho_ten: "Nhân sự không tài khoản 3D",
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  await p.tai_khoan.create({
    data: {
      company_id: companyId,
      employee_id: personId,
      ten_dang_nhap: `identity-3d-${run}`,
      ten_hien_thi: "Tài khoản phụ đã khóa",
      mat_khau_bam: "disabled",
      cho_phep_dang_nhap: false,
    },
  });
  const count = await p.nhan_su.count({
    where: { company_id: companyId, tinh_trang_lam_viec: "ACTIVE" },
  });
  await signAccount(context, admin);
  await page.goto("/employees");
  await expect(
    page.getByText(new RegExp(`${count} đang làm việc theo hồ sơ`)),
  ).toBeVisible();
  await page.goto("/office-3d");
  await expect(page.getByRole("heading", { name: "Bản đồ 3D tòa nhà" })).toBeVisible();
  await expect(page.getByText(`${count} CBNV`, { exact: true })).toBeVisible();
  expect(
    await p.tai_khoan.count({ where: { employee_id: added.id } }),
  ).toBe(0);
});
test("HR manager can edit people but cannot administer accounts", async ({
  page,
  context,
}) => {
  const permission = await p.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "MANAGE" },
  });
  const role = await p.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "TEST_HR",
      ten_vai_tro: "HR",
      danh_sach_quyen: { create: { permission_id: permission.id } },
    },
  });
  const user = await p.tai_khoan.create({
    data: {
      company_id: companyId,
      ten_dang_nhap: `identity-hr-${run}`,
      ten_hien_thi: "HR",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { role_id: role.id } },
    },
  });
  await signAccount(context, user);
  await page.goto("/employees");
  await expect(
    page.getByRole("button", { name: "Thêm nhân sự" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tài khoản đăng nhập" }),
  ).toHaveCount(0);
  await page.goto("/accounts");
  await expect(
    page.getByText("Không có quyền quản lý tài khoản."),
  ).toBeVisible();
});
