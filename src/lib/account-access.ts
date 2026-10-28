import type { SessionUser } from "@/lib/auth";
// Dedicated RBAC management remains a later feature. HR-only access does not grant account administration.
export function canManageAccounts(session: SessionUser | null | undefined) {
  return Boolean(
    session?.roleCodes.some((code) => code === "ADMIN" || code === "IT_ADMIN"),
  );
}
