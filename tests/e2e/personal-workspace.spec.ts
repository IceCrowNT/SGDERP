import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import sharp from "sharp";
import { signAccount } from "../helpers/account-fixture";
import { usernameBase } from "../../src/lib/username";
import { removeAvatar } from "../../src/lib/profile-storage";
test.describe.configure({ mode: "serial" });
const db = new PrismaClient();
const run = randomUUID().replaceAll("-", "").slice(0, 8);
let company: number, department: number;
type Identity = {
  id: number;
  company_id: number;
  phien_ban_dang_nhap: number;
};
let admin: Identity, plain: Identity, sibling: Identity, hr: Identity;
let personId: number;
const password = `Test-${randomUUID()}`;
let issued: { username: string; password: string };
const isAction = (r: Request) =>
  r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, req: Request, args: unknown[]) {
  return (
    await page.request.post(new URL(req.url()).pathname, {
      headers: {
        "Next-Action": req.headers()["next-action"],
        "Content-Type": req.headers()["content-type"],
      },
      data: JSON.stringify(args),
    })
  ).text();
}
async function role(code: string, grants: [string, string][]) {
  const permissions = await db.quyen.findMany({
    where: {
      OR: grants.map(([phan_he, hanh_dong]) => ({ phan_he, hanh_dong })),
    },
  });
  return db.vai_tro.create({
    data: {
      company_id: company,
      ma_vai_tro: code,
      ten_vai_tro: code,
      danh_sach_quyen: {
        create: permissions.map((p) => ({ permission_id: p.id })),
      },
    },
  });
}
test.beforeAll(async () => {
  company = (
    await db.cong_ty.create({ data: { ten_cong_ty: `Personal ${run}` } })
  ).id;
  department = (
    await db.phong_ban.create({
      data: {
        company_id: company,
        ma_phong_ban: "TEST",
        ten_phong_ban: "Phòng cá nhân thử nghiệm",
      },
    })
  ).id;
  personId = (
    await db.nhan_su.create({
      data: {
        company_id: company,
        department_id: department,
        ho_ten: "Nhân viên cá nhân thử nghiệm",
        tinh_trang_lam_viec: "ACTIVE",
      },
    })
  ).id;
  const a = await role("ADMIN", [
    ["HR", "MANAGE"],
    ["ACCOUNTS", "MANAGE"],
    ["ROLES", "MANAGE"],
  ]);
  const h = await role("HR", [["HR", "MANAGE"]]);
  const hash = await bcrypt.hash(password, 10);
  admin = await db.tai_khoan.create({
    data: {
      company_id: company,
      ten_dang_nhap: `personal-admin-${run}`,
      ten_hien_thi: "Quản trị thử nghiệm",
      mat_khau_bam: hash,
      danh_sach_vai_tro: { create: { role_id: a.id } },
    },
  });
  hr = await db.tai_khoan.create({
    data: {
      company_id: company,
      ten_dang_nhap: `personal-hr-${run}`,
      ten_hien_thi: "HR thử nghiệm",
      mat_khau_bam: hash,
      danh_sach_vai_tro: { create: { role_id: h.id } },
    },
  });
  plain = await db.tai_khoan.create({
    data: {
      company_id: company,
      employee_id: personId,
      ten_dang_nhap: `personal-user-${run}`,
      ten_hien_thi: "Nhân viên",
      mat_khau_bam: hash,
    },
  });
  sibling = await db.tai_khoan.create({
    data: {
      company_id: company,
      employee_id: personId,
      ten_dang_nhap: `personal-sibling-${run}`,
      ten_hien_thi: "Tài khoản thứ hai",
      mat_khau_bam: hash,
    },
  });
});
test.afterAll(async () => {
  if (company) {
    const people = await db.nhan_su.findMany({
      where: { company_id: company },
      select: { duong_dan_anh_dai_dien: true },
    });
    for (const p of people) await removeAvatar(p.duong_dan_anh_dai_dien);
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SET LOCAL session_replication_role = replica",
      );
      await tx.lich_su_quy_trinh.deleteMany({
        where: { company_id: company },
      });
      await tx.buoc_xu_ly_quy_trinh.deleteMany({
        where: { company_id: company },
      });
      await tx.ho_so_quy_trinh.deleteMany({
        where: { company_id: company },
      });
      await tx.buoc_mau_quy_trinh.deleteMany({
        where: { company_id: company },
      });
      await tx.mau_quy_trinh.deleteMany({
        where: { company_id: company },
      });
      await tx.nhat_ky_hoat_dong.deleteMany({
        where: { company_id: company },
      });
      const roles = await tx.vai_tro.findMany({
        where: { company_id: company },
      });
      await tx.tai_khoan_vai_tro.deleteMany({
        where: { role_id: { in: roles.map((r) => r.id) } },
      });
      await tx.vai_tro_quyen.deleteMany({
        where: { role_id: { in: roles.map((r) => r.id) } },
      });
      await tx.tai_khoan.deleteMany({ where: { company_id: company } });
      await tx.nhan_su.deleteMany({ where: { company_id: company } });
      await tx.phong_ban.deleteMany({ where: { company_id: company } });
      await tx.vai_tro.deleteMany({ where: { company_id: company } });
      await tx.cong_ty.delete({ where: { id: company } });
    });
  }
  await db.$disconnect();
});
test("create employee with DEFAULT, collision-safe username and atomic account; HR-only cannot grant", async ({
  page,
  context,
  browser,
}) => {
  await signAccount(context, admin);
  await page.goto("/employees");
  await page.getByRole("button", { name: "Thêm nhân sự", exact: true }).click();
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill(`Dương Hoàng Nam${run}`);
  await page.getByRole("combobox", { name: "Phòng ban", exact: true }).click();
  await page
    .getByRole("option", { name: "Phòng cá nhân thử nghiệm", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Tạo tài khoản đăng nhập" }),
  ).toBeChecked();
  const sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  const req = await sent;
  await expect(page.getByTestId("issued-username")).toBeVisible();
  issued = {
    username: (await page.getByTestId("issued-username").textContent())!,
    password: (await page.getByTestId("issued-password").textContent())!,
  };
  const base = usernameBase(`Dương Hoàng Nam${run}`);
  expect(issued.username).toBe(base);
  const account = await db.tai_khoan.findUniqueOrThrow({
    where: { ten_dang_nhap: base },
    include: { danh_sach_vai_tro: { include: { vai_tro: true } } },
  });
  expect(account.bat_buoc_doi_mat_khau).toBe(true);
  expect(account.danh_sach_vai_tro.map((r) => r.vai_tro.ma_vai_tro)).toEqual([
    "DEFAULT",
  ]);
  const hrPermission = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "VIEW" },
  });
  await expect(
    db.vai_tro_quyen.create({
      data: {
        role_id: account.danh_sach_vai_tro[0].role_id,
        permission_id: hrPermission.id,
      },
    }),
  ).rejects.toThrow(/DEFAULT/);
  const args = {
    fullName: `Đinh Hoài Nam${run}`,
    departmentId: department,
    employmentStatus: "ACTIVE",
    createAccount: true,
  };
  const second = await browser.newContext();
  await signAccount(second, admin);
  const secondPage = await second.newPage();
  try {
    const results = await Promise.all([
      replay(page, req, [args]),
      replay(secondPage, req, [args]),
    ]);
    expect(results.every((r) => r.includes('"success":true'))).toBe(true);
  } finally {
    await second.close();
  }
  expect(
    await db.tai_khoan.count({
      where: { ten_dang_nhap: { in: [base, `${base}1`, `${base}2`] } },
    }),
  ).toBe(3);
  await signAccount(context, hr);
  expect(await replay(page, req, [args])).toContain(
    "Không có quyền quản lý tài khoản",
  );
  expect(
    await replay(page, req, [
      { ...args, createAccount: false, fullName: "Chỉ tạo người" },
    ]),
  ).toContain('"success":true');
  expect(
    await db.tai_khoan.count({
      where: {
        nhan_su: { ho_ten: "Chỉ tạo người", company_id: company },
      },
    }),
  ).toBe(0);
  const logs = JSON.stringify(
    await db.nhat_ky_hoat_dong.findMany({
      where: { company_id: company },
    }),
  );
  expect(logs).not.toContain(issued.password);
  expect(logs).not.toContain(account.mat_khau_bam);
});
test("temporary password forces profile; changing password revokes other sessions but not sibling accounts", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(issued.username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(issued.password);
  await page.getByRole("button", { name: /Đăng nhập/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByText("Bạn đang dùng mật khẩu tạm.", { exact: false }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/profile$/);
  const owner = await db.tai_khoan.findUniqueOrThrow({
    where: { ten_dang_nhap: issued.username },
  });
  const samePersonAccount = await db.tai_khoan.create({
    data: {
      company_id: company,
      employee_id: owner.employee_id,
      ten_dang_nhap: `same-person-${run}`,
      ten_hien_thi: "Tài khoản phụ",
      mat_khau_bam: await bcrypt.hash(password, 10),
    },
  });
  const old = await browser.newContext();
  await old.addCookies(await context.cookies());
  await page
    .getByLabel("Mật khẩu hiện tại", { exact: false })
    .fill(issued.password);
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("New-test-Password-456");
  await page
    .getByLabel("Nhập lại mật khẩu mới", { exact: false })
    .fill("New-test-Password-456");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(
    page.getByText("Đã đổi mật khẩu và thu hồi các phiên cũ."),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
  const oldPage = await old.newPage();
  await oldPage.goto("/profile");
  await expect(oldPage).toHaveURL(/\/login$/);
  await old.close();
  expect(
    (
      await db.tai_khoan.findUniqueOrThrow({
        where: { id: samePersonAccount.id },
      })
    ).phien_ban_dang_nhap,
  ).toBe(0);
  const untouched = await db.tai_khoan.findUniqueOrThrow({
    where: { id: samePersonAccount.id },
  });
  expect(untouched.mat_khau_bam).toBe(samePersonAccount.mat_khau_bam);
  await page.goto("/employees");
  await expect(page.getByText("Không có quyền xem nhân sự.")).toBeVisible();
});
test("personal profile excludes HR notes; rejects ID injection; avatar upload, protected read and removal", async ({
  page,
  context,
  browser,
}) => {
  await db.nhan_su.update({
    where: { id: personId },
    data: { ghi_chu_nhan_su_hr: "PRIVATE-HR-NOTE" },
  });
  await signAccount(context, plain);
  await page.goto("/profile");
  expect(await page.content()).not.toContain("PRIVATE-HR-NOTE");
  await page.getByLabel("Điện thoại", { exact: true }).fill("0901234567");
  const sent = page.waitForRequest(isAction);
  await page.getByRole("button", { name: "Lưu thông tin cá nhân" }).click();
  const req = await sent;
  await expect(page.getByText("Đã lưu thông tin cá nhân.")).toBeVisible();
  expect(
    await replay(page, req, [
      { phone: "0900000000", email: "", address: "", employeeId: 999 },
    ]),
  ).toContain('"success":false');
  expect(
    (await db.nhan_su.findUniqueOrThrow({ where: { id: personId } }))
      .so_dien_thoai,
  ).toBe("0901234567");
  const png = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#da241b" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Ảnh JPEG, PNG hoặc WebP · tối đa 2 MB")
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Thay ảnh" }).click();
  await expect(page.getByText("Đã cập nhật ảnh đại diện.")).toBeVisible();
  const url = (
    await db.nhan_su.findUniqueOrThrow({ where: { id: personId } })
  ).duong_dan_anh_dai_dien!;
  expect((await page.request.get(url)).status()).toBe(200);
  const other = await browser.newContext();
  await signAccount(
    other,
    await db.tai_khoan.findUniqueOrThrow({
      where: { ten_dang_nhap: issued.username },
    }),
  );
  expect((await other.request.get(url)).status()).toBe(404);
  await other.close();
  await page.getByLabel("Ảnh JPEG, PNG hoặc WebP · tối đa 2 MB").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg/>"),
  });
  await page.getByRole("button", { name: "Thay ảnh" }).click();
  await expect(
    page.getByText("Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ."),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "outputs/personal-workspace/profile-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await expect(page.getByText("Đã xóa ảnh đại diện.")).toBeVisible();
  expect((await page.request.get(url)).status()).toBe(404);
});
test("workflow rights are assigned centrally without user activation; revocation is immediate", async ({
  page,
  context,
}) => {
  await signAccount(context, admin);
  const linksBefore = await db.tai_khoan_vai_tro.count({
    where: { account_id: admin.id },
  });
  await page.goto("/workflows");
  await expect(page.getByText("Bạn chưa được cấp quyền sử dụng quy trình.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Thiết lập|Xác nhận/ })).toHaveCount(0);
  expect(await db.tai_khoan_vai_tro.count({
    where: { account_id: admin.id },
  })).toBe(linksBefore);
  await page.getByRole("link", { name: "Vai trò và phân quyền", exact: true }).click();
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  await page.getByLabel("Mã vai trò", { exact: true }).fill("COORDINATOR");
  await page.getByLabel("Tên vai trò", { exact: true }).fill("Điều phối thử nghiệm");
  await page.getByRole("checkbox", { name: "Quản lý mẫu và điều phối", exact: true }).check();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Quyền của tài khoản" }).click();
  await page.getByRole("button", { name: `Vai trò của personal-admin-${run}`, exact: true }).click();
  await page.getByRole("checkbox", { name: /Điều phối thử nghiệm/ }).check();
  await page.getByRole("button", { name: "Lưu phân quyền", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/workflows");
  await expect(page.getByRole("button", { name: "Tạo mẫu đầu tiên" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Thiết lập|Xác nhận/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Tạo mẫu đầu tiên" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/roles");
  await page.getByRole("tab", { name: "Quyền của tài khoản" }).click();
  await page.getByRole("button", { name: `Vai trò của personal-admin-${run}`, exact: true }).click();
  await page.getByRole("checkbox", { name: /Điều phối thử nghiệm/ }).uncheck();
  await page.getByRole("button", { name: "Lưu phân quyền", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/workflows");
  await expect(page.getByRole("button", { name: "Tạo mẫu đầu tiên" })).toHaveCount(0);
  await signAccount(context, plain);
  await page.goto("/workflows");
  await expect(page.getByText(/Liên hệ người quản lý phân quyền/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Vai trò và phân quyền", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Thiết lập|Xác nhận/ })).toHaveCount(0);
});
test("dashboard counts all own records beyond 200; sibling without workflow sees no workflow data", async ({
  page,
  context,
}) => {
  const r = await role("REQUESTER", [
    ["WORKFLOW", "VIEW"],
    ["WORKFLOW", "CREATE"],
  ]);
  await db.tai_khoan_vai_tro.create({
    data: {
      account_id: plain.id,
      role_id: r.id,
    },
  });
  const template = await db.mau_quy_trinh.create({
    data: {
      company_id: company,
      tai_khoan_tao_id: admin.id,
      ma: "PERSONAL",
      ten: "Personal test",
    },
  });
  await db.ho_so_quy_trinh.createMany({
    data: Array.from({ length: 205 }, (_, i) => ({
      company_id: company,
      mau_quy_trinh_id: template.id,
      tieu_de: `Yêu cầu cá nhân ${i}`,
      noi_dung: "test",
      nguoi_gui_id: personId,
      phong_nguoi_gui_id: department,
      tai_khoan_tao_id: plain.id,
    })),
  });
  await signAccount(context, plain);
  await page.goto("/?view=draft");
  await expect(
    page.getByRole("region", { name: "Tổng quan công việc" }).getByRole("link", { name: "Bản nháp của tôi 205" }),
  ).toBeVisible();
  await expect(
    page.getByText("10 hồ sơ / 205 hồ sơ phù hợp. Trang 1/21."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Trang sau", exact: true }).click();
  await expect(
    page.getByText("10 hồ sơ / 205 hồ sơ phù hợp. Trang 2/21."),
  ).toBeVisible();
  await expect(
    page.getByText("Yêu cầu cá nhân 204", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "outputs/personal-workspace/dashboard-desktop.png",
    fullPage: true,
  });
  await signAccount(context, sibling);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Không gian cá nhân của bạn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tổng quan công việc" }).getByRole("link", { name: "Bản nháp của tôi 205" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
