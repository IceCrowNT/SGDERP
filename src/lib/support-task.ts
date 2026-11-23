import { z } from "zod";
export const TASK_ACTIONS = [
  "VIEW",
  "CREATE",
  "EXECUTE",
  "ACCEPT",
  "MANAGE",
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];
export const TASK_LABELS: Record<TaskAction, string> = {
  VIEW: "Xem công việc liên quan",
  CREATE: "Tạo yêu cầu hỗ trợ",
  EXECUTE: "Nhận và thực hiện",
  ACCEPT: "Nghiệm thu việc được chỉ định",
  MANAGE: "Điều phối phòng phụ trách",
};
export const TASK_STATUS = {
  CHO_NHAN: "Chờ nhận",
  DANG_THUC_HIEN: "Đang thực hiện",
  CAN_BO_SUNG: "Cần bổ sung",
  CHO_NGHIEM_THU: "Chờ nghiệm thu",
  HOAN_THANH: "Hoàn thành",
  TU_CHOI: "Từ chối",
  DA_HUY: "Đã hủy",
} as const;
export const TASK_CATEGORIES = {
  IT: "IT",
  HANH_CHINH: "Hành chính",
  NHAN_SU: "Nhân sự",
  KHAC: "Khác",
} as const;
export const TASK_EVENTS: Record<string, string> = {
  TAO: "Tạo yêu cầu",
  SUA: "Sửa nội dung",
  NHAN: "Nhận việc",
  TU_CHOI_CA_NHAN: "Cá nhân từ chối",
  TU_CHOI_YEU_CAU: "Từ chối yêu cầu",
  CHUYEN_DICH: "Chuyển người/phòng nhận",
  DOI_NGUOI_NGHIEM_THU: "Đổi người nghiệm thu",
  DOI_QUAN_LY: "Đổi quản lý",
  THEM_TEP: "Thêm tệp",
  BAO_XONG: "Báo xong",
  YEU_CAU_BO_SUNG: "Yêu cầu bổ sung",
  NGHIEM_THU: "Nghiệm thu",
  HUY: "Hủy việc",
};
export function taskActions(
  grants: { phan_he: string; hanh_dong: string; pham_vi: string }[],
): TaskAction[] {
  return TASK_ACTIONS.filter((a) =>
    grants.some(
      (g) =>
        g.phan_he === "SUPPORT_TASK" &&
        g.hanh_dong === a &&
        g.pham_vi === "ALL",
    ),
  );
}
export function canTask(
  actions: readonly TaskAction[] | undefined,
  action: TaskAction = "VIEW",
) {
  return Boolean(
    actions?.includes("VIEW") &&
      (action === "VIEW" || actions.includes(action)),
  );
}
const id = z.number().int().positive();
const date = z.string().datetime({ offset: true }).nullable();
export const TaskFields = z
  .object({
    title: z.string().trim().min(1, "Nhập tiêu đề").max(255),
    description: z.string().trim().min(1, "Nhập nội dung").max(20000),
    category: z.enum(["IT", "HANH_CHINH", "NHAN_SU", "KHAC"]),
    nature: z.enum(["HO_TRO", "SUA_CHUA", "KHAC"]),
    priority: z.enum(["BINH_THUONG", "KHAN"]),
    targetType: z.enum(["CA_NHAN", "PHONG_BAN"]),
    targetId: z.number().int().min(1, "Chọn người hoặc phòng hỗ trợ"),
    acceptance: z.enum(["KHONG_CAN", "NGUOI_YEU_CAU", "QUAN_LY"]),
    startAt: date,
    deadline: date,
  })
  .strict();
export const CreateTaskSchema = TaskFields.extend({
  requestId: z.string().uuid(),
}).strict();
export const TaskMutationSchema = z
  .object({
    id,
    version: id,
    operationId: z.string().uuid(),
    action: z.enum([
      "NHAN",
      "TU_CHOI_CA_NHAN",
      "TU_CHOI_YEU_CAU",
      "BAO_XONG",
      "NGHIEM_THU",
      "YEU_CAU_BO_SUNG",
      "HUY",
      "SUA",
      "CHUYEN_DICH",
      "DOI_NGUOI_NGHIEM_THU",
      "DOI_QUAN_LY",
    ]),
    reason: z.string().trim().max(2000).default(""),
    evidenceIds: z.array(id).max(100).default([]),
    addAcceptance: z.enum(["KHONG_CAN", "NGUOI_YEU_CAU", "QUAN_LY"]).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(20000).optional(),
    startAt: date.optional(),
    deadline: date.optional(),
    targetType: z.enum(["CA_NHAN", "PHONG_BAN"]).optional(),
    targetId: id.optional(),
    personId: id.optional(),
    managerSide: z.enum(["REQUESTER", "SUPPORT"]).optional(),
  })
  .strict();
export const TaskListSchema = z
  .object({
    tab: z
      .enum([
        "all",
        "receive",
        "doing",
        "accept",
        "requested",
        "closed",
        "department",
      ])
      .default("all"),
    search: z.string().trim().max(255).default(""),
    category: z
      .enum(["ALL", "IT", "HANH_CHINH", "NHAN_SU", "KHAC"])
      .default("ALL"),
    status: z
      .enum([
        "ALL",
        ...(Object.keys(TASK_STATUS) as [
          keyof typeof TASK_STATUS,
          ...(keyof typeof TASK_STATUS)[],
        ]),
      ])
      .default("ALL"),
    overdue: z.boolean().default(false),
    page: z.number().int().min(1).max(100000).default(1),
  })
  .strict();
export type TaskFieldsInput = z.infer<typeof TaskFields>;
export const TASK_FILE_LIMIT = 10 * 1024 * 1024;
export const TASK_TOTAL_LIMIT = 50 * 1024 * 1024;
