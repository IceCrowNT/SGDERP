import { z } from "zod";

export const AiApiKeySchema = z.string().trim().min(20, "API key chưa đầy đủ.").max(4096, "API key quá dài.")
  .regex(/^[\x21-\x7E]+$/, "API key không được chứa khoảng trắng hoặc xuống dòng.");
export const AiModelSchema = z.string().trim().min(1, "Nhập hoặc chọn model.").max(200, "Tên model quá dài.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/, "Tên model có ký tự không hợp lệ.");
const keyInput = z.union([z.literal(""), AiApiKeySchema]);
export const SaveAiSettingsSchema = z.object({
  version: z.string().datetime().nullable(),
  apiKey: keyInput,
  model: AiModelSchema,
  enabled: z.boolean(),
}).strict();
export const TestAiKeySchema = z.object({ version: z.string().datetime().nullable(), apiKey: keyInput }).strict();
export type AiSettingsInput = z.infer<typeof SaveAiSettingsSchema>;
export type AiSettingsView = {
  version: string | null; model: string; enabled: boolean; hasKey: boolean;
  maskedKey: string | null; source: "managed" | "environment" | "none";
};
export class AiConnectionError extends Error {}
