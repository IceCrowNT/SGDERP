import { getSupportTaskCounts } from "@/actions/support-task";
import { TaskCreate } from "@/components/tasks/TaskCreate";
import { TaskNotifications } from "@/components/tasks/TaskNotifications";
import { canTask } from "@/lib/support-task";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { canWorkflow } from "@/lib/role-catalog";
import { db } from "@/lib/db";
import { WORKFLOW_STATUS } from "@/lib/workflow-labels";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronRight, FileClock, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardWorkflowLink } from "@/components/ai/DashboardWorkspace";
import { AiAssistant } from "@/components/ai/AiAssistant";
import { canUseAiChat } from "@/lib/ai-pilot";
import { aiConnectionView } from "@/lib/ai-connection";

const statusTones: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent/10 text-accent dark:text-blue-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};
function recentCutoff() {
  return new Date(Date.now() - 30 * 86400_000);
}
export const metadata = { title: "Bàn làm việc của tôi | SDG ERP" };
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const session = await getSession({ allowPasswordChange: true });
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/profile");
  const taskCounts = canTask(session.taskActions) ? await getSupportTaskCounts() : null;
  const aiSettings = canUseAiChat(session) ? await aiConnectionView(session.companyId) : null;
  const { view, page } = await searchParams;
  const workflow = canWorkflow(session.workflowActions);
  const manage = canWorkflow(session.workflowActions, "MANAGE");
  const person = session.employeeId
    ? await db.nhan_su.findFirst({
        where: {
          id: session.employeeId,
          company_id: session.companyId,
        },
        select: { tinh_trang_lam_viec: true },
      })
    : null;
  const active = person?.tinh_trang_lam_viec === "ACTIVE";
  type Panel = {
    key: string;
    title: string;
    where: Prisma.ho_so_quy_trinhWhereInput;
  };
  const panels: Panel[] = [];
  const own = {
    company_id: session.companyId,
    nguoi_gui_id: session.employeeId ?? -1,
  };
  for (const [key, title, kind, action] of [
    ["approve", "Chờ tôi duyệt", "APPROVAL", "APPROVE"],
    ["execute", "Việc tôi cần thực hiện", "TASK", "EXECUTE"],
  ] as const) {
    if (active && canWorkflow(session.workflowActions, action))
      panels.push({
        key,
        title,
        where: {
          company_id: session.companyId,
          trang_thai: "IN_PROGRESS",
          ...(kind === "APPROVAL"
            ? { nguoi_gui_id: { not: session.employeeId! } }
            : {}),
          danh_sach_buoc: {
            some: {
              nguoi_duoc_giao_id: session.employeeId!,
              trang_thai: "PENDING",
              buoc_mau: { loai_buoc: kind },
            },
          },
        },
      });
  }
  if (workflow && session.employeeId)
    panels.push(
      {
        key: "draft",
        title: "Bản nháp của tôi",
        where: { ...own, trang_thai: "DRAFT" },
      },
      {
        key: "sent",
        title: "Yêu cầu đang xử lý",
        where: { ...own, trang_thai: "IN_PROGRESS" },
      },
      {
        key: "ended",
        title: "Kết quả trong 30 ngày",
        where: {
          ...own,
          trang_thai: { in: ["COMPLETED", "REJECTED", "CANCELLED"] },
          updated_at: { gte: recentCutoff() },
        },
      },
    );
  if (manage)
    panels.push({
      key: "blocked",
      title: "Điều phối · Hồ sơ tạm dừng",
      where: {
        company_id: session.companyId,
        trang_thai: "IN_PROGRESS",
        danh_sach_buoc: { some: { trang_thai: "BLOCKED" } },
      },
    });
  const counts = await Promise.all(
    panels.map((p) => db.ho_so_quy_trinh.count({ where: p.where })),
  );
  const selected = panels.find((p) => p.key === view) ?? panels[0];
  const total = selected ? counts[panels.indexOf(selected)] : 0;
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const pageNumber = Math.min(
    pageCount,
    Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1),
  );
  const records = selected
    ? await db.ho_so_quy_trinh.findMany({
        where: selected.where,
        take: 10,
        skip: (pageNumber - 1) * 10,
        orderBy: [{ updated_at: "desc" }, { id: "desc" }],
        select: {
          id: true,
          ma: true,
          tieu_de: true,
          trang_thai: true,
          updated_at: true,
        },
      })
    : [];
  const dateLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const workflowContent = <section aria-label="Quy trình" className="min-w-0 overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-2 p-4"><h2 className="font-semibold">Quy trình</h2>{workflow && <Button asChild variant="ghost"><Link href="/workflows">Mở quy trình<ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>}</div>
    {panels.length > 0 && <nav aria-label="Nhóm công việc quy trình" className="flex flex-wrap gap-2 border-b px-4 pb-4">{panels.map((p, i) => <Button key={p.key} asChild variant={selected?.key === p.key ? "secondary" : "outline"} className="h-auto min-h-10 whitespace-normal text-left"><DashboardWorkflowLink view={p.key} aria-label={`${p.title} ${counts[i]}`} aria-current={selected?.key === p.key ? "page" : undefined}>{p.title}<span className="ml-1 tabular-nums text-muted-foreground">{counts[i]}</span></DashboardWorkflowLink></Button>)}</nav>}
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b p-5">
                <div><h2 className="text-lg font-semibold">{selected.title}</h2><p className="mt-1 text-xs text-muted-foreground">{records.length} hồ sơ / {total} hồ sơ phù hợp. Trang {pageNumber}/{pageCount}.</p></div>
                <span className="rounded-lg bg-muted p-2 text-muted-foreground"><ListTodo aria-hidden="true" className="size-5" /></span>
              </div>
              {records.length > 0 ? (
                <div role="list" aria-label={selected.title} className="divide-y">
                  <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_6rem_1rem] gap-3 bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground sm:grid"><span>Hồ sơ</span><span>Trạng thái</span><span>Cập nhật</span><span /></div>
                  {records.map((r) => (
                    <div role="listitem" key={r.id}>
                      <Link href={`/workflows/${r.id}`} className="group grid gap-3 px-5 py-4 transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_8rem_6rem_1rem] sm:items-center">
                        <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 hidden rounded-lg border bg-background p-2 text-muted-foreground sm:block"><FileClock aria-hidden="true" className="size-4" /></span><div className="min-w-0"><p className="break-words text-sm font-medium group-hover:text-primary">{r.tieu_de}</p><p className="mt-1 text-xs text-muted-foreground">{r.ma}</p></div></div>
                        <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", statusTones[r.trang_thai] ?? "bg-muted text-muted-foreground")}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{WORKFLOW_STATUS[r.trang_thai] ?? r.trang_thai}</span>
                        <time dateTime={r.updated_at.toISOString()} className="text-xs text-muted-foreground">{dateLabel.format(r.updated_at)}</time>
                        <ChevronRight aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 px-5 py-8">

                  <p className="font-medium">Chưa có hồ sơ trong mục này.</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">Hồ sơ sẽ hiển thị tại đây khi phát sinh công việc phù hợp.</p>
                  <Button asChild variant="outline" className="mt-5"><Link href="/workflows">Mở quy trình<ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
                </div>
              )}
              {pageCount > 1 && (
                <nav aria-label="Phân trang hồ sơ" className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                  <span className="text-xs text-muted-foreground">Trang {pageNumber} / {pageCount}</span><div className="flex gap-2">
                    {pageNumber > 1 && <Button asChild variant="outline"><DashboardWorkflowLink view={selected.key} page={pageNumber - 1}>Trang trước</DashboardWorkflowLink></Button>}
                    {pageNumber < pageCount && <Button asChild variant="outline"><DashboardWorkflowLink view={selected.key} page={pageNumber + 1}>Trang sau</DashboardWorkflowLink></Button>}
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="space-y-3 p-5"><p className="text-sm text-muted-foreground">Chưa có nhóm công việc phù hợp với tài khoản của bạn.</p><Button asChild variant="outline"><Link href="/profile">Hồ sơ của tôi</Link></Button></div>
          )}
        </section>;
  return <div className={cn("flex min-w-0 flex-col gap-3", aiSettings && "h-[calc(100dvh-6rem)] min-h-[34rem] sm:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-8rem)]")}>
    {!aiSettings && <header className="flex shrink-0 items-center justify-between gap-3"><h1 className="text-xl font-semibold">Bàn làm việc</h1><Link href="/profile" className="inline-flex min-h-10 items-center text-sm text-muted-foreground underline-offset-4 hover:underline">Hồ sơ của tôi</Link></header>}
    {canTask(session.taskActions) && <section aria-label="Công việc hỗ trợ" className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-2"><Button asChild variant="ghost"><Link href="/tasks">Công việc của tôi</Link></Button><div className="flex flex-wrap items-center gap-2">{taskCounts?.success && (["receive", "doing", "accept"] as const).map(key => <Button key={key} asChild variant="ghost"><Link href={`/tasks?tab=${key}`}>{{receive:"Cần nhận",doing:"Đang làm",accept:"Chờ nghiệm thu"}[key]} ({taskCounts[key]})</Link></Button>)}<TaskNotifications />{canTask(session.taskActions,"CREATE") && <TaskCreate />}</div></section>}
    {aiSettings ? <AiAssistant settings={{ hasKey: aiSettings.hasKey, model: aiSettings.model, enabled: aiSettings.enabled }} workflow={workflowContent} /> : workflowContent}
  </div>;
}
