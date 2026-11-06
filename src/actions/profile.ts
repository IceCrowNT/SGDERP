"use server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import * as bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getSession,
  createSessionToken,
  setSessionCookie,
  type SessionUser,
} from "@/lib/auth";
import { readAccountSession } from "@/lib/account-session";
import { avatarDirectory, removeAvatar } from "@/lib/profile-storage";

async function actor(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  passwordOnly = false,
) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  const account = await tx.tai_khoan.findFirst({
    where: { id: session.userId, company_id: session.companyId },
    include: { nhan_su: true },
  });
  if (
    !account?.cho_phep_dang_nhap ||
    account.phien_ban_dang_nhap !== session.sessionVersion ||
    account.nhan_su?.tinh_trang_lam_viec === "LEFT"
  )
    throw Error("Phiên đã hết hiệu lực. Vui lòng đăng nhập lại.");
  if (account.bat_buoc_doi_mat_khau && !passwordOnly)
    throw Error("Vui lòng đổi mật khẩu tạm trước.");
  return account;
}
async function audit(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  description: string,
  fields: string[],
) {
  await tx.nhat_ky_hoat_dong.create({
    data: {
      company_id: session.companyId,
      account_id: session.userId,
      ten_dang_nhap: session.username,
      ho_ten: session.fullName,
      phan_he: "AUTH",
      hanh_dong: "UPDATE",
      doi_tuong_id: String(session.userId),
      mo_ta: description,
      du_lieu_moi: { fields },
    },
  });
}
function errorMessage(e: unknown) {
  return e instanceof Error && e.constructor === Error
    ? e.message
    : "Không thể lưu thay đổi. Vui lòng thử lại.";
}
export async function getMyProfile() {
  const session = await getSession({ allowPasswordChange: true });
  if (!session) return null;
  const person = session.employeeId
    ? await db.nhan_su.findFirst({
        where: {
          id: session.employeeId,
          company_id: session.companyId,
        },
        select: {
          ho_ten: true,
          ma_nhan_su: true,
          chuc_vu: true,
          thu_dien_tu: true,
          so_dien_thoai: true,
          dia_chi: true,
          ngay_sinh: true,
          ngay_vao_lam: true,
          tinh_trang_lam_viec: true,
          phong_ban: { select: { ten_phong_ban: true } },
          danh_sach_phong_phu_trach: { select: { ten_phong_ban: true } },
        },
      })
    : null;
  return {
    username: session.username,
    name: session.fullName,
    avatar: session.avatarUrl,
    roles: session.roleCodes,
    mustChangePassword: Boolean(session.mustChangePassword),
    person,
  };
}
const ContactSchema = z
  .object({
    phone: z.string().trim().max(20, "Điện thoại tối đa 20 ký tự"),
    email: z.union([
      z.literal(""),
      z.string().trim().email("Email không hợp lệ").max(255),
    ]),
    address: z.string().trim().max(1000, "Địa chỉ tối đa 1.000 ký tự"),
  })
  .strict();
export async function saveMyProfile(input: unknown) {
  const session = await getSession();
  if (!session)
    return {
      success: false,
      message: "Vui lòng đăng nhập và đổi mật khẩu tạm nếu được yêu cầu.",
    };
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    await db.$transaction(async (tx) => {
      const account = await actor(tx, session);
      if (!account.employee_id)
        throw Error("Tài khoản hệ thống chưa có hồ sơ nhân sự.");
      await tx.nhan_su.update({
        where: {
          id: account.employee_id,
          company_id: session.companyId,
        },
        data: {
          so_dien_thoai: parsed.data.phone || null,
          thu_dien_tu: parsed.data.email || null,
          dia_chi: parsed.data.address || null,
        },
      });
      await audit(tx, session, "Tự cập nhật thông tin liên hệ cá nhân.", [
        "so_dien_thoai",
        "thu_dien_tu",
        "dia_chi",
      ]);
    });
    revalidatePath("/", "layout");
    return { success: true, message: "Đã lưu thông tin cá nhân." };
  } catch (e) {
    return { success: false, message: errorMessage(e) };
  }
}
const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại").max(100),
    newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
    confirmation: z.string().min(1, "Nhập lại mật khẩu mới"),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.confirmation)
      ctx.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Mật khẩu nhập lại chưa khớp",
      });
    if (v.currentPassword === v.newPassword)
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Mật khẩu mới phải khác mật khẩu hiện tại",
      });
  });
