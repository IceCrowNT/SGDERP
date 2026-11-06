import type { SessionUser } from "@/lib/auth";
/** Company-wide access only. Scoped access is not yet implemented; deny by default. */
export async function getAccessibleDepartmentIds(session: SessionUser, targetModule: "HR" | "TASK" = "HR"): Promise<number[] | null> {
  return ["VIEW", "MANAGE"].includes(session.permissions[targetModule] ?? "") ? null : [];
}
