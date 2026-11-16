"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { AI_PILOT_INSTRUCTIONS, AiChatSchema, canUseAiPilot } from "@/lib/ai-pilot";
import { readAiConnection } from "@/lib/ai-connection";
import { AiConnectionError } from "@/lib/validations/ai-settings";
import { AI_PILOT_TOOLS, AssetDraftSchema, AssetSearchSchema, LocationDraftSchema, LookupSchema, type AiChange, type AiDraft } from "@/lib/ai-pilot-tools";
import { getAsset, getAssetCategories, getAssetAssignmentOptions } from "@/actions/asset";
import { assetFormValues } from "@/components/assets/asset-form-values";
import { SaveAssetSchema } from "@/lib/validations/asset";
import { LocationFormSchema, LOCATION_TYPES } from "@/lib/validations/location";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { descendantIds, locationPath } from "@/lib/location-tree";

class AiError extends Error {}
const denied = "Tài khoản này chưa được mở trợ lý AI hoặc quyền đã thay đổi.";
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

async function actor(expected?: SessionUser) {
  const session = await getSession();
  if (!session || !canUseAiPilot(session) || (expected &&
    (expected.userId !== session.userId || expected.companyId !== session.companyId || expected.sessionVersion !== session.sessionVersion))) throw new AiError(denied);
  return session;
}

function auditData(session: SessionUser, requestId: string, action: string, data: Prisma.InputJsonObject = {}) {
  return {
    company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username,
    ho_ten: session.fullName, phan_he: "AI", hanh_dong: action, doi_tuong_id: `ai:${requestId}`,
    mo_ta: "Trợ lý AI: metadata vận hành", du_lieu_moi: data,
  };
}

async function admit(session: SessionUser, requestId: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
    const current = await currentActor(tx, session, "ROLES");
    if (!canUseAiPilot({ ...session, permissions: current.permissions })) throw new AiError(denied);
    const where = { company_id: session.companyId, account_id: session.userId, phan_he: "AI" };
    if (await tx.nhat_ky_hoat_dong.count({ where: { ...where, doi_tuong_id: `ai:${requestId}`, hanh_dong: "AI_REQUEST" } }))
      throw new AiError("Yêu cầu này đã được nhận. Không tự gọi lại để tránh tính phí lặp; nếu chưa có phản hồi, hãy gửi yêu cầu mới.");
    const now = Date.now();
    const [recent, day] = await Promise.all([
      tx.nhat_ky_hoat_dong.findMany({ where: { ...where, created_at: { gte: new Date(now - 300_000) }, hanh_dong: { in: ["AI_REQUEST", "AI_DONE"] } }, select: { hanh_dong: true, doi_tuong_id: true, created_at: true } }),
      tx.nhat_ky_hoat_dong.count({ where: { ...where, hanh_dong: "AI_REQUEST", created_at: { gte: new Date(now - 86400_000) } } }),
    ]);
    const starts = recent.filter(r => r.hanh_dong === "AI_REQUEST");
    if (starts.length >= 10 || day >= 100) throw new AiError("Đã đến giới hạn lượt thử AI. Hãy thử lại sau.");
    if (starts.some(r => r.created_at.getTime() > now - 180_000 && !recent.some(end => end.hanh_dong === "AI_DONE" && end.doi_tuong_id === r.doi_tuong_id)))
      throw new AiError("Một yêu cầu AI đang xử lý. Hãy chờ hoàn tất trước khi gửi tiếp.");
    await tx.nhat_ky_hoat_dong.create({ data: auditData(session, requestId, "AI_REQUEST") });
  });
}

async function locations(session: SessionUser) {
  const rows = await db.vi_tri.findMany({ where: { company_id: session.companyId },
    select: { id: true, ma_vi_tri: true, ten_vi_tri: true, loai_vi_tri: true, parent_id: true, mo_ta: true, dang_su_dung: true, updated_at: true }, orderBy: [{ ten_vi_tri: "asc" }, { id: "asc" }] });
  return rows.map(({ updated_at, ...row }) => ({ ...row, version: updated_at.toISOString() }));
}

const fieldLabels: Record<string, string> = {
  name: "Tên", categoryId: "Loại tài sản", condition: "Tình trạng", usage: "Hình thức sử dụng",
  departmentId: "Phòng quản lý", employeeId: "Người sử dụng", locationId: "Vị trí", serial: "Serial",
  model: "Hãng / Model", notes: "Ghi chú", purchaseDate: "Ngày mua", purchasePrice: "Giá mua (VND)",
  depreciationMonths: "Thời gian khấu hao (tháng)", warrantyUntil: "Hạn bảo hành",
  type: "Loại vị trí", parentId: "Vị trí cấp trên", description: "Mô tả", active: "Đang sử dụng",
};
function changes(before: Record<string, unknown>, after: Record<string, unknown>, keys: string[], format: (key: string, value: unknown) => string): AiChange[] {
  return keys.filter(k => before[k] !== after[k]).map(k => ({ label: fieldLabels[k] ?? k, before: format(k, before[k]), after: format(k, after[k]) }));
}
function display(value: unknown) { return value === null || value === undefined || value === "" ? "Chưa có" : typeof value === "boolean" ? value ? "Có" : "Không" : String(value); }

