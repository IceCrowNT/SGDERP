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
  manager: { id: number; companyId: number; sessionVersion: number };
let roleId: number;

test.beforeAll(async () => {
  for (const label of ["main", "other"]) {
    companies.push(
      (
        await db.company.create({
          data: { name: `HR independent ${label} ${run}` },
        })
      ).id,
    );
  }
  [companyId, otherCompanyId] = companies;
  departmentId = (
    await db.department.create({
      data: { companyId, code: "HR", name: "Phòng nhân sự thử nghiệm" },
    })
  ).id;
  otherDepartmentId = (
    await db.department.create({
      data: {
        companyId: otherCompanyId,
        code: "OTHER",
        name: "Phòng công ty khác",
      },
    })
  ).id;
  const permission = await db.permission.findFirstOrThrow({
    where: { module: "HR", action: "MANAGE" },
  });
  roleId = (
    await db.role.create({
      data: {
        companyId,
        code: "HR_TEST",
        name: "HR quản lý",
        permissions: { create: { permissionId: permission.id } },
      },
    })
  ).id;
  manager = await db.user.create({
    data: {
      companyId,
      username: `hr-independent-${run}`,
      displayName: "HR kiểm thử",
      password: "disabled",
      roles: { create: { roleId } },
    },
  });
  personId = (
    await db.employee.create({
      data: {
        companyId,
        departmentId,
        fullName: "Người nhập nguồn thử nghiệm",
        position: "Chức danh gốc",
        employmentStatus: "ACTIVE",
        hrSourceFile: "fixture-final.xlsx",
        hrSnapshotAt: new Date("2026-10-26T00:00:00Z"),
        hrNotes: "Ghi chú nguồn",
        notes: "Ghi chú nguồn",
        externalSystem: "ONE_OFFICE",
        externalId: `fixture-${run}`,
      },
    })
  ).id;
});
test.afterAll(async () => {
  for (const companyId of companies) {
    await db.auditLog.deleteMany({ where: { companyId } });
    await db.user.deleteMany({ where: { companyId } });
    await db.employee.deleteMany({ where: { companyId } });
    await db.role.deleteMany({ where: { companyId } });
    await db.department.deleteMany({ where: { companyId } });
    await db.company.delete({ where: { id: companyId } });
  }
  await db.$disconnect();
});

test("DB allocates unique codes concurrently, protects updates and never reuses a deleted code", async () => {
  const people = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.employee.create({
        data: {
          companyId,
          departmentId,
          fullName: `Concurrent ${i}`,
          employmentStatus: "ACTIVE",
        },
      }),
    ),
  );
  expect(new Set(people.map((e) => e.employeeCode)).size).toBe(12);
  for (const e of people) expect(e.employeeCode).toMatch(/^SDG-\d{3,}$/);
  await expect(
    db.employee.update({
      where: { id: people[0].id },
      data: { employeeCode: "ILLEGAL" },
    }),
  ).rejects.toThrow();
  const old = people[0];
  await db.employee.delete({ where: { id: old.id } });
  const next = await db.employee.create({
    data: { companyId, departmentId, fullName: "After deletion" },
  });
  expect(Number(next.employeeCode.slice(4))).toBeGreaterThan(
    Math.max(...people.map((e) => Number(e.employeeCode.slice(4)))),
  );
  const columns = await db.$queryRaw<
    { column_name: string }[]
  >`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='nguoi_dung'`;
  expect(columns.map((c) => c.column_name)).not.toEqual(
    expect.arrayContaining(["ma_nhan_vien"]),
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
  const before = await db.employee.findUniqueOrThrow({
    where: { id: personId },
  });
  await expect(page.getByRole("dialog")).toContainText(before.employeeCode);
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
  const after = await db.employee.findUniqueOrThrow({
    where: { id: personId },
  });
  expect(after).toMatchObject({
    fullName: "Người đã cập nhật",
    position: "Chức danh tự do mới",
    notes: "Nội dung nội bộ đã xác nhận",
    hrNotes: "Ghi chú nguồn",
    employeeCode: before.employeeCode,
  });
  expect(
    await db.auditLog.count({
      where: {
        companyId,
        module: "HR",
        targetId: String(personId),
        action: "UPDATE",
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
  expect(await replay({ employeeCode: "FORGED" })).toContain(
    "không được phép sửa",
  );
  expect(await replay({ departmentId: otherDepartmentId })).toContain(
    "Phòng ban không hợp lệ",
  );
  const outsider = await db.employee.create({
    data: {
      companyId: otherCompanyId,
      departmentId: otherDepartmentId,
      fullName: "Người công ty khác",
    },
  });
  expect(await replay({ id: outsider.id })).toContain("Không tìm thấy nhân sự");
  await db.userRole.delete({
    where: { userId_roleId: { userId: manager.id, roleId } },
  });
  try {
    expect(await replay({ notes: "Không được ghi" })).toContain(
      "Không có quyền sửa nhân sự",
    );
    await page.goto("/employees");
    await expect(page.getByText("Không có quyền xem nhân sự.")).toBeVisible();
    expect(
      (await db.employee.findUniqueOrThrow({ where: { id: personId } })).notes,
    ).toBe(after.notes);
  } finally {
    await db.userRole.create({ data: { userId: manager.id, roleId } });
  }
});

test("bootstrap imports final once and never overwrites operational changes", async () => {
  const company = await db.company.create({
    data: { name: `HR bootstrap ${run}` },
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
    await db.department.create({
      data: { companyId: company.id, code, name: code },
    });
  }
  const results = await Promise.all([
    bootstrapHrFinal(db, company.id),
    bootstrapHrFinal(db, company.id),
  ]);
  expect(results.map((r) => r.created).sort()).toEqual([0, 72]);
  expect(await db.user.count({ where: { companyId: company.id } })).toBe(0);
  const person = await db.employee.findFirstOrThrow({
    where: { companyId: company.id },
  });
  await db.employee.update({
    where: { id: person.id },
    data: {
      fullName: "Đã đổi tên nội bộ",
      notes: "Không được ghi đè",
      position: "Chức danh mới",
    },
  });
  expect(await bootstrapHrFinal(db, company.id)).toEqual({
    created: 0,
    skipped: true,
  });
  expect(await db.employee.count({ where: { companyId: company.id } })).toBe(
    72,
  );
  expect(
    (await db.employee.findUniqueOrThrow({ where: { id: person.id } })).notes,
  ).toBe("Không được ghi đè");
});
