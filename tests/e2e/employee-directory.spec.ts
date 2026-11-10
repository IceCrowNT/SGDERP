import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
const run = randomUUID().slice(0, 8);
let companyId: number, rootId: number, childId: number;
let viewer: { id: number; company_id: number; phien_ban_dang_nhap: number };

test.beforeAll(async () => {
  const company = await db.cong_ty.create({
    data: { ten_cong_ty: `Directory ${run}` },
  });
  companyId = company.id;
  const root = await db.phong_ban.create({
    data: {
      company_id: companyId,
      ma_phong_ban: "ROOT",
      ten_phong_ban: "Kinh doanh thử nghiệm",
    },
  });
  rootId = root.id;
  const child = await db.phong_ban.create({
    data: {
      company_id: companyId,
      parent_id: root.id,
      ma_phong_ban: "CHILD",
      ten_phong_ban: "Chăm sóc khách hàng thử nghiệm",
    },
  });
  childId = child.id;
  const other = await db.phong_ban.create({
    data: {
      company_id: companyId,
      ma_phong_ban: "OTHER",
      ten_phong_ban: "Ban lãnh đạo thử nghiệm",
    },
  });
  await db.phong_ban.create({
    data: {
      company_id: companyId,
      ma_phong_ban: "EMPTY",
      ten_phong_ban: "Phòng chưa có người",
    },
  });
  for (let i = 1; i <= 17; i++)
    await db.nhan_su.create({
      data: {
        company_id: companyId,
        department_id: i === 17 ? childId : rootId,
        ho_ten:
          i === 17
            ? "Đặng Ánh Dương"
            : `Người thử ${String(i).padStart(2, "0")}`,
        chuc_vu: i === 1 ? "Trưởng phòng" : "Nhân viên",
        tinh_trang_lam_viec: i === 2 ? "LEFT" : i === 3 ? "UNKNOWN" : "ACTIVE",
      },
    });
  const head = await db.nhan_su.create({
    data: {
      company_id: companyId,
      department_id: other.id,
      ho_ten: "Người phụ trách kiêm nhiệm",
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  await db.phong_ban.update({
    where: { id: rootId },
    data: { nguoi_phu_trach_id: head.id },
  });
  await db.nhan_su.create({
    data: {
      company_id: companyId,
      ho_ten: "Chưa phân phòng",
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  const permission = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "VIEW" },
  });
  const role = await db.vai_tro.create({
    data: {
      company_id: companyId,
      ma_vai_tro: "VIEWER",
      ten_vai_tro: "Xem danh bạ",
      danh_sach_quyen: { create: { permission_id: permission.id } },
    },
  });
  viewer = await db.tai_khoan.create({
    data: {
      company_id: companyId,
      ten_dang_nhap: `directory-${run}`,
      ten_hien_thi: "Người xem",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { role_id: role.id } },
    },
  });
});
test.afterAll(async () => {
  if (companyId) {
    await db.phong_ban.updateMany({
      where: { company_id: companyId },
      data: { nguoi_phu_trach_id: null },
    });
    await db.tai_khoan.deleteMany({ where: { company_id: companyId } });
    await db.nhan_su.deleteMany({ where: { company_id: companyId } });
    await db.vai_tro.deleteMany({ where: { company_id: companyId } });
    await db.phong_ban.updateMany({
      where: { company_id: companyId },
      data: { parent_id: null },
    });
    await db.phong_ban.deleteMany({ where: { company_id: companyId } });
    await db.cong_ty.delete({ where: { id: companyId } });
  }
  await db.$disconnect();
});

test("directory drills into branches, counts people, keeps pagination and respects read-only access", async ({
  page,
  context,
}) => {
  await signAccount(context, viewer);
  await page.goto("/employees");
  await expect(
    page.getByText("19 hồ sơ · 17 đang làm việc theo hồ sơ"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Thêm nhân sự" })).toHaveCount(
    0,
  );
  const root = page.getByRole("button", {
    name: "Xem phòng Kinh doanh thử nghiệm",
    exact: true,
  });
  await expect(root).toContainText("17");
  await expect(root).toContainText("Gồm 1 đơn vị con");
  await expect(root).toContainText("Phụ trách: Người phụ trách kiêm nhiệm");
  await expect(page.getByRole("button", { name: /^Xem hồ sơ / })).toHaveCount(
    0,
  );
  await root.click();
  await expect(page.getByRole("status")).toContainText(
    "1–12 / 17 hồ sơ · gồm các đơn vị con",
  );
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Người thử 01", exact: true }),
  ).not.toContainText("Người phụ trách");
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương", exact: true })
    .click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText("Chăm sóc khách hàng thử nghiệm");
  await expect(detail).toContainText("Chưa có tài khoản");
  await expect(detail.getByRole("button", { name: "Sửa hồ sơ" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Đóng hồ sơ", exact: true }).click();
  await expect(page.getByText("Trang 2 / 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương", exact: true })).toBeFocused();
  await page
    .getByRole("button", {
      name: "Chăm sóc khách hàng thử nghiệm",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("1–1 / 1 hồ sơ");
  await page.getByRole("button", { name: "Phòng ban cấp trên" }).click();
  await page.getByRole("button", { name: "Bảng", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(16);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Trang 2 / 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương", exact: true })).toBeFocused();
});

test("global accent-insensitive search, status counts, unassigned and deep links remain reachable on mobile", async ({
  page,
  context,
}) => {
  await signAccount(context, viewer);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/employees?departmentId=${rootId}`);
  await expect(
    page.getByRole("heading", { name: "Kinh doanh thử nghiệm", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Tìm nhân sự", { exact: true })
    .fill("nguoi phu trach kiem nhiem");
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Người phụ trách kiêm nhiệm" }),
  ).toBeVisible();
  await page.getByLabel("Tìm nhân sự", { exact: true }).fill("dang anh duong");
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Đóng hồ sơ" }).click();
  await page
    .getByRole("button", { name: "Các phòng ban", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Tình trạng làm việc", exact: true })
    .click();
  await page.getByRole("option", { name: "Đã nghỉ việc", exact: true }).click();
  const root = page.getByRole("button", {
    name: "Xem phòng Kinh doanh thử nghiệm",
    exact: true,
  });
  await expect(root).toContainText("1người trong nhánh");
  await root.click();
  await expect(page.getByRole("button", { name: /^Xem hồ sơ / })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Người thử 02" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Các phòng ban", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem phòng Phòng chưa có người", exact: true })
    .click();
  await expect(
    page.getByText("Không tìm thấy nhân sự.", { exact: true }),
  ).toBeVisible();
  await page.goto("/employees");
  await page.getByRole("button", { name: /^Chưa gắn phòng ban/ }).click();
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Chưa phân phòng" }),
  ).toBeVisible();
  await page.goto(`/employees?departmentId=${childId}&search=dang%20anh`);
  await expect(
    page.getByRole("heading", { name: "Kết quả tìm kiếm toàn công ty" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xem hồ sơ Đặng Ánh Dương" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
