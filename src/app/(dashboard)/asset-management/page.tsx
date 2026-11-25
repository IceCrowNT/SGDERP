import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, ChevronRight, CircleHelp, MapPin, Package, Paperclip, Wrench, TriangleAlert } from "lucide-react";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ASSET_CONDITIONS } from "@/lib/asset-labels";
import { AssetCategoryIcon } from "@/components/assets/AssetCategoryIcon";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssetOverviewSearch } from "@/components/assets/AssetOverviewSearch";

export const metadata: Metadata = { title: "Tổng quan tài sản & vật tư | SDG ERP" };
const number = (value: number) => value.toLocaleString("vi-VN");
const linkStyle = "transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring";

async function loadOverview(company_id: number, assets: boolean, inventory: boolean) {
  return db.$transaction(async tx => {
    const [byCategory, byCondition, missingLocation, recent, consumables, accessories] = await Promise.all([
      assets ? tx.tai_san.groupBy({ by: ["loai_tai_san_id"], where: { company_id }, _count: { _all: true } }) : [],
      assets ? tx.tai_san.groupBy({ by: ["tinh_trang"], where: { company_id }, _count: { _all: true } }) : [],
      assets ? tx.tai_san.count({ where: { company_id, vi_tri_id: null } }) : null,
      assets ? tx.tai_san.findMany({ where: { company_id }, orderBy: [{ updated_at: "desc" }, { id: "desc" }], take: 5,
        select: { id: true, ma_tai_san: true, ten_tai_san: true, tinh_trang: true, updated_at: true, loai_tai_san: { select: { ten_loai: true, ma_loai: true } } } }) : [],
      inventory ? tx.mat_hang_vat_tu.count({ where: { company_id, dang_su_dung: true, loai_vat_tu: { hang_muc: "TIEU_HAO" } } }) : null,
      inventory ? tx.mat_hang_vat_tu.count({ where: { company_id, dang_su_dung: true, loai_vat_tu: { hang_muc: "PHU_KIEN" } } }) : null,
    ]);
    const types = assets ? await tx.loai_tai_san.findMany({ where: { company_id, id: { in: byCategory.map(row => row.loai_tai_san_id) } }, select: { id: true, ten_loai: true, ma_loai: true } }) : [];
    const counts = new Map(byCategory.map(row => [row.loai_tai_san_id, row._count._all]));
    return {
      total: assets ? byCategory.reduce((sum, row) => sum + row._count._all, 0) : null,
      types: types.map(row => ({ ...row, count: counts.get(row.id) ?? 0 })).sort((a, b) => b.count - a.count || a.ten_loai.localeCompare(b.ten_loai, "vi")),
      byCondition, missingLocation, recent, consumables, accessories,
    };
  }, { isolationLevel: "RepeatableRead" });
}

