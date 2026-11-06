import type { SessionUser } from "@/lib/auth";
export function canManageAccounts(session: SessionUser | null | undefined) {
  return session?.permissions.ACCOUNTS === "MANAGE";
}