async function executeTool(session: SessionUser, name: string, input: unknown): Promise<{ output: unknown; draft?: AiDraft }> {
  await actor(session);
  if (name === "lookup") {
    const { kind, search } = LookupSchema.parse(input);
    let rows: { id: number; name: string; [key: string]: unknown }[];
    if (kind === "locations") {
      const list = await locations(session);
      rows = list.map(r => ({ id: r.id, name: locationPath(r.id, list), type: r.loai_vi_tri, active: r.dang_su_dung, parentId: r.parent_id }));
    } else if (kind === "categories") {
      const result = await getAssetCategories(); if (!result.success) throw new AiError(result.message);
      rows = result.rows.map(r => ({ id: r.id, name: r.ten_loai, code: r.ma_loai, active: r.dang_su_dung }));
    } else {
      const result = await getAssetAssignmentOptions(); if (!result.success) throw new AiError(result.message);
      rows = kind === "departments" ? result.departments.map(r => ({ id: r.id, name: r.ten_phong_ban, code: r.ma_phong_ban }))
        : result.employees.map(r => ({ id: r.id, name: r.ho_ten, code: r.ma_nhan_su }));
    }
    const terms = normalize(search).split(/\s+/).filter(Boolean);
    const matched = rows.filter(r => terms.every(t => normalize(`${r.name} ${r.code ?? ""}`).includes(t)));
    return { output: { rows: matched.slice(0, 50), total: matched.length, truncated: matched.length > 50 } };
  }
  if (name === "get_asset") {
    const v = z.object({ id: z.number().int().positive() }).strict().parse(input);
    const result = await getAsset(v.id);
    return { output: result.success ? { row: result.row } : { error: result.message } };
  }
  if (name === "search_assets") {
    const v = AssetSearchSchema.parse(input);
    const list = v.locationId ? await locations(session) : [];
    if (v.locationId && !list.some(r => r.id === v.locationId)) return { output: { error: "Không tìm thấy vị trí trong công ty." } };
    const where: Prisma.tai_sanWhereInput = {
      company_id: session.companyId, loai_tai_san_id: v.categoryId, phong_quan_ly_id: v.departmentId,
      vi_tri_id: v.locationId ? { in: [...descendantIds(v.locationId, list)] } : undefined,
      ...(v.search ? { OR: ["ten_tai_san", "ma_tai_san", "hang_model", "so_serial"].map(field => ({ [field]: { contains: v.search, mode: "insensitive" } })) } : {}),
    };
    const [rows, total] = await Promise.all([
      db.tai_san.findMany({ where, select: { id: true, ma_tai_san: true, ten_tai_san: true, hang_model: true, tinh_trang: true, hinh_thuc_su_dung: true, vi_tri: { select: { ten_vi_tri: true } }, phong_quan_ly: { select: { ten_phong_ban: true } } }, orderBy: { id: "asc" }, take: 20, skip: (v.page - 1) * 20 }),
      db.tai_san.count({ where }),
    ]);
    return { output: { rows, total, page: v.page, pageSize: 20 } };
  }
  if (name === "prepare_asset") {
    const v = AssetDraftSchema.parse(input);
    const existing = v.assetId ? await getAsset(v.assetId) : null;
    if (existing && !existing.success) return { output: { error: existing.message } };
    const row = existing?.success ? existing.row : null;
    const before = row ? assetFormValues(row) : {};
    const parsed = SaveAssetSchema.safeParse({ ...before, ...v.changes });
    if (!parsed.success) return { output: { error: "Chưa đủ hoặc sai thông tin cho bản nháp.", fields: parsed.error.flatten().fieldErrors } };
    const values = parsed.data;
    const [categoryResult, assignmentResult, list] = await Promise.all([getAssetCategories(), getAssetAssignmentOptions(), locations(session)]);
    if (!categoryResult.success || !assignmentResult.success) throw new AiError("Không đọc được danh mục hiện hành.");
    const maps: Record<string, Map<number, string>> = {
      categoryId: new Map(categoryResult.rows.map(r => [r.id, r.ten_loai])),
      employeeId: new Map(assignmentResult.employees.map(r => [r.id, r.ho_ten])),
      departmentId: new Map(assignmentResult.departments.map(r => [r.id, r.ten_phong_ban])),
      locationId: new Map(list.map(r => [r.id, locationPath(r.id, list)])),
    };
    if (row?.nguoi_su_dung) maps.employeeId.set(row.nguoi_su_dung.id, row.nguoi_su_dung.ho_ten);
    for (const key of ["categoryId", "employeeId", "departmentId", "locationId"] as const) {
      if (values[key] != null && !maps[key].has(values[key])) return { output: { error: `Danh mục ${fieldLabels[key]} không hợp lệ. Hãy tra lại.` } };
    }
    const format = (key: string, value: unknown) => {
      if (value == null || value === "") return display(value);
      if (maps[key]) return maps[key].get(Number(value)) ?? "Không còn trong danh mục";
      if (key === "condition") return ASSET_CONDITIONS[value as keyof typeof ASSET_CONDITIONS];
      if (key === "usage") return ASSET_USAGES[value as keyof typeof ASSET_USAGES];
      return display(value);
    };
    return { output: { prepared: true, saved: false }, draft: { kind: "asset", row, values, categories: categoryResult.rows,
      changes: changes(before, values, Object.keys(v.changes), format) } };
  }
  if (name === "prepare_location") {
    const v = LocationDraftSchema.parse(input), rows = await locations(session);
    const row = v.locationId ? rows.find(r => r.id === v.locationId) ?? null : null;
    if (v.locationId && !row) return { output: { error: "Không tìm thấy vị trí trong công ty." } };
    const before = row ? { name: row.ten_vi_tri, type: row.loai_vi_tri, description: row.mo_ta ?? "", parentId: row.parent_id, active: row.dang_su_dung }
      : { description: "", parentId: null, active: true };
    const parsed = LocationFormSchema.safeParse({ ...before, ...v.changes });
    if (!parsed.success) return { output: { error: "Chưa đủ hoặc sai thông tin vị trí.", fields: parsed.error.flatten().fieldErrors } };
    const values = parsed.data;
    if (values.parentId !== null && (!rows.some(r => r.id === values.parentId) || (row && descendantIds(row.id, rows).has(values.parentId))))
      return { output: { error: "Vị trí cấp trên không hợp lệ." } };
    const format = (key: string, value: unknown) => key === "parentId" ? value == null ? "Vị trí gốc" : locationPath(Number(value), rows)
      : key === "type" && value ? LOCATION_TYPES[value as keyof typeof LOCATION_TYPES] : display(value);
    return { output: { prepared: true, saved: false }, draft: { kind: "location", row, rows, values,
      changes: changes(before, values, Object.keys(v.changes), format) } };
  }
  return { output: { error: "Công cụ không được hỗ trợ." } };
}

