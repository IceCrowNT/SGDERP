import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
const run = randomUUID().slice(0, 8);
let company: number,
  foreignCompany: number,
  adminRole: number,
  foreignRole: number,
  staffRole: number;
type Identity = {
  id: number;
  company_id: number;
  phien_ban_dang_nhap: number;
};
let admin: Identity,
  viewer: Identity,
  hr: Identity,
  accountAdmin: Identity,
  staff: Identity;
const isAction = (r: Request) =>
  r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, req: Request, payload: unknown) {
  return (
    await page.request.post(new URL(req.url()).pathname, {
      headers: {
        "Next-Action": req.headers()["next-action"],
        "Content-Type": req.headers()["content-type"],
      },
      data: JSON.stringify([payload]),
    })
  ).text();
}
async function makeRole(
  code: string,
  perms: [string, string][],
  system = false,
) {
  const permissions = await db.quyen.findMany({
    where: {
      OR: perms.map(([phan_he, hanh_dong]) => ({ phan_he, hanh_dong })),
    },
  });
  return (
    await db.vai_tro.create({
      data: {
        company_id: company,
        ma_vai_tro: code,
        ten_vai_tro: code,
        la_vai_tro_he_thong: system,
        danh_sach_quyen: {
          create: permissions.map((p) => ({ permission_id: p.id })),
        },
      },
    })
  ).id;
}
async function makeAccount(code: string, roleId: number) {
  return db.tai_khoan.create({
    data: {
      company_id: company,
      ten_dang_nhap: `rbac-${code}-${run}`,
      ten_hien_thi: code,
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: {
        create: { role_id: roleId, la_vai_tro_chinh: true },
      },
    },
  });
}
async function createViaUI(page: Page, code: string) {
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  await page.getByLabel("Mã vai trò", { exact: true }).fill(code);
  await page.getByLabel("Tên vai trò", { exact: true }).fill(code);
  await page
    .getByRole("combobox", { name: "Nhân sự và phòng ban", exact: true })
    .click();
  await page.getByRole("option", { name: "Xem", exact: true }).click();
  const sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  const req = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return req;
}
const perms = (HR: "NONE" | "VIEW" | "MANAGE" = "VIEW") => ({
  HR,
  ACCOUNTS: "NONE",
  ROLES: "NONE",
  AUDIT: "NONE",
});
async function roleInput(id: number, permissions = perms()) {
  const r = await db.vai_tro.findUniqueOrThrow({ where: { id: id } });
  return {
    id,
    version: r.updated_at.toISOString(),
    code: r.ma_vai_tro,
    name: r.ten_vai_tro,
    description: r.mo_ta ?? "",
    permissions,
  };
}
test.beforeAll(async () => {
  company = (await db.cong_ty.create({ data: { ten_cong_ty: `RBAC ${run}` } }))
    .id;
  foreignCompany = (
    await db.cong_ty.create({ data: { ten_cong_ty: `Foreign RBAC ${run}` } })
  ).id;
  foreignRole = (
    await db.vai_tro.create({
      data: {
        company_id: foreignCompany,
        ma_vai_tro: "FOREIGN",
        ten_vai_tro: "Foreign",
      },
    })
  ).id;
  adminRole = await makeRole(
    "CUSTOM_OWNER",
    [
      ["ROLES", "MANAGE"],
      ["ACCOUNTS", "MANAGE"],
      ["HR", "MANAGE"],
      ["AUDIT", "VIEW"],
    ],
    true,
  );
  admin = await makeAccount("owner", adminRole);
  viewer = await makeAccount(
    "viewer",
    await makeRole("READ_ROLES", [["ROLES", "VIEW"]]),
  );
  hr = await makeAccount("hr", await makeRole("HR_ONLY", [["HR", "MANAGE"]]));
  accountAdmin = await makeAccount(
    "accounts",
    await makeRole("ACCOUNTS_ONLY", [
      ["ACCOUNTS", "MANAGE"],
      ["HR", "VIEW"],
    ]),
  );
  staffRole = await makeRole("STAFF_TEST", [["HR", "VIEW"]]);
  staff = await makeAccount("staff", staffRole);
});
test.afterAll(async () => {
  for (const id of [company, foreignCompany].filter(Boolean)) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: id } });
    await db.tai_khoan.deleteMany({ where: { company_id: id } });
    await db.vai_tro.deleteMany({ where: { company_id: id } });
    await db.cong_ty.delete({ where: { id: id } });
  }
  await db.$disconnect();
});
test("required fields, role creation, desktop/mobile and read-only UI", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(
    page.getByText("Nhập mã vai trò", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nhập tên vai trò", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Mã vai trò", { exact: true }).fill("TEST_FORM");
  await page
    .getByLabel("Tên vai trò", { exact: true })
    .fill("Kiểm thử vai trò");
  await page.screenshot({ path: "outputs/role-management/form-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/role-management/form-mobile.png" });
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await signAccount(context, viewer);
  await page.goto("/roles");
  await expect(
    page.getByRole("button", { name: "Thêm vai trò", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Xem vai trò Kiểm thử vai trò", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu vai trò", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Nhân sự và phòng ban", exact: true }),
  ).toBeDisabled();
});
test("server guards, strict payloads, tenants and no implicit ADMIN privileges", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  const req = await createViaUI(page, "GUARDS");
  const base = JSON.parse(req.postData()!)[0];
  expect(
    await replay(page, req, { ...base, code: "EMPTY", name: "  " }),
  ).toContain('"fieldErrors"');
  expect(
    await replay(page, req, {
      ...base,
      code: "TENANT",
      companyId: foreignCompany,
    }),
  ).toContain('"success":false');
  expect(
    await replay(page, req, { ...(await roleInput(foreignRole)) }),
  ).toContain("Không tìm thấy vai trò");
  expect(
    await replay(page, req, {
      ...base,
      code: "SCOPE",
      permissions: { ...perms(), scope: "DEPARTMENT" },
    }),
  ).toContain('"success":false');
  const before = await db.vai_tro.count({
    where: { company_id: company },
  });
  for (const identity of [viewer, hr, accountAdmin]) {
    await signAccount(context, identity);
    expect(await replay(page, req, { ...base, code: "FORGED" })).toContain(
      "Không có quyền quản lý vai trò",
    );
  }
  expect(
    await db.vai_tro.count({ where: { company_id: company } }),
  ).toBe(before);
  await page.goto("/roles");
  await expect(
    page.getByText("Không có quyền xem vai trò.", { exact: true }),
  ).toBeVisible();
  const fakeAdmin = await makeAccount("fakeadmin", await makeRole("ADMIN", []));
  await signAccount(context, fakeAdmin);
  await page.goto("/accounts");
  await expect(
    page.getByText("Không có quyền quản lý tài khoản.", { exact: true }),
  ).toBeVisible();
  expect(await replay(page, req, { ...base, code: "ADMIN_FORGED" })).toContain(
    "Không có quyền quản lý vai trò",
  );
  await expect(
    db.tai_khoan_vai_tro.create({
      data: {
        account_id: staff.id,
        role_id: foreignRole,
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.tai_khoan_vai_tro.create({
      data: {
        account_id: staff.id,
        role_id: adminRole,
        la_vai_tro_chinh: true,
      },
    }),
  ).rejects.toThrow();
});
test("permission union, immediate revocation, stale edit and legacy permissions preserved", async ({
  page,
  context,
  browser,
}) => {
  await signAccount(context, admin);
  const req = await createViaUI(page, "REVOKE");
  const role = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "REVOKE" },
  });
  const legacy = await db.quyen.findFirstOrThrow({
    where: { phan_he: "TASK", hanh_dong: "APPROVE" },
  });
  await db.vai_tro_quyen.create({
    data: {
      role_id: role.id,
      permission_id: legacy.id,
    },
  });
  const user = await makeAccount("live", role.id);
  const otherContext = await browser.newContext();
  try {
    await signAccount(otherContext, user);
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/employees");
    await expect(
      otherPage.getByRole("button", { name: "Thêm nhân sự", exact: true }),
    ).toHaveCount(0);
    const input = await roleInput(role.id, perms("MANAGE"));
    expect(await replay(page, req, input)).toContain('"success":true');
    expect(await replay(page, req, input)).toContain("đã được thay đổi");
    await otherPage.reload();
    await expect(
      otherPage.getByRole("button", { name: "Thêm nhân sự", exact: true }),
    ).toBeVisible();
    await db.tai_khoan_vai_tro.create({
      data: {
        account_id: user.id,
        role_id: staffRole,
      },
    });
    expect(
      await replay(page, req, await roleInput(role.id, perms("NONE"))),
    ).toContain('"success":true');
    await otherPage.reload();
    await expect(
      otherPage.getByRole("heading", { name: "Hồ sơ nhân sự", exact: true }),
    ).toBeVisible();
    await expect(
      otherPage.getByRole("button", { name: "Thêm nhân sự", exact: true }),
    ).toHaveCount(0);
    await db.tai_khoan_vai_tro.delete({
      where: {
        account_id_role_id: {
          account_id: user.id,
          role_id: staffRole,
        },
      },
    });
    await otherPage.reload();
    await expect(
      otherPage.getByRole("heading", { name: "Hồ sơ nhân sự", exact: true }),
    ).toHaveCount(0);
    expect(
      await db.vai_tro_quyen.count({
        where: {
          role_id: role.id,
          permission_id: legacy.id,
        },
      }),
    ).toBe(1);
  } finally {
    await otherContext.close();
  }
});
test("last administrator, concurrent writes and rollback preserve access", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  const req = await createViaUI(page, "CONCURRENT");
  const input = await roleInput(adminRole, perms("NONE"));
  const auditBefore = await db.nhat_ky_hoat_dong.count({
    where: { company_id: company },
  });
  const failed = await Promise.all([
    replay(page, req, input),
    replay(page, req, input),
  ]);
  for (const r of failed) expect(r).toContain("ít nhất một tài khoản quản trị");
  expect((await roleInput(adminRole)).version).toBe(input.version);
  expect(
    await db.nhat_ky_hoat_dong.count({ where: { company_id: company } }),
  ).toBe(auditBefore);
  const role = await db.vai_tro.findFirstOrThrow({
    where: { company_id: company, ma_vai_tro: "CONCURRENT" },
  });
  const same = await roleInput(role.id, perms("MANAGE"));
  const results = await Promise.all([
    replay(page, req, same),
    replay(page, req, same),
  ]);
  expect(results.filter((r) => r.includes('"success":true'))).toHaveLength(1);
  expect(results.filter((r) => r.includes("đã được thay đổi"))).toHaveLength(1);
});
test("role membership UI, effective preview, assignment guards and last-admin protection", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  await page.goto("/roles");
  await page.getByRole("tab", { name: "Quyền của tài khoản" }).click();
  await page
    .getByRole("button", { name: `Vai trò của rbac-staff-${run}`, exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "ACCOUNTS_ONLY ACCOUNTS_ONLY", exact: true })
    .check();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Tài khoản đăng nhập: Quản lý", { exact: true }),
  ).toBeVisible();
  const sent = page.waitForRequest(isAction);
  await page
    .getByRole("button", { name: "Lưu phân quyền", exact: true })
    .click();
  const req = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const a = await db.tai_khoan.findUniqueOrThrow({
    where: { id: staff.id },
  });
  const input = {
    accountId: a.id,
    version: a.updated_at.toISOString(),
    roleIds: [foreignRole],
  };
  expect(await replay(page, req, input)).toContain("Vai trò không hợp lệ");
  expect(await replay(page, req, { ...input, roleIds: [] })).toContain(
    '"success":true',
  );
  const owner = await db.tai_khoan.findUniqueOrThrow({
    where: { id: admin.id },
  });
  expect(
    await replay(page, req, {
      accountId: owner.id,
      version: owner.updated_at.toISOString(),
      roleIds: [],
    }),
  ).toContain("ít nhất một tài khoản quản trị");
  await signAccount(context, hr);
  expect(await replay(page, req, input)).toContain(
    "Không có quyền quản lý vai trò",
  );
});
test("delete unassigned roles, protect system/assigned roles and deny forged deletes", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  await createViaUI(page, "DELETE_ME");
  await page
    .getByRole("button", { name: "Xóa vai trò DELETE_ME", exact: true })
    .click();
  const sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  const req = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await db.vai_tro.count({
      where: { company_id: company, ma_vai_tro: "DELETE_ME" },
    }),
  ).toBe(0);
  const owner = await roleInput(adminRole);
  expect(
    await replay(page, req, { id: adminRole, version: owner.version }),
  ).toContain("vai trò hệ thống");
  const used = await roleInput(
    (
      await db.tai_khoan_vai_tro.findFirstOrThrow({
        where: { account_id: hr.id },
      })
    ).role_id,
  );
  expect(
    await replay(page, req, { id: used.id, version: used.version }),
  ).toContain("Gỡ vai trò khỏi");
  expect(
    await replay(page, req, { id: foreignRole, version: "irrelevant" }),
  ).toContain("Không tìm thấy vai trò");
  await signAccount(context, viewer);
  expect(
    await replay(page, req, { id: adminRole, version: owner.version }),
  ).toContain("Không có quyền quản lý vai trò");
});
test("account managers cannot grant higher rights or reset privileged accounts; audit is tenant-filtered", async ({
  page,
  context,
}) => {
  await signAccount(context, accountAdmin);
  const simple = await makeAccount("simple", staffRole);
  await page.goto("/accounts");
  const row = page.getByRole("row").filter({ hasText: `rbac-simple-${run}` });
  await row.getByRole("button", { name: "Sửa tài khoản", exact: true }).click();
  const sent = page.waitForRequest(isAction);
  await page
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  const req = await sent;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const input = JSON.parse(req.postData()!)[0];
  expect(await replay(page, req, { ...input, roleIds: [adminRole] })).toContain(
    "vượt quyền",
  );
  expect(
    await replay(page, req, {
      ...input,
      id: admin.id,
      username: `rbac-owner-${run}`,
      roleIds: [],
      password: "Forged-password-123",
    }),
  ).toContain("vượt quyền");
  expect(
    (
      await db.tai_khoan.findUniqueOrThrow({
        where: { id: admin.id },
      })
    ).mat_khau_bam,
  ).toBe("disabled");
  expect(
    (
      await db.tai_khoan_vai_tro.findMany({
        where: { account_id: simple.id },
      })
    ).map((r) => r.role_id),
  ).toEqual([staffRole]);
  await page.goto("/audit-logs");
  await expect(
    page.getByText("Không có quyền xem nhật ký.", { exact: true }),
  ).toBeVisible();
  await db.nhat_ky_hoat_dong.create({
    data: {
      company_id: foreignCompany,
      ten_dang_nhap: "foreign",
      ho_ten: "Foreign secret",
      hanh_dong: "CREATE",
      phan_he: "ROLE",
      mo_ta: `FOREIGN_SECRET_${run}`,
    },
  });
  await signAccount(context, admin);
  await page.goto("/audit-logs");
  await expect(
    page.getByRole("heading", { name: "Nhật ký hoạt động hệ thống" }),
  ).toBeVisible();
  await expect(page.getByText(`FOREIGN_SECRET_${run}`)).toHaveCount(0);
});

test("audit write failure rolls back the role and its grants", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  const req = await createViaUI(page, "AUDIT_BASE");
  const trigger = `rbac_test_audit_${run}`;
  // Fault injection is limited to this isolated test company; real tenant writes are unaffected.
  await db.$executeRawUnsafe(
    `CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${company} AND NEW.phan_he = 'ROLE' THEN RAISE EXCEPTION 'Test audit unavailable'; END IF; RETURN NEW; END $$`,
  );
  try {
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${trigger} BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
    );
    const before = await db.vai_tro_quyen.count({
      where: { vai_tro: { company_id: company } },
    });
    const result = await replay(page, req, {
      code: "AUDIT_ROLLBACK",
      name: "Must roll back",
      description: "",
      permissions: perms("MANAGE"),
    });
    expect(result).toContain('"success":false');
    expect(
      await db.vai_tro.count({
        where: { company_id: company, ma_vai_tro: "AUDIT_ROLLBACK" },
      }),
    ).toBe(0);
    expect(
      await db.vai_tro_quyen.count({
        where: { vai_tro: { company_id: company } },
      }),
    ).toBe(before);
  } finally {
    await db.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS ${trigger} ON nhat_ky_hoat_dong`,
    );
    await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
  }
});
