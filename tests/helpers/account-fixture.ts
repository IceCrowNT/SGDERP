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
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw Error("Local fixture only");
  const p = new PrismaClient();
  try {
    const company = await p.company.findFirstOrThrow();
    const role = await p.role.create({
      data: {
        companyId: company.id,
        code: `TEST-${randomUUID()}`,
        name: "Temporary test role",
      },
    });
    const record: (typeof created)[number] = { roleId: role.id };
    created.push(record);
    if (level !== "NONE") {
      let permission = await p.permission.findFirst({
        where: { module, action: level },
      });
      if (!permission) {
        permission = await p.permission.create({
          data: { module, action: level, name: "Temporary test permission" },
        });
        record.permissionId = permission.id;
      }
      await p.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }
    const user = await p.user.create({
      data: {
        username: `test-${randomUUID()}`,
        displayName: "Temporary test account",
        password: "disabled-for-login",
        companyId: company.id,
        roles: { create: { roleId: role.id } },
      },
    });
    record.userId = user.id;
    await signAccount(context, user);
  } finally {
    await p.$disconnect();
  }
}
export async function signAccount(
  context: BrowserContext,
  user: { id: number; companyId: number; sessionVersion: number },
) {
  const url = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4000";
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw Error("Local fixture only");
  const token = await new SignJWT({
    userId: user.id,
    companyId: user.companyId,
    sessionVersion: user.sessionVersion,
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
        await p.auditLog.deleteMany({ where: { userId: row.userId } });
        await p.user.delete({ where: { id: row.userId } });
      }
      await p.role.delete({ where: { id: row.roleId } });
      if (row.permissionId)
        await p.permission.delete({ where: { id: row.permissionId } });
    }
  } finally {
    await p.$disconnect();
  }
}
