import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
import { bootstrapHrFinal } from "../../prisma/bootstrap-hr-final";

const db = new PrismaClient();
const run = randomUUID().slice(0, 8);
const companies: number[] = [];
let companyId: number,
  otherCompanyId: number,
  departmentId: number,
  otherDepartmentId: number;
let personId: number,
  manager: { dinh_danh: number; dinh_danh_cong_ty: number; phien_ban_dang_nhap: number };
let roleId: number;

test.beforeAll(async () => {
  for (const label of ["main", "other"]) {
    companies.push(
      (
        await db.cong_ty.create({
          data: { ten_cong_ty: `HR independent ${label} ${run}` },
        })
      ).dinh_danh,
    );
  }
  [companyId, otherCompanyId] = companies;
  departmentId = (
    await db.phong_ban.create({
      data: { dinh_danh_cong_ty: companyId, ma_phong_ban: "HR", ten_phong_ban: "Phòng nhân sự thử nghiệm" },
    })
  ).dinh_danh;
  otherDepartmentId = (
    await db.phong_ban.create({
      data: {
        dinh_danh_cong_ty: otherCompanyId,
        ma_phong_ban: "OTHER",
        ten_phong_ban: "Phòng công ty khác",
      },
    })
  ).dinh_danh;
  const permission = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "MANAGE" },
  });
  roleId = (
    await db.vai_tro.create({
      data: {
        dinh_danh_cong_ty: companyId,
        ma_vai_tro: "HR_TEST",
        ten_vai_tro: "HR quản lý",
        danh_sach_quyen: { create: { dinh_danh_quyen: permission.dinh_danh } },
      },
    })
  ).dinh_danh;
  manager = await db.tai_khoan.create({
    data: {
      dinh_danh_cong_ty: companyId,
      ten_dang_nhap: `hr-independent-${run}`,
      ten_hien_thi: "HR kiểm thử",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { dinh_danh_vai_tro: roleId } },
    },
  });
  personId = (
    await db.nhan_su.create({
      data: {
        dinh_danh_cong_ty: companyId,
        dinh_danh_phong_ban: departmentId,
        ho_ten: "Người nhập nguồn thử nghiệm",
        chuc_vu: "Chức danh gốc",
        tinh_trang_lam_viec: "ACTIVE",
        tep_nguon_nhan_su_hr: "fixture-final.xlsx",
        ngay_chot_nhan_su_hr: new Date("2026-10-26T00:00:00Z"),
        ghi_chu_nhan_su_hr: "Ghi chú nguồn",
        ghi_chu: "Ghi chú nguồn",
        he_thong_nguon: "ONE_OFFICE",
        dinh_danh_nguon: `fixture-${run}`,
      },
    })
  ).dinh_danh;
});
test.afterAll(async () => {
  for (const companyId of companies) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.tai_khoan.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.nhan_su.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.vai_tro.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.phong_ban.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.cong_ty.delete({ where: { dinh_danh: companyId } });
  }
  await db.$disconnect();
});

test("DB allocates unique codes concurrently, protects updates and never reuses a deleted code", async () => {
  const people = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.nhan_su.create({
        data: {
          dinh_danh_cong_ty: companyId,
          dinh_danh_phong_ban: departmentId,
          ho_ten: `Concurrent ${i}`,
          tinh_trang_lam_viec: "ACTIVE",
        },
      }),
    ),
  );
  expect(new Set(people.map((e) => e.ma_nhan_su)).size).toBe(12);
  for (const e of people) expect(e.ma_nhan_su).toMatch(/^SDG-\d{3,}$/);
  await expect(
    db.nhan_su.update({
      where: { dinh_danh: people[0].dinh_danh },
      data: { ma_nhan_su: "ILLEGAL" },
    }),
  ).rejects.toThrow();
  const old = people[0];
  await db.nhan_su.delete({ where: { dinh_danh: old.dinh_danh } });
  const next = await db.nhan_su.create({
    data: { dinh_danh_cong_ty: companyId, dinh_danh_phong_ban: departmentId, ho_ten: "After deletion" },
  });
  expect(Number(next.ma_nhan_su.slice(4))).toBeGreaterThan(
    Math.max(...people.map((e) => Number(e.ma_nhan_su.slice(4)))),
  );
  const columns = await db.$queryRaw<
    { column_name: string }[]
  >`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tai_khoan'`;
  expect(columns.map((c) => c.column_name)).not.toEqual(
    expect.arrayContaining(["ma_nhan_su"]),
  );
  expect(columns.map((c) => c.column_name)).toContain("ten_hien_thi");
});

