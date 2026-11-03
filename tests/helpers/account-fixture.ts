import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { loadEnvConfig } from "@next/env";
import type { BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
loadEnvConfig(process.cwd());
const created: { userId?: number; roleId: number; permissionId?: number }[] =
  [];
export async function fixtureSession(
  context: BrowserContext,
  module: string,
  level: "NONE" | "VIEW" | "MANAGE",
) {
  const url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
  if (!["localhost", "127.0.0.1", "127.0.2.2"].includes(new URL(url).hostname))
    throw Error("Local fixture only");
  const p = new PrismaClient();
  try {
    const company = await p.cong_ty.findFirstOrThrow();
    const role = await p.vai_tro.create({
      data: {
        dinh_danh_cong_ty: company.dinh_danh,
        ma_vai_tro: `TEST-${randomUUID()}`,
        ten_vai_tro: "Temporary test role",
      },
    });
    const record: (typeof created)[number] = { roleId: role.dinh_danh };
    created.push(record);
    if (level !== "NONE") {
      let permission = await p.quyen.findFirst({
        where: { phan_he: module, hanh_dong: level },
      });
      if (!permission) {
        permission = await p.quyen.create({
          data: { phan_he: module, hanh_dong: level, ten_quyen: "Temporary test permission" },
        });
        record.permissionId = permission.dinh_danh;
      }
      await p.vai_tro_quyen.create({
        data: { dinh_danh_vai_tro: role.dinh_danh, dinh_danh_quyen: permission.dinh_danh },
      });
    }
    const user = await p.tai_khoan.create({
      data: {
        ten_dang_nhap: `test-${randomUUID()}`,
        ten_hien_thi: "Temporary test account",
        mat_khau_bam: "disabled-for-login",
        dinh_danh_cong_ty: company.dinh_danh,
        danh_sach_vai_tro: { create: { dinh_danh_vai_tro: role.dinh_danh } },
      },
    });
    record.userId = user.dinh_danh;
    await signAccount(context, user);
  } finally {
    await p.$disconnect();
  }
}
export async function signAccount(
  context: BrowserContext,
  user: { dinh_danh: number; dinh_danh_cong_ty: number; phien_ban_dang_nhap: number },
) {
  const url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
  if (!["localhost", "127.0.0.1", "127.0.2.2"].includes(new URL(url).hostname))
    throw Error("Local fixture only");
  const token = await new SignJWT({
    userId: user.dinh_danh,
    companyId: user.dinh_danh_cong_ty,
    sessionVersion: user.phien_ban_dang_nhap,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(
      new TextEncoder().encode(
        process.env.SESSION_SECRET ||
          "sdg_erp_super_secret_jwt_key_default_2026",
      ),
    );
  await context.addCookies([{ name: "sdg_session", value: token, url }]);
}
export async function cleanFixtures() {
  const p = new PrismaClient();
  try {
    for (const row of created.splice(0)) {
      if (row.userId) {
        await p.nhat_ky_hoat_dong.deleteMany({ where: { dinh_danh_tai_khoan: row.userId } });
        await p.tai_khoan.delete({ where: { dinh_danh: row.userId } });
      }
      await p.vai_tro.delete({ where: { dinh_danh: row.roleId } });
      if (row.permissionId)
        await p.quyen.delete({ where: { dinh_danh: row.permissionId } });
    }
  } finally {
    await p.$disconnect();
  }
}
