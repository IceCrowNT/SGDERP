"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { allocateUsername, defaultRole } from "@/lib/account-defaults";
import * as bcrypt from "bcryptjs";
import {
  assertAssignableRoles,
  currentActor,
  administratorWhere,
} from "@/lib/rbac-server";
import { canManageAccounts } from "@/lib/account-access";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/validations/user";

export interface GetEmployeesFilter {
  search?: string;
  departmentId?: number;
  status?: "ALL" | "ACTIVE" | "LEFT" | "UNKNOWN";
}
const employeeInclude = {
  phong_ban: { select: { id: true, ten_phong_ban: true } },
  _count: { select: { danh_sach_tai_khoan: true } },
  danh_sach_phong_phu_trach: {
    select: { id: true, ten_phong_ban: true },
  },
} as const;
export async function getEmployees(filter?: GetEmployeesFilter) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR"))
    return { success: false as const, message: "Không có quyền xem nhân sự." };
  const where: Prisma.nhan_suWhereInput = {
    company_id: session.companyId,
  };
  if (filter?.status && filter.status !== "ALL")
    where.tinh_trang_lam_viec = filter.status;
  if (filter?.departmentId) {
    const departments = await db.phong_ban.findMany({
      where: { company_id: session.companyId },
      select: { id: true, parent_id: true },
    });
    const ids = new Set([filter.departmentId]);
    for (const id of ids)
      for (const d of departments)
        if (d.parent_id === id) ids.add(d.id);
    where.department_id = { in: [...ids] };
  }
  if (filter?.search?.trim()) {
    const contains = filter.search.trim();
    where.OR = [
      "ho_ten",
      "ma_nhan_su",
      "so_dien_thoai",
      "thu_dien_tu",
      "chuc_vu",
    ].map((key) => ({ [key]: { contains, mode: "insensitive" } }));
  }
  const data = await db.nhan_su.findMany({
    where,
    include: employeeInclude,
    orderBy: { ma_nhan_su: "asc" },
  });
  return {
    success: true as const,
    data,
    canManage: hasPermission(session, "HR", "MANAGE"),
  };
}
export async function getEmployeeById(id: number) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR") || !Number.isInteger(id))
    return { success: false as const, message: "Không có quyền xem hồ sơ." };
  const data = await db.nhan_su.findFirst({
    where: { id: id, company_id: session.companyId },
    include: employeeInclude,
  });
  return data
    ? { success: true as const, data }
    : { success: false as const, message: "Không tìm thấy nhân sự." };
}
async function saveEmployee(input: unknown, updating: boolean) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR", "MANAGE"))
    return { success: false, message: "Không có quyền sửa nhân sự." };
  const parsed = (
    updating ? UpdateEmployeeSchema : CreateEmployeeSchema
  ).safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  const id = "id" in v ? (v.id as number) : undefined;
  const addingAccount = Boolean(
    v.createAccount ||
      v.accountUsername ||
      v.accountPassword ||
      v.accountRoleIds?.length,
  );
  if (addingAccount && !canManageAccounts(session))
    return { success: false, message: "Không có quyền quản lý tài khoản." };
  const initialPassword = addingAccount
    ? v.accountPassword || randomBytes(15).toString("base64url")
    : undefined;
  const passwordHash = initialPassword
    ? await bcrypt.hash(initialPassword, 10)
    : undefined;
  let credentials: { username: string; password: string } | undefined;
  try {
    await db.$transaction(async (tx) => {
      // Same ordering as department edits; account operations share the advisory lock.
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const roleIds = [...new Set(v.accountRoleIds ?? [])];
      await currentActor(tx, session, "HR");
      if (addingAccount) await assertAssignableRoles(tx, session, roleIds);
      if (
        v.departmentId &&
        !(await tx.phong_ban.findFirst({
          where: {
            id: v.departmentId,
            company_id: session.companyId,
          },
        }))
      )
        throw Error("Phòng ban không hợp lệ.");
      const previous = id
        ? await tx.nhan_su.findFirst({
            where: { id: id, company_id: session.companyId },
          })
        : null;
      if (id && !previous) throw Error("Không tìm thấy nhân sự.");
      const data = {
        ho_ten: v.fullName,
        chuc_vu: v.position || null,
        ghi_chu: v.notes || null,
        department_id: v.departmentId,
        so_dien_thoai: v.phone || null,
        thu_dien_tu: v.email || null,
        ngay_sinh: v.dateOfBirth ? new Date(v.dateOfBirth) : null,
        ngay_vao_lam: v.joinDate ? new Date(v.joinDate) : null,
        tinh_trang_lam_viec: v.employmentStatus,
      };
      const person = id
        ? await tx.nhan_su.update({ where: { id: id }, data })
        : await tx.nhan_su.create({
            data: { ...data, company_id: session.companyId },
          });
      if (addingAccount) {
        if (!roleIds.length)
          roleIds.push(await defaultRole(tx, session.companyId));
        const generatedUsername = await allocateUsername(
          tx,
          person.ho_ten,
          person.id,
        );
        const account = await tx.tai_khoan.create({
          data: {
            company_id: session.companyId,
            employee_id: person.id,
            ten_dang_nhap: v.accountUsername || generatedUsername,
            bat_buoc_doi_mat_khau: true,
            ten_hien_thi: person.ho_ten,
            mat_khau_bam: passwordHash!,
            danh_sach_vai_tro: {
              create: roleIds.map((roleId, i) => ({
                role_id: roleId,
                la_vai_tro_chinh: i === 0,
              })),
            },
          },
        });
        credentials = {
          username: account.ten_dang_nhap,
          password: initialPassword!,
        };
        await tx.nhat_ky_hoat_dong.create({
          data: {
            company_id: session.companyId,
            account_id: session.userId,
            ten_dang_nhap: session.username,
            ho_ten: session.fullName,
            hanh_dong: "CREATE",
            phan_he: "AUTH",
            doi_tuong_id: String(account.id),
            ten_doi_tuong: account.ten_dang_nhap,
            mo_ta: "Cấp tài khoản từ hồ sơ nhân sự.",
            du_lieu_moi: { employeeId: person.id, roleIds },
          },
        });
      }
      if (v.employmentStatus === "LEFT") {
        const accounts = await tx.tai_khoan.findMany({
          where: {
            company_id: session.companyId,
            employee_id: person.id,
            cho_phep_dang_nhap: true,
          },
          select: { id: true, ten_dang_nhap: true },
        });
        if (accounts.length) {
          const ids = accounts.map((a) => a.id);
          const adminWhere = administratorWhere(session.companyId);
          // The person is already LEFT here; only inspect permission links for affected admins.
          const closingAdmin = await tx.tai_khoan.count({
            where: { id: { in: ids }, AND: adminWhere.AND },
          });
          if (
            closingAdmin &&
            !(await tx.tai_khoan.count({
              where: { ...adminWhere, id: { notIn: ids } },
            }))
          )
            throw Error(
              "Phải giữ ít nhất một tài khoản quản trị hoạt động. Hãy bàn giao quyền quản trị trước khi ghi nhận nghỉ việc.",
            );
          await tx.tai_khoan.updateMany({
            where: {
              id: { in: ids },
              company_id: session.companyId,
            },
            data: {
              cho_phep_dang_nhap: false,
              phien_ban_dang_nhap: { increment: 1 },
            },
          });
          await tx.nhat_ky_hoat_dong.createMany({
            data: accounts.map((a) => ({
              company_id: session.companyId,
              account_id: session.userId,
              ten_dang_nhap: session.username,
              ho_ten: session.fullName,
              hanh_dong: "UPDATE",
              phan_he: "AUTH",
              doi_tuong_id: String(a.id),
              ten_doi_tuong: a.ten_dang_nhap,
              mo_ta: `Tự khóa tài khoản khi nhân sự ${person.ma_nhan_su} nghỉ việc; thu hồi phiên đăng nhập.`,
              du_lieu_cu: { cho_phep_dang_nhap: true },
              du_lieu_moi: {
                cho_phep_dang_nhap: false,
                employeeId: person.id,
              },
            })),
          });
        }
      }
      await tx.nhat_ky_hoat_dong.create({
        data: {
          account_id: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          company_id: session.companyId,
          hanh_dong: id ? "UPDATE" : "CREATE",
          phan_he: "HR",
          doi_tuong_id: String(person.id),
          ten_doi_tuong: person.ho_ten,
          mo_ta: `${id ? "Cập nhật" : "Tạo"} hồ sơ nhân sự${v.employmentStatus === "LEFT" ? "; tự khóa tài khoản liên kết" : ""}.`,
          du_lieu_cu: previous
            ? JSON.parse(JSON.stringify(previous))
            : undefined,
          du_lieu_moi: JSON.parse(JSON.stringify(person)),
        },
      });
    });
    for (const path of [
      "/employees",
      "/departments",
      "/office-3d",
      "/accounts",
      "/",
    ])
      revalidatePath(path);
    return {
      success: true,
      credentials,
      message:
        v.employmentStatus === "LEFT"
          ? "Đã lưu hồ sơ và khóa các tài khoản liên kết. Làm việc trở lại không tự mở tài khoản."
          : addingAccount
            ? "Đã lưu hồ sơ và cấp tài khoản."
            : "Đã lưu hồ sơ nhân sự.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code === "P2002"
            ? "Tên đăng nhập hoặc mã nhân sự đã tồn tại. Vui lòng kiểm tra lại."
            : "Không thể lưu hồ sơ. Kiểm tra lại dữ liệu liên kết."
          : error instanceof Error && error.constructor === Error
            ? error.message
            : "Không thể lưu hồ sơ.",
    };
  }
}
export async function createEmployee(input: CreateEmployeeInput) {
  return saveEmployee(input, false);
}
export async function updateEmployee(input: UpdateEmployeeInput) {
  return saveEmployee(input, true);
}
