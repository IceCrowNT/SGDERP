import { z } from "zod";

export const AiApiKeySchema = z.string().trim().min(20, "API key chưa đầy đủ.").max(4096, "API key quá dài.")
  .regex(/^[\x21-\x7E]+$/, "API key không được chứa khoảng trắng hoặc xuống dòng.");
export const AiModelSchema = z.string().trim().min(1, "Nhập hoặc chọn model.").max(200, "Tên model quá dài.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/, "Tên model có ký tự không hợp lệ.");
const keyInput = z.union([z.literal(""), AiApiKeySchema]);
export const AiConnectionTargetSchema = z.union([z.number().int().positive(), z.literal("new"), z.literal("environment")]);
export type AiConnectionTarget = z.infer<typeof AiConnectionTargetSchema>;
export const SaveAiSettingsSchema = z.object({
  target: AiConnectionTargetSchema,
  name: z.string().trim().min(1, "Nhập tên kết nối.").max(100, "Tên tối đa 100 ký tự."),
  version: z.string().datetime().nullable(),
  apiKey: keyInput,
  model: AiModelSchema,
  enabled: z.boolean(),
}).strict();
export const TestAiKeySchema = z.object({ target: AiConnectionTargetSchema, version: z.string().datetime().nullable(), apiKey: keyInput }).strict();
export const SetDefaultAiConnectionSchema = z.object({ id: z.number().int().positive(), version: z.string().datetime(), expectedDefault: z.string().max(100) }).strict();
export type AiSettingsInput = z.infer<typeof SaveAiSettingsSchema>;
export type AiSettingsView = {
  target: AiConnectionTarget; name: string; isDefault: boolean;
  version: string | null; model: string; enabled: boolean; hasKey: boolean;
  maskedKey: string | null; source: "managed" | "environment" | "none";
};
export type AiConnectionsView = { connections: AiSettingsView[]; defaultStamp: string };
export const emptyAiSettings: AiSettingsView = { target: "new", name: "", isDefault: false, version: null, model: "", enabled: true, hasKey: false, maskedKey: null, source: "none" };
export class AiConnectionError extends Error {}
