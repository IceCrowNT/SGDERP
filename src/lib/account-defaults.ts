import type { Prisma } from "@prisma/client";
import { usernameBase } from "@/lib/username";
export { usernameBase } from "@/lib/username";

export async function defaultRole(
  tx: Prisma.TransactionClient,
  companyId: number,
) {
  const role = await tx.vai_tro.upsert({
    where: {
      company_id_ma_vai_tro: {
        company_id: companyId,
        ma_vai_tro: "DEFAULT",
      },
    },
    update: {},
    create: {
      company_id: companyId,
      ma_vai_tro: "DEFAULT",
      ten_vai_tro: "Nhân viên cơ bản",
      la_vai_tro_he_thong: true,
      mo_ta: "Dashboard cá nhân, hồ sơ của tôi và đổi mật khẩu.",
    },
    include: { _count: { select: { danh_sach_quyen: true } } },
  });
  if (role._count.danh_sach_quyen)
    throw Error("DEFAULT có quyền không hợp lệ. Liên hệ quản trị.");
  return role.id;
}
// Global lock: username is unique across all companies. All application account creation
// paths use this lock; the DB unique constraint remains the final protection.
export async function allocateUsername(
  tx: Prisma.TransactionClient,
  name: string,
  employeeId: number,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260127, 0)`;
  const base = usernameBase(name, employeeId);
  const occupied = new Set(
    (
      await tx.tai_khoan.findMany({
        where: { ten_dang_nhap: { startsWith: base } },
        select: { ten_dang_nhap: true },
      })
    ).map((a) => a.ten_dang_nhap),
  );
  let candidate = base;
  for (let i = 1; occupied.has(candidate); i++) candidate = `${base}${i}`;
  return candidate;
}
