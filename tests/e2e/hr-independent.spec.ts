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
  manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
let roleId: number;

test.beforeAll(async () => {
  for (const label of ["main", "other"]) {
    companies.push(
      (
        await db.cong_ty.create({
          data: { ten_cong_ty: `HR independent ${label} ${run}` },
        })
      ).id,
    );
  }
  [companyId, otherCompanyId] = companies;
  departmentId = (
    await db.phong_ban.create({
      data: { company_id: companyId, ma_phong_ban: "HR", ten_phong_ban: "Phòng nhân sự thử nghiệm" },
    })
  ).id;
  otherDepartmentId = (
    await db.phong_ban.create({
      data: {
        company_id: otherCompanyId,
        ma_phong_ban: "OTHER",
        ten_phong_ban: "Phòng công ty khác",
      },
    })
  ).id;
  const permission = await db.quyen.findFirstOrThrow({
    where: { phan_he: "HR", hanh_dong: "MANAGE" },
  });
  roleId = (
    await db.vai_tro.create({
      data: {
        company_id: companyId,
        ma_vai_tro: "HR_TEST",
        ten_vai_tro: "HR quản lý",
        danh_sach_quyen: { create: { permission_id: permission.id } },
      },
    })
  ).id;
  manager = await db.tai_khoan.create({
    data: {
      company_id: companyId,
      ten_dang_nhap: `hr-independent-${run}`,
      ten_hien_thi: "HR kiểm thử",
      mat_khau_bam: "disabled",
      danh_sach_vai_tro: { create: { role_id: roleId } },
    },
  });
  personId = (
    await db.nhan_su.create({
      data: {
        company_id: companyId,
        department_id: departmentId,
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
  ).id;
});
test.afterAll(async () => {
  for (const companyId of companies) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: companyId } });
    await db.tai_khoan.deleteMany({ where: { company_id: companyId } });
    await db.nhan_su.deleteMany({ where: { company_id: companyId } });
    await db.vai_tro.deleteMany({ where: { company_id: companyId } });
    await db.phong_ban.deleteMany({ where: { company_id: companyId } });
    await db.cong_ty.delete({ where: { id: companyId } });
  }
  await db.$disconnect();
});

test("DB allocates unique codes concurrently, protects updates and never reuses a deleted code", async () => {
  const people = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.nhan_su.create({
        data: {
          company_id: companyId,
          department_id: departmentId,
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
      where: { id: people[0].id },
      data: { ma_nhan_su: "ILLEGAL" },
    }),
  ).rejects.toThrow();
  const old = people[0];
  await db.nhan_su.delete({ where: { id: old.id } });
  const next = await db.nhan_su.create({
    data: { company_id: companyId, department_id: departmentId, ho_ten: "After deletion" },
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
  await page.getByRole("button", { name: /^Xem hồ sơ / }).click();
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
  const before = await db.nhan_su.findUniqueOrThrow({
    where: { id: personId },
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
    where: { id: personId },
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
        company_id: companyId,
        phan_he: "HR",
        doi_tuong_id: String(personId),
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
      company_id: otherCompanyId,
      department_id: otherDepartmentId,
      ho_ten: "Người công ty khác",
    },
  });
  expect(await replay({ id: outsider.id })).toContain("Không tìm thấy nhân sự");
  await db.tai_khoan_vai_tro.delete({
    where: { account_id_role_id: { account_id: manager.id, role_id: roleId } },
  });
  try {
    expect(await replay({ notes: "Không được ghi" })).toContain(
      "Không có quyền sửa nhân sự",
    );
    await page.goto("/employees");
    await expect(page.getByText("Không có quyền xem nhân sự.")).toBeVisible();
    expect(
      (await db.nhan_su.findUniqueOrThrow({ where: { id: personId } })).ghi_chu,
    ).toBe(after.ghi_chu);
  } finally {
    await db.tai_khoan_vai_tro.create({ data: { account_id: manager.id, role_id: roleId } });
  }
});

test("bootstrap imports final once and never overwrites operational changes", async () => {
  const company = await db.cong_ty.create({
    data: { ten_cong_ty: `HR bootstrap ${run}` },
  });
  companies.push(company.id);
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
      data: { company_id: company.id, ma_phong_ban: code, ten_phong_ban: code },
    });
  }
  const results = await Promise.all([
    bootstrapHrFinal(db, company.id),
    bootstrapHrFinal(db, company.id),
  ]);
  expect(results.map((r) => r.created).sort()).toEqual([0, 72]);
  expect(await db.tai_khoan.count({ where: { company_id: company.id } })).toBe(0);
  const person = await db.nhan_su.findFirstOrThrow({
    where: { company_id: company.id },
  });
  await db.nhan_su.update({
    where: { id: person.id },
    data: {
      ho_ten: "Đã đổi tên nội bộ",
      ghi_chu: "Không được ghi đè",
      chuc_vu: "Chức danh mới",
    },
  });
  expect(await bootstrapHrFinal(db, company.id)).toEqual({
    created: 0,
    skipped: true,
  });
  expect(await db.nhan_su.count({ where: { company_id: company.id } })).toBe(
    72,
  );
  expect(
    (await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } })).ghi_chu,
  ).toBe("Không được ghi đè");
});
