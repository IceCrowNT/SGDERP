import { z } from "zod";
import { TaskFields } from "./support-task";
export const SupportTargetLookupSchema = z
  .object({
    kind: z.enum(["people", "departments", "all"]).default("all"),
    search: z.string().trim().max(120).default(""),
    page: z.number().int().min(1).max(1000).default(1),
  })
  .strict();
export const SupportTargetSchema = z.object({
  id: z.number().int().positive(), kind: z.enum(["people", "departments"]),
  name: z.string().max(500), code: z.string().max(120),
  position: z.string().max(500), department: z.string().max(500),
  canReceive: z.boolean(), unavailableReason: z.string().max(500).nullable(),
}).strict();
export type SupportTarget = z.infer<typeof SupportTargetSchema>;
export const SupportTicketDraftSchema = TaskFields.extend({
  category: TaskFields.shape.category.default("IT"),
  nature: TaskFields.shape.nature.default("HO_TRO"),
  priority: TaskFields.shape.priority.default("BINH_THUONG"),
  startAt: TaskFields.shape.startAt.default(null),
  deadline: TaskFields.shape.deadline.default(null),
}).strict();
export const SavedSupportDraftSchema = z
  .object({ requestId: z.string().uuid(), values: TaskFields })
  .strict();
export type SavedSupportDraft = z.infer<typeof SavedSupportDraftSchema>;
export type AiSupportDraft = {
  kind: "support-ticket";
  row: null;
  changes: { label: string; before: string; after: string }[];
} & SavedSupportDraft;
export function supportDraft(saved: SavedSupportDraft): AiSupportDraft {
  return { kind: "support-ticket", row: null, changes: [], ...saved };
}
const tool = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
) => ({
  type: "function",
  name,
  description,
  parameters: {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  },
  strict: false,
});
export const AI_SUPPORT_TASK_TOOLS = [
  tool(
    "lookup_support_targets",
    "Tra người/phòng trong công ty theo tên, mã, chức danh, tên/mã phòng và tên viết tắt; IT/CNTT/Công nghệ thông tin tương đương khi tìm kiếm, không tự gán người phụ trách. Dùng kind=all nếu người dùng nói IT mà chưa chỉ rõ một phòng. Không thấy phòng thì công cụ gợi ý người phù hợp. search rỗng để xem danh sách, page bắt đầu 1, tối đa 20 kết quả/trang; đọc nextPage khi còn kết quả. canReceive=false kèm unavailableReason; phân biệt không tìm thấy với tìm thấy nhưng chưa đủ điều kiện nhận. Danh sách lựa chọn được hiển thị trong chat; không yêu cầu người dùng tự tìm tên trên màn hình khác. Không tự đoán ID hoặc chọn khi trùng tên. Người gửi lấy từ tài khoản hiện tại, không gửi thay.",
    {
      kind: { type: "string", enum: ["people", "departments", "all"] },
      search: { type: "string" },
      page: { type: "integer", minimum: 1, maximum: 1000 },
    },
    ["kind", "search"],
  ),
  tool(
    "prepare_support_ticket",
    "Chuẩn bị ticket CHƯA GỬI, không tạo công việc/thông báo. Phải tra đích trước; thiếu hoặc trùng người/phòng thì hỏi rõ. Gửi phòng chờ quản lý giao nhân viên. Nội dung theo yêu cầu, không bịa thông tin. Nghiệm thu cần người dùng lựa chọn: NGUOI_YEU_CAU, QUAN_LY (quản lý bên gửi), KHONG_CAN; nếu chưa nói thì dùng NGUOI_YEU_CAU và nêu rõ trong form. Không đặt deadline nếu chưa yêu cầu. Ngày giờ ISO8601 có offset, Việt Nam +07:00. Server kiểm tra đích, quản lý, quyền và người nghiệm thu; chỉ nút Gửi yêu cầu mới tạo thật.",
    {
      title: { type: "string" },
      description: { type: "string" },
      category: {
        type: "string",
        enum: ["IT", "HANH_CHINH", "NHAN_SU", "KHAC"],
      },
      nature: { type: "string", enum: ["HO_TRO", "SUA_CHUA", "KHAC"] },
      priority: { type: "string", enum: ["BINH_THUONG", "KHAN"] },
      targetType: { type: "string", enum: ["CA_NHAN", "PHONG_BAN"] },
      targetId: { type: "integer", minimum: 1 },
      acceptance: {
        type: "string",
        enum: ["NGUOI_YEU_CAU", "QUAN_LY", "KHONG_CAN"],
      },
      startAt: { type: ["string", "null"] },
      deadline: { type: ["string", "null"] },
    },
    ["title", "description", "targetType", "targetId", "acceptance"],
  ),
];