export default async function AssetManagementPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const assets = hasPermission(session, "ASSETS"), inventory = hasPermission(session, "INVENTORY");
  if (!assets && !inventory) return <EmptyPanel title="Không thể truy cập tài sản và vật tư" description="Bạn chưa được cấp quyền xem hạng mục nào." />;
  let overview: Awaited<ReturnType<typeof loadOverview>>;
  try { overview = await loadOverview(session.companyId, assets, inventory); }
  catch { return <div className="space-y-4"><EmptyPanel title="Chưa tải được tổng quan" description="Vui lòng thử tải lại để xem số liệu mới nhất." /><Button asChild variant="outline"><Link href="/asset-management">Tải lại tổng quan</Link></Button></div>; }
  const categories = [
    { name: "Tài sản", href: "/assets", icon: Package, count: overview.total, unit: "hồ sơ tài sản", description: "Thiết bị có mã riêng" },
    { name: "Vật tư tiêu hao", href: "/inventory?kind=consumable", icon: Boxes, count: overview.consumables, unit: "mặt hàng đang dùng", description: "Nhập hàng và ghi nhận sử dụng" },
    { name: "Phụ kiện", href: "/inventory?kind=accessory", icon: Paperclip, count: overview.accessories, unit: "mặt hàng đang dùng", description: "Cấp phát và thu hồi" },
  ];
  const conditionCount = (condition: keyof typeof ASSET_CONDITIONS) => overview.byCondition.find(row => row.tinh_trang === condition)?._count._all ?? 0;
  const attention = [
    { label: "Hỏng", icon: TriangleAlert, count: conditionCount("HONG"), href: "/assets?condition=HONG" },
    { label: "Đang sửa", icon: Wrench, count: conditionCount("DANG_SUA"), href: "/assets?condition=DANG_SUA" },
    { label: "Chưa xác nhận tình trạng", icon: CircleHelp, count: conditionCount("CHUA_XAC_NHAN"), href: "/assets?condition=CHUA_XAC_NHAN" },
    { label: "Chưa rõ vị trí", icon: MapPin, count: overview.missingLocation ?? 0, href: "/assets?locationId=null" },
  ];
  const topTypes = overview.types.slice(0, 6), maxCount = Math.max(1, ...topTypes.map(row => row.count));
  return <section className="space-y-6">
    <header className="flex items-start gap-3"><Package className="mt-1 size-7 shrink-0 text-primary" aria-hidden="true" /><div><h1 className="text-2xl font-semibold tracking-tight">Tổng quan tài sản & vật tư</h1><p className="mt-1 text-sm text-muted-foreground">Theo dõi hiện trạng và mở nhanh hạng mục cần quản lý.</p></div></header>
    <AssetOverviewSearch />
    <nav aria-label="Hạng mục quản lý" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {categories.filter(c => c.count !== null).map(c => <Link key={c.href} href={c.href} aria-label={c.name} className={`group rounded-xl border bg-card p-5 hover:border-primary/40 ${linkStyle}`}>
        <div className="flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><c.icon className="size-5" aria-hidden="true" /></span><h2 className="font-semibold">{c.name}</h2><ChevronRight className="ml-auto size-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" /></div>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2"><span className="text-3xl font-semibold tabular-nums">{number(c.count!)}</span><span className="text-sm text-muted-foreground">{c.unit}</span></p><p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
      </Link>)}
    </nav>
    {assets && <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="asset-distribution" className="min-w-0 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="asset-distribution" className="font-semibold">Tài sản theo loại</h2><span className="text-sm text-muted-foreground">{overview.types.length} loại có tài sản</span></div>
          <p className="mt-1 text-xs text-muted-foreground">Toàn bộ hồ sơ, gồm tài sản ngừng sử dụng</p>
          {topTypes.length ? <ul className="mt-4 space-y-1">{topTypes.map(row => <li key={row.id}><Link href={`/assets?categoryId=${row.id}`} aria-label={`${row.ten_loai}: ${row.count} tài sản`} className={`flex items-center gap-3 rounded-lg py-2 ${linkStyle}`}>
            <AssetCategoryIcon code={row.ma_loai} className="size-5" /><div className="min-w-0 flex-1"><div className="mb-2 flex items-start justify-between gap-3"><span className="text-sm font-medium">{row.ten_loai}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{number(row.count)}</span></div>
              <svg aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted" viewBox="0 0 100 6" preserveAspectRatio="none"><rect width={row.count / maxCount * 100} height="6" rx="1" className="fill-primary/70" /></svg>
            </div>
          </Link></li>)}</ul> : <p className="py-8 text-sm text-muted-foreground">Chưa có hồ sơ tài sản. Mở mục Tài sản để bắt đầu.</p>}
          <Link href="/assets" className={`mt-4 flex min-h-10 items-center justify-between rounded-lg border-t pt-3 text-sm font-medium ${linkStyle}`}><span>{overview.types.length > 6 ? `Xem đủ ${overview.types.length} loại tài sản` : "Xem danh sách tài sản"}</span><ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
        <section aria-labelledby="asset-attention" className="rounded-xl border bg-card p-5"><h2 id="asset-attention" className="font-semibold">Cần rà soát</h2><p className="mt-1 text-xs text-muted-foreground">Chọn một mục để xem các hồ sơ liên quan</p>
          <ul className="mt-4 divide-y">{attention.map(row => <li key={row.href}><Link href={row.href} aria-label={`${row.label}: ${row.count} tài sản`} className={`flex min-h-16 items-center gap-3 rounded-lg py-3 ${linkStyle}`}><row.icon className={`size-5 shrink-0 ${row.count > 0 && row.label === "Hỏng" ? "text-destructive" : "text-muted-foreground"}`} aria-hidden="true" /><span className="flex-1 text-sm">{row.label}</span><span className="text-lg font-semibold tabular-nums">{number(row.count)}</span><ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></Link></li>)}</ul>
        </section>
      </div>
      <section aria-labelledby="asset-recent" className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><h2 id="asset-recent" className="font-semibold">Tài sản vừa cập nhật</h2><span className="text-xs text-muted-foreground">5 hồ sơ gần nhất</span></div>
        {overview.recent.length ? <ul className="divide-y border-t">{overview.recent.map(row => <li key={row.id}><Link href={`/assets?asset=${row.id}`} aria-label={`Mở tài sản ${row.ten_tai_san}`} className={`grid items-center gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] ${linkStyle}`}>
          <div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-muted p-2.5"><AssetCategoryIcon code={row.loai_tai_san.ma_loai} /></span><div className="min-w-0"><p className="break-words text-sm font-medium">{row.ten_tai_san}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.ma_tai_san} · {row.loai_tai_san.ten_loai}</p></div></div>
          <Badge variant={row.tinh_trang === "HONG" ? "destructive" : "secondary"} className="w-fit">{ASSET_CONDITIONS[row.tinh_trang]}</Badge>
          <time dateTime={row.updated_at.toISOString()} className="text-xs text-muted-foreground sm:w-32 sm:text-right">{row.updated_at.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
        </Link></li>)}</ul> : <p className="px-5 pb-6 text-sm text-muted-foreground">Chưa có tài sản được ghi nhận.</p>}
      </section>
    </>}
  </section>;
}