test("HR can edit source-bound person and notes; action rejects code tampering, cross-company and revoked permission", async ({
  page,
  context,
}) => {
  await signAccount(context, manager);
  await page.goto("/employees");
  await page.getByLabel("Tìm nhân sự").fill("Người nhập nguồn thử nghiệm");
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
  const before = await db.nhan_su.findUniqueOrThrow({
    where: { dinh_danh: personId },
  });
  await expect(page.getByRole("dialog")).toContainText(before.ma_nhan_su);
  await expect(page.getByLabel("Mã nhân sự", { exact: true })).toHaveCount(0);
  await page.getByLabel("Họ và tên", { exact: true }).fill("Người đã cập nhật");
  await page.getByLabel("Chức vụ", { exact: true }).fill("Chức danh tự do mới");
  await page
    .getByLabel("Ghi chú", { exact: true })
    .fill("Nội dung nội bộ đã xác nhận");
  await expect(
    page.getByRole("combobox", { name: "Phòng ban", exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "outputs/hr-independent-mobile.png" });
  const requestPromise = page.waitForRequest(
    (r) => r.method() === "POST" && Boolean(r.headers()["next-action"]),
  );
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  const request = await requestPromise;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const after = await db.nhan_su.findUniqueOrThrow({
    where: { dinh_danh: personId },
  });
  expect(after).toMatchObject({
    ho_ten: "Người đã cập nhật",
    chuc_vu: "Chức danh tự do mới",
    ghi_chu: "Nội dung nội bộ đã xác nhận",
    ghi_chu_nhan_su_hr: "Ghi chú nguồn",
    ma_nhan_su: before.ma_nhan_su,
  });
  expect(
    await db.nhat_ky_hoat_dong.count({
      where: {
        dinh_danh_cong_ty: companyId,
        phan_he: "HR",
        dinh_danh_doi_tuong: String(personId),
        hanh_dong: "UPDATE",
      },
    }),
  ).toBe(1);
  const args = JSON.parse(request.postData()!);
  const replay = async (patch: Record<string, unknown>) => {
    const response = await page.request.post("/employees", {
      headers: {
        "Next-Action": request.headers()["next-action"],
        "Content-Type": request.headers()["content-type"],
      },
      data: JSON.stringify([{ ...args[0], ...patch }]),
    });
    return response.text();
  };
  const missingName = await replay({ fullName: "   " });
  expect(missingName).toContain("Vui lòng nhập họ và tên");
  expect(missingName).toContain("fieldErrors");
  expect(await replay({ departmentId: null })).toContain("Chọn phòng ban");
  expect(await replay({ employmentStatus: undefined })).toContain("Vui lòng chọn tình trạng làm việc");
  expect(await replay({ employeeCode: "FORGED" })).toContain(
    "không được phép sửa",
  );
  expect(await replay({ departmentId: otherDepartmentId })).toContain(
    "Phòng ban không hợp lệ",
  );
  const outsider = await db.nhan_su.create({
    data: {
      dinh_danh_cong_ty: otherCompanyId,
      dinh_danh_phong_ban: otherDepartmentId,
      ho_ten: "Người công ty khác",
    },
  });
  expect(await replay({ id: outsider.dinh_danh })).toContain("Không tìm thấy nhân sự");
  await db.tai_khoan_vai_tro.delete({
    where: { dinh_danh_tai_khoan_dinh_danh_vai_tro: { dinh_danh_tai_khoan: manager.dinh_danh, dinh_danh_vai_tro: roleId } },
  });
  try {
    expect(await replay({ notes: "Không được ghi" })).toContain(
      "Không có quyền sửa nhân sự",
    );
    await page.goto("/employees");
    await expect(page.getByText("Không có quyền xem nhân sự.")).toBeVisible();
    expect(
      (await db.nhan_su.findUniqueOrThrow({ where: { dinh_danh: personId } })).ghi_chu,
    ).toBe(after.ghi_chu);
  } finally {
    await db.tai_khoan_vai_tro.create({ data: { dinh_danh_tai_khoan: manager.dinh_danh, dinh_danh_vai_tro: roleId } });
  }
});

test("bootstrap imports final once and never overwrites operational changes", async () => {
  const company = await db.cong_ty.create({
    data: { ten_cong_ty: `HR bootstrap ${run}` },
  });
  companies.push(company.dinh_danh);
  for (const code of [
    "BLD",
    "BKS",
    "KD",
    "TCKT",
    "HCNS",
    "PC",
    "KHDT",
    "PTDA",
    "QLDA_NDV1",
  ]) {
    await db.phong_ban.create({
      data: { dinh_danh_cong_ty: company.dinh_danh, ma_phong_ban: code, ten_phong_ban: code },
    });
  }
  const results = await Promise.all([
    bootstrapHrFinal(db, company.dinh_danh),
    bootstrapHrFinal(db, company.dinh_danh),
  ]);
  expect(results.map((r) => r.created).sort()).toEqual([0, 72]);
  expect(await db.tai_khoan.count({ where: { dinh_danh_cong_ty: company.dinh_danh } })).toBe(0);
  const person = await db.nhan_su.findFirstOrThrow({
    where: { dinh_danh_cong_ty: company.dinh_danh },
  });
  await db.nhan_su.update({
    where: { dinh_danh: person.dinh_danh },
    data: {
      ho_ten: "Đã đổi tên nội bộ",
      ghi_chu: "Không được ghi đè",
      chuc_vu: "Chức danh mới",
    },
  });
  expect(await bootstrapHrFinal(db, company.dinh_danh)).toEqual({
    created: 0,
    skipped: true,
  });
  expect(await db.nhan_su.count({ where: { dinh_danh_cong_ty: company.dinh_danh } })).toBe(
    72,
  );
  expect(
    (await db.nhan_su.findUniqueOrThrow({ where: { dinh_danh: person.dinh_danh } })).ghi_chu,
  ).toBe("Không được ghi đè");
});
