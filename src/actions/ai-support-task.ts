"use server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTask } from "@/lib/support-task";
import {
  taskActor,
  validateTaskCreation,
  TaskError,
} from "@/lib/support-task-access";
import { getTaskOptions } from "./support-task";
import { matchesSupportTarget } from "@/lib/support-target-search";
import {
  SupportTargetLookupSchema,
  SupportTicketDraftSchema,
  supportDraft,
  type AiSupportDraft,
  type SupportTarget,
} from "@/lib/ai-support-task";
import type { ChatTrace } from "@/lib/ai-chat";
export async function executeAiSupportTaskTool(
  name: string,
  input: unknown,
  requestId: string,
): Promise<{ output: unknown; trace: ChatTrace; draft?: AiSupportDraft }> {
  const s = await getSession(),
    trace: ChatTrace = { tool: name, filters: {}, references: [] };
  const fail = (error: string) => ({ output: { error }, trace });
  if (!s || !canTask(s.taskActions, "CREATE"))
    return fail("Bạn cần quyền Xem và Tạo yêu cầu Công việc.");
  if (name !== "lookup_support_targets" && name !== "prepare_support_ticket")
    return fail("Công cụ không hợp lệ.");
  try {
    if (name === "lookup_support_targets") {
      const v = SupportTargetLookupSchema.parse(input),
        r = await getTaskOptions();
      if (!r.success) return fail(r.message);
      const people = r.people.map(p => ({ id: p.id, kind: "people" as const, name: p.name, code: p.code, position: p.position, department: p.department, departmentCode: p.departmentCode, canReceive: p.canReceive, unavailableReason: p.unavailableReason }));
      const departments = r.departments.map(d => ({ id: d.id, kind: "departments" as const, name: d.name, code: d.code, position: "", department: "", canReceive: d.canReceive, unavailableReason: d.unavailableReason }));
      let matched = [...(v.kind !== "departments" ? people : []), ...(v.kind !== "people" ? departments : [])].filter(x => matchesSupportTarget(x, v.search));
      const fallbackToPeople = v.kind === "departments" && v.search.length > 0 && matched.length === 0;
      if (fallbackToPeople) matched = people.filter(x => matchesSupportTarget(x, v.search));
      matched.sort((a, b) => Number(b.canReceive) - Number(a.canReceive) || a.name.localeCompare(b.name, "vi") || a.kind.localeCompare(b.kind) || a.id - b.id);
      const rows: SupportTarget[] = matched.slice((v.page - 1) * 20, v.page * 20).map(x => ({ id: x.id, kind: x.kind, name: x.name, code: x.code, position: x.position, department: x.department, canReceive: x.canReceive, unavailableReason: x.unavailableReason }));
      trace.filters = { kind: v.kind, search: v.search, page: v.page };
      trace.references = (["people", "departments"] as const).map(kind => ({ kind, ids: rows.filter(r => r.kind === kind).map(r => r.id) }));
      trace.supportTargets = rows;
      const nextPage = v.page * 20 < matched.length ? v.page + 1 : null;
      return { output: { rows, total: matched.length, hasMore: nextPage !== null, nextPage, fallbackToPeople }, trace };
    }
    const v = SupportTicketDraftSchema.parse(input);
    z.string().uuid().parse(requestId);
    await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s, "CREATE");
      await validateTaskCreation(tx, a, v);
    });
    trace.references = [
      {
        kind: v.targetType === "CA_NHAN" ? "people" : "departments",
        ids: [v.targetId],
      },
    ];
    return {
      output: { prepared: true, saved: false },
      trace,
      draft: supportDraft({ requestId, values: v }),
    };
  } catch (e) {
    if (e instanceof z.ZodError)
      return fail(
        "Thông tin ticket chưa hợp lệ. Kiểm tra người/phòng, nội dung, nghiệm thu và ngày giờ.",
      );
    if (e instanceof TaskError) return fail(e.message);
    return fail("Chưa chuẩn bị được yêu cầu hỗ trợ. Vui lòng thử lại.");
  }
}