export async function changeMyPassword(input: unknown) {
  const session = await getSession({ allowPasswordChange: true });
  if (!session) return { success: false, message: "Vui lòng đăng nhập lại." };
  const parsed = PasswordSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  try {
    const version = await db.$transaction(async (tx) => {
      const account = await actor(tx, session, true);
      if (
        !(await bcrypt.compare(
          parsed.data.currentPassword,
          account.mat_khau_bam,
        ))
      )
        throw Error("Mật khẩu hiện tại không đúng.");
      const updated = await tx.tai_khoan.update({
        where: {
          id: session.userId,
          company_id: session.companyId,
        },
        data: {
          mat_khau_bam: hashed,
          bat_buoc_doi_mat_khau: false,
          phien_ban_dang_nhap: { increment: 1 },
        },
      });
      await audit(
        tx,
        session,
        "Tự đổi mật khẩu; thu hồi các phiên đăng nhập cũ.",
        ["mat_khau_bam", "phien_ban_dang_nhap"],
      );
      return updated.phien_ban_dang_nhap;
    });
    const current = await readAccountSession(session.userId);
    if (!current || current.sessionVersion !== version)
      return {
        success: true,
        message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại.",
      };
    await setSessionCookie(await createSessionToken(current));
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Đã đổi mật khẩu và thu hồi các phiên cũ.",
    };
  } catch (e) {
    return { success: false, message: errorMessage(e) };
  }
}
export async function saveMyAvatar(form: FormData) {
  const session = await getSession();
  if (!session) return { success: false, message: "Không có quyền thay ảnh." };
  const command = z.enum(["upload", "remove"]).safeParse(form.get("command"));
  if (!command.success)
    return { success: false, message: "Thao tác không hợp lệ." };
  let newUrl: string | null = null;
  let oldUrl: string | null = null;
  try {
    if (!session.employeeId)
      throw Error("Tài khoản hệ thống không có ảnh nhân sự.");
    if (command.data === "upload") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024)
        throw Error("Chọn ảnh tối đa 2 MB.");
      const bytes = Buffer.from(await file.arrayBuffer());
      const source = sharp(bytes, {
        limitInputPixels: 16_000_000,
        animated: false,
      });
      const metadata = await source.metadata().catch(() => null);
      if (!metadata || !["jpeg", "png", "webp"].includes(metadata.format))
        throw Error("Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ.");
      const normalized = await source
        .rotate()
        .resize(512, 512, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await mkdir(avatarDirectory, { recursive: true, mode: 0o700 });
      const fileName = `${randomUUID()}.webp`;
      await writeFile(path.join(avatarDirectory, fileName), normalized, {
        mode: 0o600,
        flag: "wx",
      });
      newUrl = `/media/avatar/${fileName}`;
    }
    await db.$transaction(async (tx) => {
      const account = await actor(tx, session);
      if (!account.nhan_su) throw Error("Không tìm thấy hồ sơ cá nhân.");
      oldUrl = account.nhan_su.duong_dan_anh_dai_dien;
      await tx.nhan_su.update({
        where: {
          id: account.nhan_su.id,
          company_id: session.companyId,
        },
        data: { duong_dan_anh_dai_dien: newUrl },
      });
      await audit(tx, session, "Tự cập nhật ảnh đại diện.", [
        "duong_dan_anh_dai_dien",
      ]);
    });
  } catch (e) {
    await removeAvatar(newUrl);
    return { success: false, message: errorMessage(e) };
  }
  await removeAvatar(oldUrl);
  revalidatePath("/", "layout");
  return {
    success: true,
    message:
      command.data === "remove"
        ? "Đã xóa ảnh đại diện."
        : "Đã cập nhật ảnh đại diện.",
  };
}
