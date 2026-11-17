import { z } from "zod";
import { AiModelSchema } from "./ai-settings";

export const AI_JOBS = ["GENERAL", "LOOKUP", "DRAFT"] as const;
export type AiJob = (typeof AI_JOBS)[number];
export const AI_JOB_LABELS: Record<AiJob, string> = { GENERAL: "Trợ lý tổng hợp", LOOKUP: "Tra cứu tài sản / vị trí", DRAFT: "Soạn hồ sơ và công việc" };
export const AiJobSchema = z.enum(AI_JOBS);
export const UsdSchema = z.string().trim().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/, "Nhập số USD không âm, tối đa 6 số thập phân.");
export const AiPricesSchema = z.object({ version: z.literal(1), model: AiModelSchema, input: UsdSchema, cached: UsdSchema, output: UsdSchema }).strict()
  .refine(v => Number(v.cached) <= Number(v.input), { path: ["cached"], message: "Giá cache không được lớn hơn giá đầu vào." });
export type AiPrices = z.infer<typeof AiPricesSchema>;
export const SaveAiPolicySchema = z.object({ id: z.number().int().positive(), version: z.string().datetime(), limit: UsdSchema.nullable(), prices: AiPricesSchema.nullable() }).strict();
export const SaveAiJobSchema = z.object({ job: AiJobSchema, version: z.string().datetime().nullable(), connectionId: z.number().int().positive().nullable(), model: AiModelSchema.nullable(), prices: AiPricesSchema.nullable() }).strict()
  .refine(v => v.prices ? v.prices.model === v.model : true, { path: ["model"], message: "Model riêng cần bảng giá cùng model; dùng mặc định thì kế thừa bảng giá." });
export const SaveAiLimitSchema = z.object({ accountId: z.number().int().positive(), version: z.string().datetime(), limit: UsdSchema.nullable() }).strict();
export const AiUsageFilterSchema = z.object({ month: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/), accountId: z.number().int().positive().optional(), connectionId: z.number().int().positive().optional(), model: AiModelSchema.optional(), page: z.number().int().min(1).max(10000).default(1) }).strict();
export const ReconcileAiCallSchema = z.object({ id: z.number().int().positive(), cost: UsdSchema, reason: z.string().trim().min(10, "Nêu căn cứ đối chiếu, tối thiểu 10 ký tự.").max(1000) }).strict();
export type AiPolicyInput = z.infer<typeof SaveAiPolicySchema>;
export type AiJobInput = z.infer<typeof SaveAiJobSchema>;
export type AiLimitInput = z.infer<typeof SaveAiLimitSchema>;
export type AiUsageFilter = z.infer<typeof AiUsageFilterSchema>;

export function aiMonth(now = new Date()) { return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 7); }
export function aiMonthBounds(month: string) {
  const [year, value] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(year, value - 1, 1) - 7 * 3600000), lt: new Date(Date.UTC(year, value, 1) - 7 * 3600000) };
}
