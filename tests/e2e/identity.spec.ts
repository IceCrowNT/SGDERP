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
let admin: { id: number; companyId: number; sessionVersion: number };
test.beforeAll(async () => {
  const company = await p.company.create({
    data: { name: `Identity test ${run}` },
  });
  companyId = company.id;
  otherCompanyId = (
    await p.company.create({ data: { name: `Other identity test ${run}` } })
  ).id;
  const dept = await p.department.create({
    data: { companyId, code: "TEST", name: "Phòng kiểm thử" },
  });
  const person = await p.employee.create({
    data: {
      companyId,
      departmentId: dept.id,
      employeeCode: "TEST-PERSON",
      fullName: "Nhân sự kiểm thử",
      employmentStatus: "ACTIVE",
    },
  });
  personId = person.id;
  const role = await p.role.create({
    data: { companyId, code: "ADMIN", name: "Quản trị kiểm thử" },
  });
  roleId = role.id;
  admin = await p.user.create({
    data: {
      companyId,
      employeeId: person.id,
      username: `identity-admin-${run}`,
      displayName: person.fullName,
      password: await bcrypt.hash(password, 10),
      roles: { create: { roleId } },
    },
  });
  adminId = admin.id;
});
test.afterAll(async () => {
  for (const id of [companyId, otherCompanyId].filter(Boolean)) {
    await p.auditLog.deleteMany({ where: { companyId: id } });
    await p.user.deleteMany({ where: { companyId: id } });
    await p.employee.deleteMany({ where: { companyId: id } });
    await p.role.deleteMany({ where: { companyId: id } });
    await p.department.deleteMany({ where: { companyId: id } });
    await p.company.delete({ where: { id } });
  }
  await p.$disconnect();
});
test("DB supports zero/multiple accounts and rejects cross-company links", async () => {
  const employee = await p.employee.create({
    data: {
      companyId,
      employeeCode: "NO-ACCOUNT",
      fullName: "Người không dùng ERP",
      employmentStatus: "ACTIVE",
    },
  });
  expect(await p.user.count({ where: { employeeId: employee.id } })).toBe(0);
  const before = await p.employee.count({ where: { companyId } });
  const account = await p.user.create({
    data: {
      companyId,
      employeeId: personId,
      username: `identity-second-${run}`,
      displayName: "Tài khoản thứ hai",
      password: "disabled-for-login",
    },
  });
  expect(await p.user.count({ where: { employeeId: personId } })).toBe(2);
  await p.user.update({ where: { id: account.id }, data: { isActive: false } });
  expect(await p.employee.count({ where: { companyId } })).toBe(before);
  expect(
    (await p.employee.findUniqueOrThrow({ where: { id: personId } }))
      .employmentStatus,
  ).toBe("ACTIVE");
  await expect(
    p.user.create({
      data: {
        companyId: otherCompanyId,
        employeeId: personId,
        username: `cross-company-${run}`,
        displayName: "Invalid",
        password: "disabled",
      },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  const foreignDepartment = await p.department.create({
    data: { companyId: otherCompanyId, code: "OTHER", name: "Other" },
  });
  await expect(
    p.employee.update({
      where: { id: employee.id },
      data: { departmentId: foreignDepartment.id },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  await p.user.delete({ where: { id: account.id } });
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
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const employee = await p.employee.findFirstOrThrow({
    where: { companyId, fullName: "Người mới kiểm thử" },
  });
  expect(await p.user.count({ where: { employeeId: employee.id } })).toBe(0);
  const count = await p.employee.count({ where: { companyId } });
  for (const suffix of ["personal", "extra"]) {
    await page.goto("/accounts");
    await page
      .getByRole("button", { name: "Tạo tài khoản", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Nhân sự sở hữu" }).click();
    await page
      .getByRole("option", { name: new RegExp(employee.employeeCode) })
      .click();
    await page
      .getByLabel("Tên đăng nhập", { exact: true })
      .fill(`identity-${suffix}-${run}`);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Lưu tài khoản" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByText(`identity-${suffix}-${run}`, { exact: true }),
    ).toBeVisible();
  }
  expect(await p.user.count({ where: { employeeId: employee.id } })).toBe(2);
  expect(await p.employee.count({ where: { companyId } })).toBe(count);
  await page.goto("/employees");
  const row = page.getByRole("row").filter({ hasText: employee.employeeCode });
  await expect(row).toContainText("2 tài khoản");
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
  const account = await p.user.findUniqueOrThrow({
    where: { username: `identity-personal-${run}` },
  });
  expect(html).not.toContain(account.password);
  await page
    .getByRole("row")
    .filter({ hasText: `identity-extra-${run}` })
    .getByRole("button", { name: "Sửa tài khoản" })
    .click();
  await page.getByLabel("Cho phép đăng nhập").uncheck();
  await page.getByRole("button", { name: "Lưu tài khoản" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await p.employee.count({ where: { companyId } })).toBe(count);
});
test("login uses account permissions; blocked or revoked sessions are rejected", async ({
  page,
  context,
}) => {
  const user = await p.user.create({
    data: {
      companyId,
      employeeId: personId,
      username: `identity-plain-${run}`,
      displayName: "Cá nhân",
      password: await bcrypt.hash(password, 10),
    },
  });
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(user.username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/accounts");
  await expect(
    page.getByText("Không có quyền quản lý tài khoản."),
  ).toBeVisible();
  await p.user.update({ where: { id: user.id }, data: { isActive: false } });
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);
  await p.user.update({
    where: { id: user.id },
    data: { isActive: true, sessionVersion: { increment: 1 } },
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
    page.getByText("Phải giữ ít nhất một tài khoản quản trị hoạt động."),
  ).toBeVisible();
  expect(await p.userRole.count({ where: { userId: adminId, roleId } })).toBe(
    1,
  );
});
test("dashboard and 3D count people, including people with no account", async ({
  page,
  context,
}) => {
  const added = await p.employee.create({
    data: {
      companyId,
      employeeCode: "3D-NO-ACCOUNT",
      fullName: "Nhân sự không tài khoản 3D",
      employmentStatus: "ACTIVE",
    },
  });
  await p.user.create({
    data: {
      companyId,
      employeeId: personId,
      username: `identity-3d-${run}`,
      displayName: "Tài khoản phụ đã khóa",
      password: "disabled",
      isActive: false,
    },
  });
  const count = await p.employee.count({
    where: { companyId, employmentStatus: "ACTIVE" },
  });
  await signAccount(context, admin);
  await page.goto("/");
  await expect(
    page.getByText(`${count} đang làm việc theo hồ sơ`, { exact: true }),
  ).toBeVisible();
  await page.goto("/office-3d");
  await expect(page.getByRole("heading", { name: /Mô Hình 3D/ })).toBeVisible();
  await expect(page.getByText(`${count} CBNV`, { exact: true })).toBeVisible();
  expect(await p.user.count({ where: { employeeId: added.id } })).toBe(0);
});
test("HR manager can edit people but cannot administer accounts", async ({
  page,
  context,
}) => {
  const permission = await p.permission.findFirstOrThrow({
    where: { module: "HR", action: "MANAGE" },
  });
  const role = await p.role.create({
    data: {
      companyId,
      code: "TEST_HR",
      name: "HR",
      permissions: { create: { permissionId: permission.id } },
    },
  });
  const user = await p.user.create({
    data: {
      companyId,
      username: `identity-hr-${run}`,
      displayName: "HR",
      password: "disabled",
      roles: { create: { roleId: role.id } },
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
