import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getSession, hasPermission } from "@/lib/auth";
import { canWorkflow } from "@/lib/role-catalog";
import { db } from "@/lib/db";
import { WORKFLOW_STATUS } from "@/lib/workflow-labels";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDown, ArrowUpRight, Building2, CalendarDays, CheckCheck, ChevronRight, ClipboardCheck, FileClock, FilePenLine, FolderKanban, Inbox, KeyRound, LayoutGrid, ListTodo, PauseCircle, ShieldCheck, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const panelVisuals: Record<string, { icon: LucideIcon; tone: string }> = {
  approve: { icon: ClipboardCheck, tone: "bg-primary/10 text-primary" },
  execute: { icon: ListTodo, tone: "bg-accent/10 text-accent dark:text-blue-300" },
  draft: { icon: FilePenLine, tone: "bg-muted text-muted-foreground" },
  sent: { icon: FileClock, tone: "bg-accent/10 text-accent dark:text-blue-300" },
  ended: { icon: CheckCheck, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  blocked: { icon: PauseCircle, tone: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
};
const statusTones: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent/10 text-accent dark:text-blue-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};
function DeskIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto flex h-40 w-56 items-center justify-center">
      <div className="absolute size-36 rounded-full bg-accent/5 ring-8 ring-accent/5" />
      <div className="relative w-36 -rotate-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><UserRound className="size-5" /></span><div className="space-y-2"><div className="h-2 w-12 rounded bg-muted" /><div className="h-1.5 w-8 rounded bg-muted" /></div></div>
        <div className="space-y-2"><div className="h-2 w-full rounded bg-muted" /><div className="h-2 w-3/4 rounded bg-muted" /></div>
      </div>
      <span className="absolute bottom-3 right-3 rotate-6 rounded-xl border bg-card p-3 text-accent shadow-sm dark:text-blue-300"><ShieldCheck className="size-7" /></span>
    </div>
  );
}
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
  const shortcuts = [
    { href: "/profile", label: "Hồ sơ của tôi", detail: "Thông tin & bảo mật", icon: UserRound, allowed: true },
    { href: "/workflows", label: "Quy trình và yêu cầu", detail: "Gửi & theo dõi hồ sơ", icon: FolderKanban, allowed: workflow },
    { href: "/employees", label: "Nhân sự", detail: "Tra cứu hồ sơ", icon: UsersRound, allowed: hasPermission(session, "HR") },
    { href: "/departments", label: "Phòng ban", detail: "Cơ cấu tổ chức", icon: Building2, allowed: hasPermission(session, "HR") },
    { href: "/accounts", label: "Tài khoản", detail: "Quản lý truy cập", icon: KeyRound, allowed: hasPermission(session, "ACCOUNTS", "MANAGE") },
    { href: "/roles", label: "Vai trò và quyền", detail: "Cấu hình phân quyền", icon: ShieldCheck, allowed: hasPermission(session, "ROLES") },
  ].filter((s) => s.allowed);
  const ownPanels = panels.filter((p) => ["draft", "sent", "ended"].includes(p.key));
  const maxOwnCount = Math.max(1, ...ownPanels.map((p) => counts[panels.indexOf(p)]));
  const dateLabel = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/10 via-card to-primary/5 p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full border-[32px] border-accent/5" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Avatar className="size-16 shrink-0 border-4 border-card shadow-sm">
            <AvatarImage src={session.avatarUrl ?? undefined} alt={session.fullName} />
            <AvatarFallback className="bg-accent text-accent-foreground text-xl">{session.fullName.split(" ").slice(-2).map((n) => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bàn làm việc của tôi</p>
            <h1 className="break-words text-xl font-bold sm:text-2xl">Xin chào, {session.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{[session.position, session.departmentName].filter(Boolean).join(" · ") || "Tài khoản nội bộ"}</p>
          </div>
          <div className="flex w-full items-center gap-2 text-xs text-muted-foreground sm:w-auto sm:rounded-full sm:border sm:border-border/50 sm:bg-card/80 sm:px-3 sm:py-2"><CalendarDays aria-hidden="true" className="size-4" />{dateLabel.format(new Date())}</div>
        </div>
      </header>
      {panels.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tổng quan công việc">
          {panels.map((p, i) => {
            const { icon: Icon, tone } = panelVisuals[p.key];
            return (
              <Link key={p.key} href={`/?view=${p.key}`} aria-label={`${p.title} ${counts[i]}`} aria-current={selected?.key === p.key ? "page" : undefined}
                className={cn("group relative flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected?.key === p.key && "border-primary/50 ring-1 ring-primary/20")}>
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tone)}><Icon aria-hidden="true" className="size-6" /></span>
                <div className="min-w-0 flex-1"><h2 className="text-sm text-muted-foreground">{p.title}</h2><p className="mt-1 text-3xl font-semibold tabular-nums">{counts[i]}</p></div>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-primary" />
              </Link>
            );
          })}
        </section>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-2xl border bg-card xl:col-span-2">
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
                <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                  <div aria-hidden="true" className="relative mb-5 rounded-full bg-muted/70 p-6"><Inbox className="size-10 text-muted-foreground" /><span className="absolute -right-1 bottom-0 rounded-full border-4 border-card bg-accent/10 p-2 text-accent dark:text-blue-300"><CheckCheck className="size-4" /></span></div>
                  <p className="font-medium">Chưa có hồ sơ trong mục này.</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">Hồ sơ sẽ hiển thị tại đây khi phát sinh công việc phù hợp.</p>
                  <Button asChild variant="outline" className="mt-5"><Link href="/workflows">Mở quy trình<ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button>
                </div>
              )}
              {pageCount > 1 && (
                <nav aria-label="Phân trang hồ sơ" className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                  <span className="text-xs text-muted-foreground">Trang {pageNumber} / {pageCount}</span><div className="flex gap-2">
                    {pageNumber > 1 && <Button asChild variant="outline"><Link href={`/?view=${selected.key}&page=${pageNumber - 1}`}>Trang trước</Link></Button>}
                    {pageNumber < pageCount && <Button asChild variant="outline"><Link href={`/?view=${selected.key}&page=${pageNumber + 1}`}>Trang sau</Link></Button>}
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="grid items-center gap-4 p-6 sm:grid-cols-[auto_1fr] sm:py-10">
              <DeskIllustration />
              <div className="min-w-0"><h2 className="text-xl font-semibold">Không gian cá nhân của bạn</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cập nhật hồ sơ, thông tin liên hệ và bảo mật tài khoản tại một nơi.</p><Button asChild className="mt-5"><Link href="/profile">Mở hồ sơ cá nhân<ArrowUpRight aria-hidden="true" className="size-4" /></Link></Button></div>
              <div className="flex flex-wrap justify-center gap-3 border-t pt-5 text-xs text-muted-foreground sm:col-span-2">{[{ icon: UserRound, label: "Hồ sơ" }, { icon: KeyRound, label: "Mật khẩu" }, { icon: ShieldCheck, label: "Bảo mật" }].map(({ icon: Icon, label }) => <span key={label} className="flex items-center gap-2 rounded-full bg-muted/70 px-3 py-2"><Icon aria-hidden="true" className="size-4" />{label}</span>)}</div>
            </div>
          )}
        </section>
        <aside className="min-w-0 space-y-6">
          {ownPanels.length > 0 && (
            <section className="rounded-2xl border bg-card p-5" aria-label="Biểu đồ yêu cầu của tôi">
              <h2 className="font-semibold">Yêu cầu của tôi</h2>
              <p className="mt-1 text-xs text-muted-foreground">Số hồ sơ theo từng nhóm</p>
              <div className="mt-5 space-y-4">
                {ownPanels.map((p) => {
                  const count = counts[panels.indexOf(p)];
                  const { icon: Icon, tone } = panelVisuals[p.key];
                  return <Link key={p.key} href={`/?view=${p.key}`} className="block rounded-lg p-1 transition-all duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2"><Icon aria-hidden="true" className="size-4 text-muted-foreground" />{p.title}</span><strong className="tabular-nums">{count}</strong></div><svg aria-hidden="true" viewBox="0 0 240 8" preserveAspectRatio="none" className={cn("h-2 w-full rounded-full", tone)}><rect width="240" height="8" rx="4" className="fill-muted" /><rect width={240 * count / maxOwnCount} height="8" rx="4" fill="currentColor" /></svg></Link>;
                })}
              </div>
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"><ArrowDown aria-hidden="true" className="size-3" />Chọn một nhóm để xem hồ sơ</p>
            </section>
          )}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><LayoutGrid aria-hidden="true" className="size-4 text-muted-foreground" />Truy cập nhanh</h2>
            <div className="grid grid-cols-2 gap-3">{shortcuts.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="group min-w-0 rounded-xl border border-border/60 bg-muted/20 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mb-3 flex size-10 items-center justify-center rounded-xl border bg-card text-accent shadow-sm transition-all duration-200 group-hover:text-primary dark:text-blue-300"><Icon aria-hidden="true" className="size-5" /></span><p className="break-words text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></Link>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