const responseSchema = z.object({
  id: z.string().optional(), status: z.string(),
  output: z.array(z.object({ type: z.string() }).passthrough()),
  usage: z.object({ input_tokens: z.number().nonnegative(), output_tokens: z.number().nonnegative(),
    input_tokens_details: z.object({ cached_tokens: z.number().nonnegative().optional() }).optional() }).nullable().optional(),
});
const callSchema = z.object({ type: z.literal("function_call"), name: z.string(), arguments: z.string().max(24000), call_id: z.string() });

export async function askAi(input: unknown) {
  let admitted: { session: SessionUser; requestId: string } | null = null;
  try {
    const session = await actor();
    const connection = await readAiConnection(session.companyId);
    const parsed = AiChatSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Yêu cầu không hợp lệ." };
    const { requestId, message, history } = parsed.data;
    await admit(session, requestId); admitted = { session, requestId };
    const model = connection.model;
    const context: unknown[] = [...history, { role: "user", content: message }];
    const started = Date.now();
    let inputTokens = 0, outputTokens = 0;
    for (let step = 0; step < 6; step++) {
      await actor(session);
      if ((await readAiConnection(session.companyId)).stamp !== connection.stamp)
        throw new AiError("Cài đặt AI đã thay đổi. Hãy gửi lại yêu cầu để dùng cấu hình mới.");
      if (Date.now() - started > 140_000) throw new AiError("Lượt xử lý đã quá lâu. Hãy thu hẹp yêu cầu rồi thử lại.");
      if (Buffer.byteLength(JSON.stringify(context), "utf8") > 64000) throw new AiError("Ngữ cảnh quá dài. Hãy thu hẹp yêu cầu hoặc mở cuộc chat mới.");
      await db.nhat_ky_hoat_dong.create({ data: auditData(session, requestId, "AI_API_START", { step, model, source: connection.source, connectionId: connection.connectionId, keyVersion: connection.keyVersion }) });
      let response: Response;
      try {
        response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST", headers: { Authorization: `Bearer ${connection.apiKey}`, "Content-Type": "application/json" },
          cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ model, instructions: AI_PILOT_INSTRUCTIONS, input: context,
            tools: AI_PILOT_TOOLS, parallel_tool_calls: false, max_output_tokens: 2000, store: false,
            include: ["reasoning.encrypted_content"] }),
        });
      } catch {
        await db.nhat_ky_hoat_dong.create({ data: auditData(session, requestId, "AI_API_ERROR", { step, model, status: "unknown" }) });
        throw new AiError("Kết nối AI bị gián đoạn; lượt này có thể đã phát sinh phí. Chưa có hồ sơ nào được lưu. Bạn có thể gửi lại yêu cầu.");
      }
      if (!response.ok) {
        await db.nhat_ky_hoat_dong.create({ data: auditData(session, requestId, "AI_API_ERROR", { step, model, httpStatus: response.status, status: "unknown" }) });
        throw new AiError(response.status === 401 || response.status === 403 ? "Khóa API hoặc quyền truy cập model chưa hợp lệ. Kiểm tra cấu hình trên máy chủ."
          : response.status === 429 ? "Dịch vụ AI đang giới hạn lượt gọi hoặc đã hết hạn mức. Kiểm tra tài khoản API rồi thử lại."
          : "Dịch vụ AI chưa xử lý được yêu cầu. Kiểm tra model hoặc thử lại sau.");
      }
      const raw = responseSchema.safeParse(await response.json());
      if (!raw.success) throw new AiError("Phản hồi AI không hợp lệ. Chưa có hồ sơ nào được lưu.");
      const result = raw.data;
      await db.nhat_ky_hoat_dong.create({ data: auditData(session, requestId, "AI_API_USAGE", {
        step, model, responseId: result.id ?? null, status: result.status,
        inputTokens: result.usage?.input_tokens ?? null, outputTokens: result.usage?.output_tokens ?? null,
        cachedInputTokens: result.usage?.input_tokens_details?.cached_tokens ?? null,
      }) });
      inputTokens += result.usage?.input_tokens ?? 0; outputTokens += result.usage?.output_tokens ?? 0;
      await actor(session);
      if (result.status !== "completed") throw new AiError("AI chưa hoàn tất câu trả lời trong giới hạn lượt thử. Hãy chia nhỏ yêu cầu.");
      const calls = result.output.filter(item => item.type === "function_call");
      if (calls.length > 1) throw new AiError("AI trả nhiều công cụ cùng lúc. Hãy thử lại với một yêu cầu cụ thể.");
      if (!calls.length) {
        const text = result.output.filter(item => item.type === "message").flatMap(item => {
          const content = z.array(z.object({ type: z.string(), text: z.string().optional(), refusal: z.string().optional() })).safeParse(item.content);
          return content.success ? content.data.map(c => c.type === "output_text" ? c.text ?? "" : c.refusal ?? "") : [];
        }).join("\n").slice(0, 8000);
        if (!text.trim()) throw new AiError("AI chưa trả được nội dung. Hãy diễn đạt lại yêu cầu.");
        return { success: true as const, text, draft: null, usage: { inputTokens, outputTokens } };
      }
      const call = callSchema.parse(calls[0]);
      let tool: { output: unknown; draft?: AiDraft };
      try { tool = await executeTool(session, call.name, JSON.parse(call.arguments)); }
      catch (error) {
        if (error instanceof z.ZodError || error instanceof SyntaxError) tool = { output: { error: "Tham số công cụ chưa hợp lệ. Kiểm tra kiểu dữ liệu và các trường được phép." } };
        else throw error;
      }
      await actor(session);
      if (tool.draft) return { success: true as const, text: "Đã chuẩn bị bản nháp. Bạn kiểm tra nội dung và bấm Lưu để cập nhật hồ sơ.", draft: tool.draft, usage: { inputTokens, outputTokens } };
      context.push(...result.output, { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(tool.output) });
    }
    throw new AiError("Đã đến giới hạn tra cứu của lượt này. Hãy nêu rõ một hồ sơ hoặc chia nhỏ yêu cầu.");
  } catch (error) {
    return { success: false as const, message: error instanceof AiError || error instanceof AiConnectionError ? error.message : "Chưa xử lý được yêu cầu AI. Kiểm tra quyền hoặc thử lại sau." };
  } finally {
    if (admitted) {
      // Preserve the request lease on audit failure; a subsequent request remains blocked until expiry.
      await db.nhat_ky_hoat_dong.create({ data: auditData(admitted.session, admitted.requestId, "AI_DONE") }).catch(() => undefined);
    }
  }
}
