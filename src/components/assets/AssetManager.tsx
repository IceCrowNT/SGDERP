"use client";
import { useRef, useState, useTransition } from "react";
import { Boxes, Package, Users, Plus, Search, SlidersHorizontal, ChevronLeft, ChevronRight, MapPin, Pencil } from "lucide-react";
import { getAssets, getAsset, getAssetCategories, getAssetFilterOptions } from "@/actions/asset";
import type { AssetQuery } from "@/lib/validations/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureOverview, EmptyPanel } from "@/components/ui/feature-overview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AssetForm, AssetCategoryForm } from "./AssetForm";
import { AssetDetail } from "./AssetDetail";
import type { AssetList, AssetCategory, AssetFilters, AssetRow } from "./types";

function Filter({ label, value, choices, onChange, disabled, searchable = false }: { label: string; value?: string | number; choices: { value: string; label: string }[]; onChange: (value: string) => void; disabled: boolean; searchable?: boolean }) {
  if (searchable) return <SearchableSelect label={label} value={value === undefined ? "all" : String(value)} onValueChange={v => onChange(v === "all" ? "" : v)} disabled={disabled} options={[{ value: "all", label: `${label}: Tất cả` }, ...choices]} />;
  return <Select value={value === undefined ? "all" : String(value)} onValueChange={v => onChange(v === "all" ? "" : v)} disabled={disabled}><SelectTrigger aria-label={label} className="min-h-10 w-full"><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value="all">{label}: Tất cả</SelectItem>{choices.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>;
}

export function AssetManager({ initial, initialCategories, initialFilters }: { initial: AssetList; initialCategories: AssetCategory[]; initialFilters: AssetFilters }) {
  const [list, setList] = useState(initial);
  const [categories, setCategories] = useState(initialCategories);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState<AssetQuery>({});
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssetRow | null>(null);
  const [detailError, setDetailError] = useState("");
  const [editing, setEditing] = useState<AssetRow | null | undefined>(undefined);
  const [categoryList, setCategoryList] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<AssetCategory | null | undefined>(undefined);
  const latest = useRef(0), latestDetail = useRef(0);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const canManage = list.canManage;
  const hasActiveCategory = categories.some(c => c.dang_su_dung);
  function load(next: AssetQuery = query, catalogs = false) {
    const ticket = ++latest.current;
    setQuery(next); setError("");
    start(async () => {
      try {
        const result = await getAssets(next);
        if (ticket !== latest.current) return;
        if (!result.success) { setError(result.message); return; }
        setList(result);
        if (catalogs) {
          const [c, f] = await Promise.all([getAssetCategories(), getAssetFilterOptions()]);
          if (ticket !== latest.current) return;
          if (c.success) setCategories(c.rows);
          if (f.success) setFilters(f);
        }
      } catch { if (ticket === latest.current) setError("Không tải được danh sách. Hãy thử lại."); }
    });
  }
  const update = (values: Partial<AssetQuery>) => load({ ...query, ...values, page: 1 });
  function openDetail(id: number) {
    const ticket = ++latestDetail.current;
    setSelected(id); setDetail(null); setDetailError("");
    start(async () => {
      try {
        const r = await getAsset(id);
        if (ticket !== latestDetail.current) return;
        if (r.success) setDetail(r.row); else setDetailError(r.message);
      } catch { if (ticket === latestDetail.current) setDetailError("Không tải được hồ sơ tài sản."); }
    });
  }
  const hasFilters = Boolean(query.search || query.categoryId || query.condition || query.usage || query.employeeId || query.departmentId || query.locationId);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Quản lý tài sản</h1><p className="mt-1 text-sm text-muted-foreground">Thiết bị, người sử dụng và nơi đặt.</p></div>{canManage && <div className="flex flex-wrap gap-2"><Button className="min-h-10" variant="outline" onClick={() => setCategoryList(true)}><Boxes className="size-4" />Loại tài sản</Button><Button className="min-h-10" onClick={() => setEditing(null)} disabled={!hasActiveCategory}><Plus className="size-4" />Thêm tài sản</Button></div>}</header>
    {canManage && !hasActiveCategory && <p className="text-sm text-muted-foreground">Tạo hoặc mở lại một loại tài sản để thêm thiết bị.</p>}
    <div aria-busy={pending}><FeatureOverview items={[{ label: "Hồ sơ theo bộ lọc", value: list.total, icon: Package }, { label: "Chưa ngừng sử dụng", value: list.remaining, icon: Boxes }, { label: "Giao cá nhân", value: list.personal, icon: Users }]} /></div>
    {categories.length > 0 && <section aria-label="Tài sản theo loại" className="flex gap-2 overflow-x-auto pb-1">{categories.map(c => <Button key={c.id} variant={query.categoryId === c.id ? "default" : "outline"} className="min-h-10 h-auto shrink-0 gap-3 py-3" aria-pressed={query.categoryId === c.id} disabled={pending} onClick={() => update({ categoryId: query.categoryId === c.id ? undefined : c.id })}><span>{c.ten_loai}{!c.dang_su_dung ? " · Ngừng dùng" : ""}</span><span className="rounded-md bg-background/20 px-2 py-0.5 tabular-nums">{list.byCategory.find(x => x.id === c.id)?.count ?? 0}</span></Button>)}</section>}
    <section aria-label="Tìm và lọc tài sản" className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row"><form className="flex min-w-0 flex-1 gap-2" onSubmit={e => { e.preventDefault(); update({ search: search.trim() }); }}><Input aria-label="Tìm tài sản" placeholder="Tên, mã tài sản, serial hoặc model…" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} className="text-base" /><Button className="min-h-10" type="submit" variant="outline" aria-label="Tìm kiếm tài sản" disabled={pending}><Search className="size-4" /></Button></form><Button className="min-h-10" variant="outline" aria-expanded={advanced} onClick={() => setAdvanced(v => !v)}><SlidersHorizontal className="size-4" />Bộ lọc</Button>{hasFilters && <Button className="min-h-10" variant="ghost" disabled={pending} onClick={() => { setSearch(""); load({}); }}>Xóa bộ lọc</Button>}</div>
      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", !advanced && "hidden")}>
        <Filter searchable label="Loại tài sản" value={query.categoryId} choices={categories.map(c => ({ value: String(c.id), label: c.ten_loai }))} onChange={v => update({ categoryId: v ? Number(v) : undefined })} disabled={pending} />
        <Filter label="Tình trạng" value={query.condition} choices={Object.entries(ASSET_CONDITIONS).map(([value, label]) => ({ value, label }))} onChange={v => update({ condition: v ? v as AssetQuery["condition"] : undefined })} disabled={pending} />
        <Filter label="Hình thức sử dụng" value={query.usage} choices={Object.entries(ASSET_USAGES).map(([value, label]) => ({ value, label }))} onChange={v => update({ usage: v ? v as AssetQuery["usage"] : undefined })} disabled={pending} />
        <Filter searchable label="Phòng quản lý" value={query.departmentId} choices={filters.departments.map(c => ({ value: String(c.id), label: c.ten_phong_ban }))} onChange={v => update({ departmentId: v ? Number(v) : undefined })} disabled={pending} />
        <Filter searchable label="Người sử dụng" value={query.employeeId} choices={filters.employees.map(c => ({ value: String(c.id), label: `${c.ho_ten} · ${c.ma_nhan_su}` }))} onChange={v => update({ employeeId: v ? Number(v) : undefined })} disabled={pending} />
        <Filter searchable label="Vị trí" value={query.locationId} choices={filters.locations.map(c => ({ value: String(c.id), label: c.name }))} onChange={v => update({ locationId: v ? Number(v) : undefined })} disabled={pending} />
      </div>
    </section>
    {error ? <div role="alert" className="space-y-3 rounded-xl border p-4"><p className="text-sm text-destructive">{error}</p><Button className="min-h-10" variant="outline" onClick={() => load(query, true)}>Tải lại danh sách</Button></div>
      : pending && !selected ? <div role="status" aria-label="Đang tải tài sản" className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        : !list.rows.length ? <div className="space-y-3"><EmptyPanel title={hasFilters ? "Không có tài sản phù hợp" : "Chưa có hồ sơ tài sản"} description={hasFilters ? "Thử thay đổi hoặc xóa bộ lọc." : canManage ? "Tạo loại thiết bị, sau đó thêm từng tài sản đã xác minh." : "Chưa có thiết bị được ghi nhận."} />{canManage && !hasActiveCategory && <div className="text-center"><Button className="min-h-10" variant="outline" onClick={() => setCategoryEdit(null)}><Plus className="size-4" />Thêm loại tài sản</Button></div>}</div>
          : <div role="list" aria-label="Danh sách tài sản" className="space-y-2">{list.rows.map(row => <div role="listitem" key={row.id}><Button variant="ghost" className="min-h-10 h-auto w-full justify-start whitespace-normal rounded-xl border bg-card p-4 text-left hover:bg-muted/50" aria-label={`Mở tài sản ${row.ten_tai_san}`} onClick={e => { detailTrigger.current = e.currentTarget; openDetail(row.id); }}><span className="grid w-full min-w-0 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"><span className="min-w-0"><span className="block break-words font-semibold">{row.ten_tai_san}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{row.ma_tai_san} · {row.loai_tai_san.ten_loai}</span></span><span className="flex flex-wrap items-center gap-2"><Badge variant={row.tinh_trang === "HONG" ? "destructive" : "secondary"}>{ASSET_CONDITIONS[row.tinh_trang]}</Badge><span className="text-xs font-normal text-muted-foreground">{ASSET_USAGES[row.hinh_thuc_su_dung]}</span></span><span className="min-w-0 space-y-1 text-sm font-normal"><span className="block break-words">{row.nguoi_su_dung?.ho_ten || (row.hinh_thuc_su_dung === "DUNG_CHUNG" ? "Dùng chung" : "Chưa xác định người dùng")}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" />{row.vi_tri?.ten_vi_tri || "Chưa xác định vị trí"}</span></span></span></Button></div>)}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p role="status">{list.total.toLocaleString("vi-VN")} hồ sơ · Trang {list.page}/{list.pages}</p><div className="flex gap-2"><Button className="min-h-10" variant="outline" size="icon-lg" aria-label="Trang trước" disabled={pending || list.page <= 1} onClick={() => load({ ...query, page: list.page - 1 })}><ChevronLeft className="size-4" /></Button><Button className="min-h-10" variant="outline" size="icon-lg" aria-label="Trang sau" disabled={pending || list.page >= list.pages} onClick={() => load({ ...query, page: list.page + 1 })}><ChevronRight className="size-4" /></Button></div></div>
    <Sheet open={selected !== null} onOpenChange={open => { if (!open) { ++latestDetail.current; setSelected(null); setDetail(null); } }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl" onCloseAutoFocus={e => { e.preventDefault(); detailTrigger.current?.focus(); }}><SheetHeader className="pr-12"><SheetTitle>Chi tiết tài sản</SheetTitle><SheetDescription>Thông tin hiện tại và lịch sử thay đổi.</SheetDescription></SheetHeader><div className="px-4 pb-6">{detail ? <AssetDetail key={`${detail.id}:${detail.updated_at.toISOString()}`} row={detail} canManage={canManage} onEdit={() => { setEditing(detail); setSelected(null); }} /> : detailError ? <div role="alert" className="space-y-2"><p>{detailError}</p><Button className="min-h-10" variant="outline" onClick={() => selected && openDetail(selected)}>Tải lại hồ sơ</Button></div> : <Skeleton className="h-72 w-full" />}</div></SheetContent></Sheet>
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open) setEditing(undefined); }}><DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Sửa tài sản" : "Thêm tài sản"}</DialogTitle><DialogDescription>Ghi nhận thông tin đã xác minh; có thể bổ sung người và vị trí sau.</DialogDescription></DialogHeader>{editing !== undefined && <AssetForm key={editing ? `${editing.id}:${editing.updated_at.toISOString()}` : "new"} row={editing} categories={categories} onCancel={() => setEditing(undefined)} onSaved={id => { setEditing(undefined); load(query, true); openDetail(id); }} />}</DialogContent></Dialog>
    <Dialog open={categoryList} onOpenChange={setCategoryList}><DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Loại tài sản</DialogTitle><DialogDescription>Ngừng dùng loại sẽ giữ nguyên các hồ sơ đang liên kết.</DialogDescription></DialogHeader><Button className="min-h-10 justify-self-start" onClick={() => { setCategoryList(false); setCategoryEdit(null); }}><Plus className="size-4" />Thêm loại tài sản</Button>{!categories.length && <EmptyPanel title="Chưa có loại tài sản" />}{categories.map(c => <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="break-words font-medium">{c.ten_loai}</p><p className="text-xs text-muted-foreground">{c.ma_loai} · {c.dang_su_dung ? "Đang dùng" : "Ngừng dùng"}</p></div><Button className="min-h-10" variant="outline" size="icon-lg" aria-label={`Sửa loại ${c.ten_loai}`} onClick={() => { setCategoryList(false); setCategoryEdit(c); }}><Pencil className="size-4" /></Button></div>)}</DialogContent></Dialog>
    <Dialog open={categoryEdit !== undefined} onOpenChange={open => { if (!open) setCategoryEdit(undefined); }}><DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{categoryEdit ? "Sửa loại tài sản" : "Thêm loại tài sản"}</DialogTitle><DialogDescription>Mã loại dùng để phân biệt và giữ ổn định sau khi tạo.</DialogDescription></DialogHeader>{categoryEdit !== undefined && <AssetCategoryForm row={categoryEdit} onCancel={() => setCategoryEdit(undefined)} onSaved={() => { setCategoryEdit(undefined); load(query, true); }} />}</DialogContent></Dialog>
  </div>;
}
