import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, CircleHelp, ContactRound, Target, UserCheck, UserMinus, Users } from "lucide-react";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { KpiDashboardPreview } from "@/components/employees/KpiDashboardPreview";

export const metadata: Metadata = { title: "Tổng quan nhân sự | SDG ERP" };

export default async function HrPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, "HR")) return <EmptyPanel title="Không thể truy cập tổng quan nhân sự" description="Bạn chưa được cấp quyền xem nhân sự." />;
  const company_id = session.companyId;
  const { departments, groups } = await db.$transaction(async tx => {
    const departments = await tx.phong_ban.findMany({ where: { company_id }, select: { id: true, parent_id: true, ten_phong_ban: true }, orderBy: { ten_phong_ban: "asc" } });
    const groups = await tx.nhan_su.groupBy({ by: ["department_id", "tinh_trang_lam_viec"], where: { company_id }, _count: { _all: true } });
    return { departments, groups };
  }, { isolationLevel: "RepeatableRead" });
  const totals = { ALL: 0, ACTIVE: 0, LEFT: 0, UNKNOWN: 0 };
  const byId = new Map(departments.map(d => [d.id, d]));
  const branches = new Map<number, { id: number; name: string; count: number }>();
  for (const d of departments) if (!d.parent_id || !byId.has(d.parent_id)) branches.set(d.id, { id: d.id, name: d.ten_phong_ban, count: 0 });
  let unassigned = 0;
  for (const group of groups) {
    const count = group._count._all;
    totals.ALL += count;
    totals[group.tinh_trang_lam_viec] += count;
    if (group.tinh_trang_lam_viec !== "ACTIVE") continue;
    let department = group.department_id === null ? undefined : byId.get(group.department_id);
    const seen = new Set<number>();
    while (department?.parent_id && byId.has(department.parent_id) && !seen.has(department.id)) {
      seen.add(department.id);
      department = byId.get(department.parent_id);
    }
    const branch = department && branches.get(department.id);
    if (branch) branch.count += count;
    else unassigned += count;
  }
  const rows = [...branches.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  const maxCount = Math.max(1, ...rows.map(r => r.count));
  const stats = [
    { key: "ALL", label: "Tổng hồ sơ", icon: Users },
    { key: "ACTIVE", label: "Đang làm việc", icon: UserCheck },
    { key: "LEFT", label: "Đã nghỉ việc", icon: UserMinus },
    { key: "UNKNOWN", label: "Chưa xác nhận", icon: CircleHelp },
  ] as const;
  return <section className="space-y-6">
    <header className="flex items-center gap-3"><Users aria-hidden="true" className="size-7 text-primary" /><h1 className="text-2xl font-semibold tracking-tight">Tổng quan nhân sự</h1></header>
    <nav aria-label="Tình trạng nhân sự" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(s => <Link key={s.key} href={`/employees?status=${s.key}`} aria-label={`${s.label}: ${totals[s.key]}`} className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring">
        <div className="flex items-center justify-between gap-2"><s.icon aria-hidden="true" className="size-5 text-primary" /><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-primary" /></div>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{totals[s.key].toLocaleString("vi-VN")}</p><p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
      </Link>)}
    </nav>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <section aria-labelledby="hr-distribution" className="min-w-0 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="hr-distribution" className="text-lg font-semibold">Nhân sự theo phòng ban</h2><span className="text-sm text-muted-foreground">{departments.length} đơn vị</span></div>
        <p className="mt-1 text-sm text-muted-foreground">Người đang làm việc · Gộp cả bộ phận trực thuộc</p>
        {rows.length ? <ul className="mt-5 space-y-2">{rows.map(row => <li key={row.id}><Link href={`/employees?departmentId=${row.id}&status=ACTIVE`} aria-label={`${row.name}: ${row.count} người đang làm việc`} className="block rounded-lg p-2 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
          <div className="mb-2 flex items-start justify-between gap-4"><span className="text-sm font-medium">{row.name}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{row.count}</span></div>
          <svg aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-muted" viewBox="0 0 100 8" preserveAspectRatio="none"><rect width={row.count / maxCount * 100} height="8" rx="1" className="fill-primary/70" /></svg>
        </Link></li>)}</ul> : <div className="mt-5"><EmptyPanel title="Chưa có phòng ban" description="Xem và thiết lập cơ cấu tại mục Cơ cấu phòng ban." /></div>}
        {unassigned > 0 && <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{unassigned} người đang làm việc chưa thuộc nhánh phòng ban được xác định.</p>}
      </section>
      <nav aria-label="Chức năng nhân sự" className="space-y-3">
        {[
          { href: "/employees", name: "Hồ sơ nhân sự", description: "Tra cứu người, thông tin và tình trạng làm việc.", icon: ContactRound },
          { href: "/departments", name: "Cơ cấu phòng ban", description: "Xem đơn vị, bộ phận và người phụ trách.", icon: Building2 },
          { href: "/hr#kpi", name: "KPI nhân sự · Bản mẫu", description: "Xem bố cục đánh giá và chỉ tiêu bằng dữ liệu minh họa.", icon: Target },
        ].map(item => <Link key={item.href} href={item.href} className="group block rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring">
          <div className="flex items-center justify-between"><item.icon aria-hidden="true" className="size-6 text-primary" /><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" /></div>
          <h2 className="mt-3 font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        </Link>)}
      </nav>
    </div>
    <div id="kpi" className="scroll-mt-24 border-t pt-6"><KpiDashboardPreview /></div>
  </section>;
}
