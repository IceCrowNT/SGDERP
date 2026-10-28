/** One-off, reviewed HR snapshot. Preview by default; not a periodic synchronizer. */
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HR_DATE,
  HR_FILE,
  HR_SHA256,
  readHrRows,
  matchEmployee,
} from "./hr-final-data";

const db = new PrismaClient();
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const json = (v: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v));
const args = process.argv.slice(2);
if (args.some((a) => a !== "--apply" && !/^--company-id=\d+$/.test(a)))
  throw Error("Chỉ dùng --company-id=N và tùy chọn --apply.");
const companyId = Number(
  args.find((a) => a.startsWith("--company-id="))?.split("=")[1],
);
if (!Number.isSafeInteger(companyId) || companyId < 1)
  throw Error("Cần chỉ rõ --company-id=N.");
const apply = args.includes("--apply");
const marker = `HR_FINAL_${HR_SHA256}`;
async function state(tx: Prisma.TransactionClient) {
  return {
    employees: await tx.employee.findMany({
      where: { companyId },
      orderBy: { id: "asc" },
    }),
    departments: await tx.department.findMany({
      where: { companyId },
      orderBy: { id: "asc" },
    }),
    // Include archived scalar columns so preservation verification covers all account fields.
    accounts:
      await tx.$queryRaw`SELECT * FROM "nguoi_dung" WHERE "dinh_danh_cong_ty" = ${companyId} ORDER BY "dinh_danh"`,
    roles: await tx.role.findMany({ orderBy: { id: "asc" } }),
    userRoles: await tx.userRole.findMany({
      orderBy: [{ userId: "asc" }, { roleId: "asc" }],
    }),
    rolePermissions: await tx.rolePermission.findMany({
      orderBy: [{ roleId: "asc" }, { permissionId: "asc" }],
    }),
  };
}
async function main() {
  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
  });
  if (company.name !== "CÔNG TY CỔ PHẦN TẬP ĐOÀN ĐẦU TƯ SAO ĐỎ")
    throw Error("Sai công ty đích.");
  const bytes = readFileSync(
    join(process.cwd(), "docs/HR_danhsachnhanvien", HR_FILE),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== HR_SHA256)
    throw Error("File khác bản đã đối chiếu; cần rà soát lại.");
  const rows = readHrRows(bytes);
  if (
    await db.auditLog.findFirst({
      where: { companyId, module: "HR", action: "IMPORT", targetId: marker },
    })
  ) {
    console.log(
      "Bản HR này đã được nhập. Không ghi lại để tránh đè thay đổi phát sinh sau đó.",
    );
    return;
  }
  const before = await db.$transaction((tx) => state(tx), {
    isolationLevel: "RepeatableRead",
  });
  const depIds = new Map(before.departments.map((d) => [d.code, d.id]));
  const usedIds = new Set<number>();
  let nextCode = Math.max(
    0,
    ...before.employees.map((e) =>
      /^SDG-\d+$/.test(e.employeeCode) ? Number(e.employeeCode.slice(4)) : 0,
    ),
  );
  const changes = rows.map((row) => {
    const previous = matchEmployee(row, before.employees);
    if (previous && usedIds.has(previous.id))
      throw Error("Hai dòng nguồn cùng khớp một hồ sơ.");
    if (previous) usedIds.add(previous.id);
    const departmentId = depIds.get(row.departmentCode);
    if (!departmentId) throw Error(`Thiếu phòng ban ${row.departmentCode}.`);
    return {
      row: row.row,
      previous,
      data: {
        companyId,
        employeeCode:
          previous?.employeeCode ??
          `SDG-${String(++nextCode).padStart(3, "0")}`,
        fullName: row.fullName,
        position: row.position,
        departmentId,
        dateOfBirth: row.dateOfBirth,
        hrSourceFile: HR_FILE,
        hrSnapshotAt: HR_DATE,
        hrNotes: row.hrNotes,
        employmentStatus: "ACTIVE" as const,
      },
    };
  });
  const absent = before.employees.filter((e) => !usedIds.has(e.id));
  const summary = {
    source: HR_FILE,
    sha256: HR_SHA256,
    companyId,
    sourceRows: rows.length,
    update: usedIds.size,
    create: changes.filter((c) => !c.previous).length,
    absent: absent.map((e) => ({
      code: e.employeeCode,
      name: e.fullName,
      previous: e.employmentStatus,
      next: e.employmentStatus === "ACTIVE" ? "UNKNOWN" : e.employmentStatus,
    })),
    newEmployees: changes
      .filter((c) => !c.previous)
      .map((c) => ({ code: c.data.employeeCode, name: c.data.fullName })),
    departments: Object.fromEntries(
      [...new Set(rows.map((r) => r.departmentCode))].map((code) => [
        code,
        rows.filter((r) => r.departmentCode === code).length,
      ]),
    ),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) {
    console.log("PREVIEW: chưa ghi DB. Thêm --apply sau khi đối chiếu.");
    return;
  }
  const backupDir = mkdtempSync(join(tmpdir(), "sdg-hr-final-"));
  chmodSync(backupDir, 0o700);
  writeFileSync(join(backupDir, "before.json"), JSON.stringify(before), {
    mode: 0o600,
  });
  writeFileSync(
    join(backupDir, "plan.json"),
    JSON.stringify({ summary, changes }),
    { mode: 0o600 },
  );
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`LOCK TABLE "nhan_su", "nguoi_dung", "phong_ban" IN SHARE ROW EXCLUSIVE MODE`;
      if (hash(await state(tx)) !== hash(before))
        throw Error("DB đã thay đổi sau preview; dừng để đối chiếu lại.");
      const importedIds: number[] = [];
      for (const c of changes) {
        const person = c.previous
          ? await tx.employee.update({
              where: { id: c.previous.id },
              data: c.data,
            })
          : await tx.employee.create({ data: c.data });
        importedIds.push(person.id);
        await tx.auditLog.create({
          data: {
            companyId,
            username: "hr-file-import",
            fullName: "Nhập file HR đã chốt",
            module: "HR",
            action: c.previous ? "UPDATE" : "CREATE",
            targetId: String(person.id),
            targetName: person.fullName,
            description: `Nguồn HR ${HR_FILE}, dòng ${c.row}, SHA256 ${HR_SHA256}. Giữ mapping 1Office và tài khoản.`,
            oldData: c.previous ? json(c.previous) : undefined,
            newData: json(person),
          },
        });
      }
      for (const old of absent) {
        if (old.employmentStatus !== "ACTIVE") continue;
        const updated = await tx.employee.update({
          where: { id: old.id },
          data: { employmentStatus: "UNKNOWN" },
        });
        await tx.auditLog.create({
          data: {
            companyId,
            username: "hr-file-import",
            fullName: "Nhập file HR đã chốt",
            module: "HR",
            action: "STATUS_CHANGE",
            targetId: String(old.id),
            targetName: old.fullName,
            description: `Không có trong danh sách HR chốt ${HR_FILE}; cần xác nhận, không suy nghỉ việc, không khóa tài khoản.`,
            oldData: json(old),
            newData: json(updated),
          },
        });
      }
      const after = await state(tx);
      const { employees: oldPeople, ...oldPreserved } = before;
      const { employees: newPeople, ...newPreserved } = after;
      if (hash(oldPreserved) !== hash(newPreserved))
        throw Error("Tài khoản/quyền/phòng ban thay đổi ngoài phạm vi.");
      for (const old of oldPeople) {
        const current = newPeople.find((e) => e.id === old.id)!;
        for (const key of [
          "employeeCode",
          "externalSystem",
          "externalId",
          "externalSnapshotAt",
          "phone",
          "email",
          "joinDate",
          "avatarUrl",
          "address",
          "createdAt",
        ] as const) {
          if (hash(old[key]) !== hash(current[key]))
            throw Error(`Trường bảo toàn ${key} của ${old.id} thay đổi.`);
        }
      }
      for (const c of changes) {
        const current = newPeople.find(
          (e) => e.employeeCode === c.data.employeeCode,
        )!;
        for (const key of Object.keys(c.data) as (keyof typeof c.data)[])
          if (hash(current[key]) !== hash(c.data[key]))
            throw Error(`Đối chiếu dòng ${c.row} không khớp ${key}.`);
      }
      if (
        newPeople.filter((e) => e.employmentStatus === "ACTIVE").length !== 72
      )
        throw Error("Số người ACTIVE sau nhập không bằng 72.");
      const verification = {
        ...summary,
        importedIds,
        totalProfiles: newPeople.length,
        active: 72,
        unknown: newPeople.filter((e) => e.employmentStatus === "UNKNOWN")
          .length,
        left: newPeople.filter((e) => e.employmentStatus === "LEFT").length,
        accountsRolesDepartmentsUnchanged: true,
        existingIdsAndSourceMappingsUnchanged: true,
      };
      await tx.auditLog.create({
        data: {
          companyId,
          username: "hr-file-import",
          fullName: "Nhập file HR đã chốt",
          module: "HR",
          action: "IMPORT",
          targetId: marker,
          targetName: HR_FILE,
          description:
            "Hoàn tất nhập 72 dòng đã đối chiếu; không đồng bộ trực tiếp 1Office.",
          newData: json(verification),
        },
      });
      return verification;
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
  writeFileSync(
    join(backupDir, "verification.json"),
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ applied: true, backupDir, ...result }, null, 2));
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Nhập HR thất bại.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
