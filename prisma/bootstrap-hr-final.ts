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
      const company = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM cong_ty WHERE id = ${companyId} FOR UPDATE`;
      if (!company.length) throw Error("Không tìm thấy công ty.");
      if (
        (await tx.nhan_su.count({ where: { company_id: companyId } })) ||
        (await tx.nhat_ky_hoat_dong.findFirst({
          where: { company_id: companyId, phan_he: "HR", doi_tuong_id: INDEPENDENT_HR_MARKER },
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
      const departments = await tx.phong_ban.findMany({
        where: { company_id: companyId },
      });
      for (const row of rows) {
        const department = departments.find(
          (d) => d.ma_phong_ban === row.departmentCode,
        );
        if (!department) throw Error(`Thiếu phòng ban ${row.departmentCode}.`);
        await tx.nhan_su.create({
          data: {
            company_id: companyId,
            department_id: department.id,
            ho_ten: row.fullName,
            chuc_vu: row.position,
            ngay_sinh: row.dateOfBirth,
            tinh_trang_lam_viec: "ACTIVE",
            ghi_chu: row.hrNotes,
            ghi_chu_nhan_su_hr: row.hrNotes,
            tep_nguon_nhan_su_hr: HR_FILE,
            ngay_chot_nhan_su_hr: HR_DATE,
          },
        });
      }
      await tx.nhat_ky_hoat_dong.create({
        data: {
          company_id: companyId,
          ten_dang_nhap: "system-bootstrap",
          ho_ten: "Khởi tạo dữ liệu HR",
          hanh_dong: "IMPORT",
          phan_he: "HR",
          doi_tuong_id: INDEPENDENT_HR_MARKER,
          mo_ta:
            "Khởi tạo 72 hồ sơ HR một lần; từ đây quản lý độc lập tại ERP.",
          du_lieu_moi: { count: rows.length, source: HR_FILE, sha256: HR_SHA256 },
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
