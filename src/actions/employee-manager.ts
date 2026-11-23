"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentActor } from "@/lib/rbac-server";
export async function getDirectManagerOptions(id: number) {
  const s = await getSession();
  if (
    !s ||
    !hasPermission(s, "HR", "MANAGE") ||
    !z.number().int().positive().safeParse(id).success
  )
    return {
      success: false as const,
      message: "Không có quyền sửa quản lý trực tiếp.",
    };
  const person = await db.nhan_su.findFirst({
    where: { id, company_id: s.companyId },
    select: { id: true, quan_ly_truc_tiep_id: true, updated_at: true },
  });
  if (!person)
    return { success: false as const, message: "Không tìm thấy nhân sự." };
  const people = await db.nhan_su.findMany({
    where: {
      company_id: s.companyId,
      id: { not: id },
      OR: [
        { tinh_trang_lam_viec: "ACTIVE" },
        { id: person.quan_ly_truc_tiep_id ?? -1 },
      ],
    },
    select: {
      id: true,
      ho_ten: true,
      ma_nhan_su: true,
      phong_ban: { select: { ten_phong_ban: true } },
    },
    orderBy: { ho_ten: "asc" },
  });
  return { success: true as const, person, people };
}
export async function saveDirectManager(input: unknown) {
  const p = z
    .object({
      id: z.number().int().positive(),
      managerId: z.number().int().positive().nullable(),
      version: z.string().datetime(),
    })
    .strict()
    .safeParse(input);
  const s = await getSession();
  if (!s || !hasPermission(s, "HR", "MANAGE"))
    return { success: false as const, message: "Không có quyền sửa nhân sự." };
  if (!p.success)
    return {
      success: false as const,
      message: "Thông tin quản lý không hợp lệ.",
      fieldErrors: p.error.flatten().fieldErrors,
    };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id=${s.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126,${s.companyId}::int)`;
      await currentActor(tx, s, "HR");
      const v = p.data,
        person = await tx.nhan_su.findFirst({
          where: { id: v.id, company_id: s.companyId },
        });
      if (!person || person.updated_at.toISOString() !== v.version)
        throw Error("Hồ sơ đã thay đổi. Mở lại phần quản lý trực tiếp.");
      if (v.managerId) {
        const people = await tx.nhan_su.findMany({
          where: { company_id: s.companyId },
          select: {
            id: true,
            quan_ly_truc_tiep_id: true,
            tinh_trang_lam_viec: true,
          },
        });
        const target = people.find((x) => x.id === v.managerId);
        if (!target || target.tinh_trang_lam_viec !== "ACTIVE")
          throw Error("Chọn quản lý đang làm việc trong công ty.");
        const visited = new Set([person.id]);
        let next: number | null = v.managerId;
        while (next) {
          if (visited.has(next))
            throw Error("Quan hệ quản lý không được tạo vòng lặp.");
          visited.add(next);
          next =
            people.find((x) => x.id === next)?.quan_ly_truc_tiep_id ?? null;
        }
      }
      if (person.quan_ly_truc_tiep_id === v.managerId) return;
      await tx.nhan_su.update({
        where: { id: person.id },
        data: { quan_ly_truc_tiep_id: v.managerId },
      });
      await tx.nhat_ky_hoat_dong.create({
        data: {
          company_id: s.companyId,
          account_id: s.userId,
          ten_dang_nhap: s.username,
          ho_ten: s.fullName,
          phan_he: "HR",
          hanh_dong: "UPDATE",
          doi_tuong_id: String(person.id),
          ten_doi_tuong: person.ho_ten,
          mo_ta: "Thay đổi quản lý trực tiếp",
          du_lieu_cu: { quan_ly_truc_tiep_id: person.quan_ly_truc_tiep_id },
          du_lieu_moi: { quan_ly_truc_tiep_id: v.managerId },
        },
      });
    });
    revalidatePath("/employees");
    revalidatePath("/tasks");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      message:
        e instanceof Error && !("code" in e)
          ? e.message
          : "Không thể cập nhật quản lý trực tiếp.",
    };
  }
}
