import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, History, MapPin, Settings, ShieldCheck, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { systemAccess } from "@/lib/system-access";
import { EmptyPanel } from "@/components/ui/feature-overview";

export const metadata: Metadata = { title: "Quản trị hệ thống | SDG ERP" };

export default async function SystemPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const access = systemAccess(session);
  if (!Object.values(access).some(Boolean)) return <EmptyPanel title="Không thể truy cập quản trị hệ thống" description="Bạn chưa được cấp quyền sử dụng các chức năng quản trị." />;
  const company_id = session.companyId;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  // Query only authorized domains; one consistent snapshot, no sensitive fields.
  const data = await db.$transaction(async tx => ({
    accounts: access.accounts ? await tx.tai_khoan.groupBy({ by: ["cho_phep_dang_nhap"], where: { company_id }, _count: { _all: true } }) : null,
    roles: access.roles ? await tx.vai_tro.groupBy({ by: ["la_vai_tro_he_thong"], where: { company_id }, _count: { _all: true } }) : null,
    locations: access.locations ? await tx.vi_tri.groupBy({ by: ["dang_su_dung"], where: { company_id }, _count: { _all: true } }) : null,
    audit: access.audit ? await tx.nhat_ky_hoat_dong.count({ where: { company_id, created_at: { gte: since } } }) : null,
  }), { isolationLevel: "RepeatableRead" });
  const count = (rows: { _count: { _all: number } }[]) => rows.reduce((sum, r) => sum + r._count._all, 0);
  const cards = [
    ...(data.accounts ? [{ href: "/accounts", title: "Tài khoản đăng nhập", icon: Users, total: count(data.accounts), unit: "tài khoản", description: "Cấp tài khoản, quản lý đăng nhập và mật khẩu.", breakdown: [
      { label: "Cho phép đăng nhập", value: data.accounts.find(r => r.cho_phep_dang_nhap)?._count._all ?? 0 },
      { label: "Đã khóa", value: data.accounts.find(r => !r.cho_phep_dang_nhap)?._count._all ?? 0 },
    ] }] : []),
    ...(data.roles ? [{ href: "/roles", title: "Vai trò & phân quyền", icon: ShieldCheck, total: count(data.roles), unit: "vai trò", description: "Thiết lập quyền và gán vai trò cho tài khoản.", breakdown: [
      { label: "Tùy chỉnh", value: data.roles.find(r => !r.la_vai_tro_he_thong)?._count._all ?? 0 },
      { label: "Hệ thống", value: data.roles.find(r => r.la_vai_tro_he_thong)?._count._all ?? 0 },
    ] }] : []),
    ...(data.locations ? [{ href: "/locations", title: "Vị trí & không gian", icon: MapPin, total: count(data.locations), unit: "vị trí", description: "Quản lý tòa nhà, tầng, phòng và các vị trí chi tiết.", breakdown: [
      { label: "Đang sử dụng", value: data.locations.find(r => r.dang_su_dung)?._count._all ?? 0 },
      { label: "Ngừng sử dụng", value: data.locations.find(r => !r.dang_su_dung)?._count._all ?? 0 },
    ] }] : []),
    ...(data.audit !== null ? [{ href: "/audit-logs", title: "Nhật ký hoạt động", icon: History, total: data.audit, unit: "sự kiện trong 7 ngày qua", description: "Tra cứu lịch sử thao tác và thay đổi trong hệ thống.", breakdown: [] }] : []),
  ];
  return <section className="space-y-6">
    <header className="flex items-center gap-3"><ShieldCheck aria-hidden="true" className="size-7 text-primary" /><h1 className="text-2xl font-semibold tracking-tight">Quản trị hệ thống</h1></header>
    <nav aria-label="Chức năng quản trị" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(card => <Link href={card.href} key={card.href} className="group flex min-w-0 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring">
        <div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-3 text-primary"><card.icon aria-hidden="true" className="size-6" /></span><ArrowUpRight aria-hidden="true" className="size-5 text-muted-foreground group-hover:text-primary" /></div>
        <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
        <p className="mt-3"><span className="text-3xl font-semibold tabular-nums">{card.total.toLocaleString("vi-VN")}</span><span className="ml-2 text-sm text-muted-foreground">{card.unit}</span></p>
        <p className="mb-5 mt-2 text-sm text-muted-foreground">{card.description}</p>
        {card.breakdown.length > 0 && <div className="mt-auto space-y-3 border-t pt-4">
          <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full overflow-hidden rounded-full bg-muted"><rect width={card.total ? card.breakdown[0].value / card.total * 100 : 0} height="8" className="fill-primary/70" /></svg>
          <dl className="flex flex-wrap justify-between gap-2 text-sm">{card.breakdown.map(item => <div key={item.label}><dt className="text-muted-foreground">{item.label}</dt><dd className="mt-1 font-semibold tabular-nums">{item.value}</dd></div>)}</dl>
        </div>}
      </Link>)}
      {access.settings && <Link href="/settings" className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring">
        <div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Settings aria-hidden="true" className="size-6" /></span><ArrowUpRight aria-hidden="true" className="size-5 text-muted-foreground" /></div>
        <h2 className="mt-4 text-lg font-semibold">Cài đặt chung</h2><p className="mt-2 text-sm text-muted-foreground">Quản trị AI và các cấu hình được cấp quyền.</p><span className="mt-auto pt-6 text-sm font-medium text-primary">Mở cài đặt</span>
      </Link>}
    </nav>
  </section>;
}
