/** One-time HR baseline. Never overwrites operational ERP data on reseed. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HR_DATE, HR_FILE, HR_SHA256, readHrRows } from "./hr-final-data";

export const INDEPENDENT_HR_MARKER = "HR_INDEPENDENT_20261028";
export async function bootstrapHrFinal(db: PrismaClient, companyId: number) {
  return db.$transaction(
    async (tx) => {
      // Serialize bootstrap for this company, including concurrent seed processes.
      const company = await tx.$queryRaw<{ dinh_danh: number }[]>`
      SELECT dinh_danh FROM cong_ty WHERE dinh_danh = ${companyId} FOR UPDATE`;
      if (!company.length) throw Error("Không tìm thấy công ty.");
      if (
        (await tx.employee.count({ where: { companyId } })) ||
        (await tx.auditLog.findFirst({
          where: { companyId, module: "HR", targetId: INDEPENDENT_HR_MARKER },
        }))
      ) {
        return { created: 0, skipped: true };
      }
      const bytes = readFileSync(
        join(process.cwd(), "docs/HR_danhsachnhanvien", HR_FILE),
      );
      if (createHash("sha256").update(bytes).digest("hex") !== HR_SHA256)
        throw Error("File HR khác bản final đã xác nhận.");
      const rows = readHrRows(bytes);
      const departments = await tx.department.findMany({
        where: { companyId },
      });
      for (const row of rows) {
        const department = departments.find(
          (d) => d.code === row.departmentCode,
        );
        if (!department) throw Error(`Thiếu phòng ban ${row.departmentCode}.`);
        await tx.employee.create({
          data: {
            companyId,
            departmentId: department.id,
            fullName: row.fullName,
            position: row.position,
            dateOfBirth: row.dateOfBirth,
            employmentStatus: "ACTIVE",
            notes: row.hrNotes,
            hrNotes: row.hrNotes,
            hrSourceFile: HR_FILE,
            hrSnapshotAt: HR_DATE,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          companyId,
          username: "system-bootstrap",
          fullName: "Khởi tạo dữ liệu HR",
          action: "IMPORT",
          module: "HR",
          targetId: INDEPENDENT_HR_MARKER,
          description:
            "Khởi tạo 72 hồ sơ HR một lần; từ đây quản lý độc lập tại ERP.",
          newData: { count: rows.length, source: HR_FILE, sha256: HR_SHA256 },
        },
      });
      return { created: rows.length, skipped: false };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 30000,
    },
  );
}
