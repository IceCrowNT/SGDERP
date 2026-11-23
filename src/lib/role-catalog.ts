import { TASK_ACTIONS, type TaskAction } from "@/lib/support-task";
import type { PermissionLevel } from "@/lib/auth";

// Only functions whose server guards are implemented belong in this matrix.
export const ROLE_MODULES = [
  { code: "INVENTORY", label: "Vật tư và phụ kiện", description: "Mặt hàng, tồn kho, cấp phát và thu hồi toàn công ty", levels: ["NONE", "VIEW", "MANAGE"] },
  {
    code: "ASSETS",
    label: "Tài sản",
    description: "Hồ sơ thiết bị, loại tài sản và lịch sử thay đổi",
    levels: ["NONE", "VIEW", "MANAGE"],
  },
  {
    code: "LOCATIONS",
    label: "Vị trí & không gian",
    description: "Danh mục không gian dùng chung, độc lập nhân sự và tài sản",
    levels: ["NONE", "VIEW", "MANAGE"],
  },
  {
    code: "HR",
    label: "Nhân sự và phòng ban",
    description: "Hồ sơ, cơ cấu, danh bạ và bản đồ 3D",
    levels: ["NONE", "VIEW", "MANAGE"],
  },
  {
    code: "ACCOUNTS",
    label: "Tài khoản đăng nhập",
    description: "Cấp tài khoản, khóa/mở và đặt lại mật khẩu",
    levels: ["NONE", "MANAGE"],
  },
  {
    code: "ROLES",
    label: "Vai trò và phân quyền",
    description: "Quản lý cho phép cấp mọi quyền trong công ty",
    levels: ["NONE", "VIEW", "MANAGE"],
  },
  {
    code: "AUDIT",
    label: "Nhật ký hoạt động",
    description: "Xem lịch sử thao tác trong công ty",
    levels: ["NONE", "VIEW"],
  },
] as const;
export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  NONE: "Không truy cập",
  VIEW: "Xem",
  MANAGE: "Quản lý",
};
export type PermissionGrant = {
  phan_he: string;
  hanh_dong: string;
  pham_vi: string;
};
// Only implemented AI actions belong in the editable catalog.
export const AI_ACTIONS = ["MANAGE_CONNECTIONS", "MANAGE_LIMITS", "VIEW_USAGE"] as const;
export type AiAction = (typeof AI_ACTIONS)[number];
export const AI_LABELS: Record<AiAction, string> = {
  MANAGE_CONNECTIONS: "Quản lý kết nối & model AI",
  MANAGE_LIMITS: "Quản lý hạn mức AI",
  VIEW_USAGE: "Xem mức sử dụng AI trong công ty",
};
export function aiActions(grants: PermissionGrant[]): AiAction[] {
  return AI_ACTIONS.filter(action => grants.some(p => p.phan_he === "AI" && p.hanh_dong === action && p.pham_vi === "ALL"));
}
export function canManageAiConnections(session: { aiActions?: AiAction[]; mustChangePassword?: boolean } | null | undefined) {
  return Boolean(session && !session.mustChangePassword && session.aiActions?.includes("MANAGE_CONNECTIONS"));
}
export function canAi(session: { aiActions?: AiAction[]; mustChangePassword?: boolean } | null | undefined, action: AiAction) {
  return Boolean(session && !session.mustChangePassword && session.aiActions?.includes(action));
}
export function canAdministerAi(session: { aiActions?: AiAction[]; mustChangePassword?: boolean } | null | undefined) {
  return (["MANAGE_CONNECTIONS", "MANAGE_LIMITS", "VIEW_USAGE"] as const).some(action => canAi(session, action));
}
export function permissionLevels(grants: PermissionGrant[]) {
  const result: Record<string, PermissionLevel> = {};
  for (const p of grants) {
    // Scoped grants must never silently become company-wide access.
    if (p.pham_vi !== "ALL") continue;
    if (p.hanh_dong === "MANAGE") result[p.phan_he] = "MANAGE";
    else if (p.hanh_dong === "VIEW" && result[p.phan_he] !== "MANAGE")
      result[p.phan_he] = "VIEW";
  }
  return result;
}
export const WORKFLOW_ACTIONS = [
  "VIEW",
  "CREATE",
  "APPROVE",
  "EXECUTE",
  "MANAGE",
] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];
export const WORKFLOW_LABELS: Record<WorkflowAction, string> = {
  VIEW: "Xem hồ sơ liên quan",
  CREATE: "Tạo và gửi hồ sơ",
  APPROVE: "Duyệt bước được giao",
  EXECUTE: "Thực hiện bước được giao",
  MANAGE: "Quản lý mẫu và điều phối",
};
export function workflowActions(grants: PermissionGrant[]): WorkflowAction[] {
  return WORKFLOW_ACTIONS.filter((a) =>
    grants.some(
      (p) =>
        p.phan_he === "WORKFLOW" && p.pham_vi === "ALL" && p.hanh_dong === a,
    ),
  );
}
export function canWorkflow(
  actions: readonly WorkflowAction[] | undefined,
  action: WorkflowAction = "VIEW",
) {
  if (!actions) return false;
  const view = actions.includes("VIEW") || actions.includes("MANAGE");
  return view && (action === "VIEW" || actions.includes(action));
}
export function isEditableGrant(p: PermissionGrant) {
  return (
    p.pham_vi === "ALL" &&
    ((p.phan_he === "SUPPORT_TASK" && TASK_ACTIONS.includes(p.hanh_dong as TaskAction)) ||
      (p.phan_he === "AI" && AI_ACTIONS.includes(p.hanh_dong as AiAction)) ||
      (p.phan_he === "WORKFLOW" &&
      WORKFLOW_ACTIONS.includes(p.hanh_dong as WorkflowAction)) ||
      ROLE_MODULES.some(
        (m) =>
          m.code === p.phan_he &&
          (m.levels as readonly string[]).includes(p.hanh_dong),
      ))
  );
}
