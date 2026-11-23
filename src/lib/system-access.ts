import type { SessionUser } from "@/lib/auth";
import { canManageAccounts } from "@/lib/account-access";
import { canAdministerAi } from "@/lib/role-catalog";

/** Same entry policy for the overview and navigation; no new SYSTEM grant. */
export function systemAccess(session?: SessionUser | null) {
  const available = Boolean(session && !session.mustChangePassword);
  const view = (module: string) => available && ["VIEW", "MANAGE"].includes(session?.permissions[module] ?? "");
  return {
    accounts: available && canManageAccounts(session),
    roles: view("ROLES"),
    locations: view("LOCATIONS"),
    audit: view("AUDIT"),
    settings: available && canAdministerAi(session),
  };
}
export function canViewSystemOverview(session?: SessionUser | null) {
  return Object.values(systemAccess(session)).some(Boolean);
}
