"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentActor } from "@/lib/rbac-server";
import {
  loadManagerGraph,
  createManagerResolver,
  assertNoNewManagerCycles,
} from "@/lib/employee-manager-resolution";
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
      tinh_trang_lam_viec: true,
      phong_ban: { select: { ten_phong_ban: true } },
    },
    orderBy: { ho_ten: "asc" },
  });
  const graph = await loadManagerGraph(db, s.companyId);
  const effective = createManagerResolver(graph).resolve(id);
  const inherited = createManagerResolver({
    ...graph,
    people: graph.people.map((p) =>
      p.id === id ? { ...p, quan_ly_truc_tiep_id: null } : p,
    ),
  }).resolve(id);
  const display = (r: typeof effective) => ({
    ...r,
    name: people.find((p) => p.id === r.managerId)?.ho_ten ?? null,
    department:
      graph.departments.find((d) => d.id === r.departmentId)?.ten_phong_ban ??
      null,
  });
  return {
    success: true as const,
    person,
    people,
    effective: display(effective),
    inherited: display(inherited),
  };
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
      await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id=${s.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126,${s.companyId}::int)`;
      await currentActor(tx, s, "HR");
      const v = p.data,
        person = await tx.nhan_su.findFirst({
          where: { id: v.id, company_id: s.companyId },
        });
      if (!person || person.updated_at.toISOString() !== v.version)
        throw Error("Hồ sơ đã thay đổi. Mở lại phần quản lý trực tiếp.");
      if (person.quan_ly_truc_tiep_id === v.managerId) return;
      const graph = await loadManagerGraph(tx, s.companyId);
      if (v.managerId !== null) {
        const target = graph.people.find((x) => x.id === v.managerId);
        if (!target || target.tinh_trang_lam_viec !== "ACTIVE")
          throw Error("Chọn quản lý đang làm việc trong công ty.");
      }
      assertNoNewManagerCycles(graph, {
        ...graph,
        people: graph.people.map((p) =>
          p.id === person.id ? { ...p, quan_ly_truc_tiep_id: v.managerId } : p,
        ),
      });
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
          mo_ta:
            v.managerId === null
              ? "Dùng quản lý theo cơ cấu phòng ban"
              : "Chỉ định quản lý trực tiếp riêng",
          du_lieu_cu: { quan_ly_truc_tiep_id: person.quan_ly_truc_tiep_id },
          du_lieu_moi: { quan_ly_truc_tiep_id: v.managerId },
        },
      });
    });
    revalidatePath("/employees");
    revalidatePath("/tasks", "layout");
    revalidatePath("/");
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
