import { AI_LIMITS } from "@/lib/ai-config";
import { SupportTargetSchema, type SupportTarget, SavedSupportDraftSchema, type SavedSupportDraft } from "./ai-support-task";
import { z } from "zod";
import type { AiAttachment } from "./ai-attachments";

export const AiPreferencesSchema = z.object({
  instructions: z.string().trim().max(2000, "Tối đa 2.000 ký tự."),
  version: z.string().datetime(),
}).strict();
export const ChatReferenceSchema = z.object({ kind: z.enum(["assets", "locations", "categories", "departments", "people", "files", "inventoryItems", "inventoryCategories"]), ids: z.array(z.number().int().positive()).max(100) }).strict();
export const ChatTraceSchema = z.object({
  tool: z.string().max(50), filters: z.record(z.union([z.string().max(120), z.number(), z.boolean(), z.null()])),
  references: z.array(ChatReferenceSchema).max(10),
  supportTargets: z.array(SupportTargetSchema).max(20).optional(),
  results: z.array(z.object({ id: z.number().int().positive(), label: z.string().max(160) }).strict()).max(50).optional(),
}).strict();
export const AttachmentTableSchema = z.object({ source: z.string().max(500), columns: z.array(z.string().max(200)).max(257), rows: z.array(z.array(z.union([z.string().max(10000), z.number(), z.null()])).max(257)).max(100), note: z.string().max(2000) }).strict();
// Cache dẫn xuất, ghi bởi server; không nhận từ client và không phải quyền/chứng cứ ERP.
export const ChatMemorySchema = z.object({
  version: z.literal(1), throughId: z.number().int().positive(),
  text: z.string().trim().min(1).max(AI_LIMITS.history.summaryChars),
  createdAt: z.string().datetime(), model: z.string().min(1).max(200),
}).strict();
export type ChatMemory = z.infer<typeof ChatMemorySchema>;
export const ChatMetadataSchema = z.object({
  version: z.literal(1), ngu_canh: z.array(ChatTraceSchema).max(AI_LIMITS.request.maxSteps), workId: z.number().int().positive().optional(),
  supportTaskDraft: SavedSupportDraftSchema.optional(),
  memory: ChatMemorySchema.optional(),
  tables: z.array(AttachmentTableSchema).max(AI_LIMITS.request.maxSteps).optional(), draft: z.boolean().optional(), contextTruncated: z.boolean().optional(),
}).strict();
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type ChatTrace = z.infer<typeof ChatTraceSchema>;
export type ChatMessage = { supportTargets?: SupportTarget[]; supportTaskDraft?: SavedSupportDraft; attachments?: AiAttachment[]; tables?: z.infer<typeof AttachmentTableSchema>[]; id: number; role: "user" | "assistant"; content: string; status: string; requestId: string; createdAt: string; workId?: number; draft?: boolean; contextTruncated?: boolean; resultLists?: { label: string; items: string[] }[] };
export type ChatSummary = { id: number; title: string; archived: boolean; updatedAt: string };
export const ChatListCursorSchema = z.object({ id: z.number().int().positive(), updatedAt: z.string().datetime() }).strict();
export type ChatListCursor = z.infer<typeof ChatListCursorSchema>;

/** Stable title from the first user message; no extra model call or HTML rendering. */
export function chatTitle(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  return chars.length > 80 ? chars.slice(0, 79).join("") + "…" : text || "Cuộc trò chuyện";
}

export const RenameChatSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1, "Nhập tên cuộc trò chuyện.").max(80, "Tên tối đa 80 ký tự."),
  expectedTitle: z.string().max(80),
}).strict();
