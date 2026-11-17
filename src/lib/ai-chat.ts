import { z } from "zod";

export const AiPreferencesSchema = z.object({
  instructions: z.string().trim().max(2000, "Tối đa 2.000 ký tự."),
  version: z.string().datetime(),
}).strict();
export const ChatReferenceSchema = z.object({ kind: z.enum(["assets", "locations", "categories", "departments", "people"]), ids: z.array(z.number().int().positive()).max(100) }).strict();
export const ChatTraceSchema = z.object({
  tool: z.string().max(50), filters: z.record(z.union([z.string().max(120), z.number(), z.boolean(), z.null()])),
  references: z.array(ChatReferenceSchema).max(10),
  results: z.array(z.object({ id: z.number().int().positive(), label: z.string().max(160) }).strict()).max(50).optional(),
}).strict();
export const ChatMetadataSchema = z.object({
  version: z.literal(1), ngu_canh: z.array(ChatTraceSchema).max(6), workId: z.number().int().positive().optional(),
  draft: z.boolean().optional(), contextTruncated: z.boolean().optional(),
}).strict();
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;
export type ChatTrace = z.infer<typeof ChatTraceSchema>;
export type ChatMessage = { id: number; role: "user" | "assistant"; content: string; status: string; requestId: string; createdAt: string; workId?: number; draft?: boolean; contextTruncated?: boolean; resultLists?: { label: string; items: string[] }[] };
export type ChatSummary = { id: number; title: string; archived: boolean; updatedAt: string };
