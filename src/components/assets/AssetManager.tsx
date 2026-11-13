"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Boxes, Plus, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Pencil, X, ArrowLeft } from "lucide-react";
import { getAssets, getAsset, getAssetCategories, getAssetFilterOptions, getAssetOverview } from "@/actions/asset";
import type { AssetQuery } from "@/lib/validations/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AssetForm, AssetCategoryForm } from "./AssetForm";
import { AssetDetail } from "./AssetDetail";
import { AssetCategoryIcon } from "./AssetCategoryIcon";
import { AssetInlineEditor } from "./AssetInlineEditor";
import { AssetGroups, type AssetGrouping } from "./AssetGroups";
import type { AssetList, AssetCategory, AssetFilters, AssetRow, AssetOverview, AssetGroup } from "./types";

function Filter({ label, value, choices, onChange, disabled, searchable = false }: { label: string; value?: string | number; choices: { value: string; label: string }[]; onChange: (value: string) => void; disabled: boolean; searchable?: boolean }) {
  if (searchable) return <SearchableSelect label={label} value={value === undefined ? "all" : String(value)} onValueChange={v => onChange(v === "all" ? "" : v)} disabled={disabled} options={[{ value: "all", label: `${label}: Tất cả` }, ...choices]} />;
  return <Select value={value === undefined ? "all" : String(value)} onValueChange={v => onChange(v === "all" ? "" : v)} disabled={disabled}><SelectTrigger aria-label={label} className="min-h-10 w-full"><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value="all">{label}: Tất cả</SelectItem>{choices.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>;
}

function AssetIdentity({ row }: { row: AssetRow }) {
  return <span className="flex min-w-0 items-center gap-3">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"><AssetCategoryIcon code={row.loai_tai_san.ma_loai} /></span>
    <span className="min-w-0"><span className="line-clamp-2 break-words font-medium">{row.ten_tai_san}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{row.ma_tai_san}</span></span>
  </span>;
}
function userLabel(row: AssetRow) {
  return row.nguoi_su_dung?.ho_ten ?? (row.hinh_thuc_su_dung === "DUNG_CHUNG" ? "Dùng chung" : row.hinh_thuc_su_dung === "CHUA_PHAN_BO" ? "Chưa phân bổ" : "Chưa rõ");
}

export function AssetManager({ initial, initialCategories, initialFilters }: { initial: AssetOverview; initialCategories: AssetCategory[]; initialFilters: AssetFilters }) {
  const [overview, setOverview] = useState(initial);
  const [list, setList] = useState<AssetList>({ success: true, rows: [], total: 0, remaining: 0, personal: 0, byCategory: [], page: 1, pages: 1, pageSize: 20, canManage: initial.canManage });
  const [screen, setScreen] = useState<"groups" | "assets">("groups");
  const [grouping, setGrouping] = useState<AssetGrouping>("byCategory");
  const [groupSearch, setGroupSearch] = useState("");
  const [group, setGroup] = useState<AssetGroup | null>(null);
  const [inlineRow, setInlineRow] = useState<AssetRow | null>(null);
  const locked = inlineRow !== null;
  const [editFocus, setEditFocus] = useState<"employee" | "location" | undefined>();
  const groupScroll = useRef(0);
  const restoreGroup = useRef(false);
  const restoreLoadedView = useRef<{ ticket: number; scroll?: number; afterLoad?: () => void } | null>(null);
  const lastGroupId = useRef<string | null>(null);
  const groupViews = useRef(new Map<string, { query: AssetQuery; scroll: number; advanced: boolean }>());
  const [categories, setCategories] = useState(initialCategories);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState<AssetQuery>({});
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (screen !== "groups" || pending || !restoreGroup.current) return;
    restoreGroup.current = false;
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-group-id]")).find(b => b.dataset.groupId === lastGroupId.current);
    target?.focus({ preventScroll: true }); window.scrollTo({ top: groupScroll.current, behavior: "instant" });
  }, [screen, pending]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssetRow | null>(null);
  const [detailError, setDetailError] = useState("");
  const [editing, setEditing] = useState<AssetRow | null | undefined>(undefined);
  const [categoryList, setCategoryList] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<AssetCategory | null | undefined>(undefined);
  const latest = useRef(0), latestDetail = useRef(0), latestCatalog = useRef(0);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const detailScroll = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (pending || screen !== "assets") return;
    const restore = restoreLoadedView.current;
    if (!restore || restore.ticket !== latest.current) return;
    restoreLoadedView.current = null;
    if (restore.scroll !== undefined) window.scrollTo({ top: restore.scroll, behavior: "instant" });
    restore.afterLoad?.();
  }, [list, pending, screen]);
  function restoreListFocus() {
    const id = detailTrigger.current?.dataset.assetId;
    const visible = Array.from(document.querySelectorAll<HTMLButtonElement>(`button[data-asset-id="${id}"]`)).find(button => button.getClientRects().length > 0);
    const target = visible ?? document.querySelector<HTMLInputElement>('input[aria-label="Tìm tài sản"]');
    target?.focus({ preventScroll: true });
    const scroll = detailScroll.current;
    if (scroll) requestAnimationFrame(() => window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" }));
  }
  const canManage = overview.canManage;
  const contextCategory = group?.query.categoryId ? categories.find(c => c.id === group.query.categoryId) : undefined;
  const hasActiveCategory = categories.some(c => c.dang_su_dung);
  function load(next: AssetQuery = query, catalogs = false, scroll?: number, afterLoad?: () => void) {
    const ticket = ++latest.current;
    restoreLoadedView.current = null;
    setQuery(next); setError("");
    if (catalogs) refreshOverview();
    start(async () => {
      try {
        const result = await getAssets(next);
        if (ticket !== latest.current) return;
        if (!result.success) { setError(result.message); return; }
        setList(result);
        if (scroll !== undefined || afterLoad) restoreLoadedView.current = { ticket, scroll, afterLoad };
      } catch { if (ticket === latest.current) setError("Không tải được danh sách. Hãy thử lại."); }
    });
  }
  const update = (values: Partial<AssetQuery>) => load({ ...query, ...values, ...group?.query, page: 1 });
  function refreshOverview() {
    const ticket = ++latestCatalog.current;
    setError("");
    start(async () => {
      try {
        const [o, c, f] = await Promise.all([getAssetOverview(), getAssetCategories(), getAssetFilterOptions()]);
        if (ticket !== latestCatalog.current) return;
        if (!o.success || !c.success || !f.success) { setError("Không tải được nhóm tài sản. Hãy thử lại."); return; }
        setOverview(o); setCategories(c.rows); setFilters(f);
      } catch { if (ticket === latestCatalog.current) setError("Không tải được nhóm tài sản. Hãy thử lại."); }
    });
  }
  function enterGroup(next: AssetGroup) {
    groupScroll.current = window.scrollY; lastGroupId.current = next.id;
    const saved = groupViews.current.get(next.id);
    setGroup(next); setScreen("assets"); setSearch(""); setAdvanced(saved?.advanced ?? false);
    setList(v => ({ ...v, rows: [], total: next.count, page: saved?.query.page ?? 1 }));
    load(saved?.query ?? next.query, false, saved?.scroll ?? 0);
  }
  function backToGroups() {
    if (group) groupViews.current.set(group.id, { query, scroll: window.scrollY, advanced });
    ++latest.current; setScreen("groups"); setGroup(null); setQuery({}); setSearch(""); setError("");
    restoreGroup.current = true;
  }
  function globalSearch(value = search.trim()) {
    if (screen === "groups") groupScroll.current = window.scrollY;
    if (group) groupViews.current.set(group.id, { query, scroll: window.scrollY, advanced });
    setGroup(null); setScreen("assets"); setAdvanced(false);
    setList(v => ({ ...v, rows: [], total: 0 })); load({ search: value }, false, 0);
  }
  function addAsset() {
    detailTrigger.current = null; detailScroll.current = { x: window.scrollX, y: window.scrollY };
    setEditFocus(undefined); setEditing(null);
  }
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
  const hasFilters = Boolean(query.search || query.categoryId || query.condition || query.usage || query.employeeId || query.departmentId || query.locationId !== undefined);
  const applied = [
    { key: "search", label: "Tìm", value: query.search },
    { key: "categoryId", label: "Loại", value: categories.find(c => c.id === query.categoryId)?.ten_loai },
    { key: "condition", label: "Tình trạng", value: query.condition && ASSET_CONDITIONS[query.condition] },
    { key: "usage", label: "Sử dụng", value: query.usage && ASSET_USAGES[query.usage] },
    { key: "departmentId", label: "Phòng", value: filters.departments.find(d => d.id === query.departmentId)?.ten_phong_ban },
    { key: "employeeId", label: "Người", value: filters.employees.find(p => p.id === query.employeeId)?.ho_ten },
    { key: "locationId", label: "Vị trí", value: query.locationId === null ? "Chưa rõ vị trí" : filters.locations.find(l => l.id === query.locationId)?.name },
  ].filter(item => item.value && !(group && Object.hasOwn(group.query, item.key)));
  const moreFilterCount = applied.filter(item => !["search", "categoryId"].includes(item.key)).length;
  return <div className="space-y-5 [overflow-anchor:none]" aria-busy={pending}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">Tài sản</h1><span aria-label={`${overview.total} tài sản trong danh mục`} className="rounded-full bg-muted px-2.5 py-1 text-sm tabular-nums text-muted-foreground">{overview.total.toLocaleString("vi-VN")}</span></div>{canManage && <div className="flex flex-wrap gap-2"><Button className="min-h-10" variant="ghost" disabled={locked} onClick={() => setCategoryList(true)}><Boxes aria-hidden="true" className="size-4" />Loại tài sản</Button><Button className="min-h-10" onClick={addAsset} disabled={locked || !hasActiveCategory || contextCategory?.dang_su_dung === false}><Plus aria-hidden="true" className="size-4" />{contextCategory ? `Thêm ${contextCategory.ten_loai.charAt(0).toLocaleLowerCase("vi")}${contextCategory.ten_loai.slice(1)}` : "Thêm tài sản"}</Button></div>}</header>
    {canManage && !hasActiveCategory && <p className="text-sm text-muted-foreground">Tạo hoặc mở lại một loại tài sản để thêm thiết bị.</p>}
    {contextCategory?.dang_su_dung === false && <p className="text-sm text-muted-foreground">Loại này đã ngừng dùng. Mở lại loại để thêm thiết bị.</p>}
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (!locked) globalSearch(); }}><Input aria-label="Tìm tài sản" disabled={locked} placeholder="Tìm trong tất cả tài sản: tên, mã, serial…" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} className="text-base" /><Button className="min-h-10" type="submit" variant="outline" aria-label="Tìm kiếm tài sản" disabled={locked}><Search aria-hidden="true" className="size-4" /></Button></form>
    {screen === "groups" ? <>
      {error ? <div role="alert" className="space-y-2"><p>{error}</p><Button variant="outline" onClick={refreshOverview}>Tải lại nhóm</Button></div> : <AssetGroups overview={overview} grouping={grouping} onGrouping={mode => { setGrouping(mode); setGroupSearch(""); }} search={groupSearch} onSearch={setGroupSearch} onOpen={enterGroup} onAll={() => globalSearch("")} disabled={pending || locked} />}
      {canManage && !categories.length && <Button variant="outline" className="min-h-10" onClick={() => setCategoryEdit(null)}><Plus aria-hidden="true" className="size-4" />Thêm loại tài sản</Button>}
    </> : <>
    <nav aria-label="Đường dẫn tài sản" className="flex items-center gap-2 text-sm"><Button variant="ghost" className="min-h-10 px-2" disabled={locked} onClick={backToGroups}><ArrowLeft aria-hidden="true" className="size-4" />Tài sản</Button><ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span aria-current="page" className="min-w-0 truncate">{group?.label ?? (query.search ? "Kết quả tìm kiếm" : "Tất cả tài sản")}</span></nav>
    <section aria-label="Tìm và lọc tài sản" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{group?.label ?? (query.search ? "Kết quả tìm kiếm" : "Tất cả tài sản")} <span className="ml-1 text-sm font-normal text-muted-foreground">({list.total})</span></h2><div className="flex gap-2">

      <Button className="min-h-10" variant="outline" aria-expanded={advanced} aria-controls="asset-filters" disabled={locked} onClick={() => setAdvanced(v => !v)}><SlidersHorizontal aria-hidden="true" className="size-4" />Bộ lọc{moreFilterCount > 0 && <span aria-hidden="true" className="rounded bg-muted px-1.5 text-xs">{moreFilterCount}</span>}</Button></div></div>
      {applied.length > 0 && <div aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center gap-2">{applied.map(item => <Button key={item.key} variant="secondary" className="h-auto min-h-10 max-w-full gap-2 whitespace-normal text-left text-xs" disabled={pending || locked} aria-label={`Bỏ lọc ${item.label.toLocaleLowerCase("vi")}: ${item.value}`} onClick={() => { if (item.key === "search") setSearch(""); update({ [item.key]: undefined }); }}><span className="min-w-0 break-words">{item.label}: {item.value}</span><X aria-hidden="true" className="size-3 shrink-0" /></Button>)}<Button className="min-h-10 text-xs" variant="ghost" disabled={pending || locked} onClick={() => { setSearch(""); load(group?.query ?? {}); }}>Xóa bộ lọc</Button></div>}
      <div id="asset-filters" className={cn("grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 xl:grid-cols-3", !advanced && "hidden")}>
        {!group?.query.categoryId && <SearchableSelect label="Lọc loại tài sản" value={query.categoryId ? String(query.categoryId) : "all"} disabled={pending || locked} onValueChange={v => update({ categoryId: v === "all" ? undefined : Number(v) })} options={[{ value: "all", label: "Tất cả loại", icon: <Boxes className="size-4" /> }, ...categories.map(c => ({ value: String(c.id), label: c.ten_loai, keywords: c.ma_loai, icon: <AssetCategoryIcon code={c.ma_loai} className="size-4" /> }))]} />}
        <Filter label="Tình trạng" value={query.condition} choices={Object.entries(ASSET_CONDITIONS).map(([value, label]) => ({ value, label }))} onChange={v => update({ condition: v ? v as AssetQuery["condition"] : undefined })} disabled={pending || locked} />
        {!group?.query.usage && <Filter label="Hình thức sử dụng" value={query.usage} choices={Object.entries(ASSET_USAGES).map(([value, label]) => ({ value, label }))} onChange={v => update({ usage: v ? v as AssetQuery["usage"] : undefined })} disabled={pending || locked} />}
        <Filter searchable label="Phòng quản lý" value={query.departmentId} choices={filters.departments.map(c => ({ value: String(c.id), label: c.ten_phong_ban }))} onChange={v => update({ departmentId: v ? Number(v) : undefined })} disabled={pending || locked} />
        {!group?.query.employeeId && <Filter searchable label="Người sử dụng" value={query.employeeId} choices={filters.employees.map(c => ({ value: String(c.id), label: `${c.ho_ten} · ${c.ma_nhan_su}` }))} onChange={v => update({ employeeId: v ? Number(v) : undefined })} disabled={pending || locked} />}
        {group?.query.locationId === undefined && <Filter searchable label="Vị trí" value={query.locationId ?? undefined} choices={filters.locations.map(c => ({ value: String(c.id), label: c.name }))} onChange={v => update({ locationId: v ? Number(v) : undefined })} disabled={pending || locked} />}
      </div>
    </section>
    {pending && !selected && <p role="status" className="sr-only">Đang cập nhật danh sách…</p>}
    {error ? <div role="alert" className="space-y-3 rounded-xl border p-4"><p className="text-sm text-destructive">{error}</p><Button className="min-h-10" variant="outline" onClick={() => load(query, true)}>Tải lại danh sách</Button></div>
        : pending && !list.rows.length ? <div role="status" aria-label="Đang tải tài sản" className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div> : !list.rows.length ? <div className="space-y-3"><EmptyPanel title={hasFilters ? "Không có tài sản phù hợp" : "Chưa có hồ sơ tài sản"} description={hasFilters ? "Thử thay đổi hoặc xóa bộ lọc." : canManage ? "Tạo loại thiết bị, sau đó thêm từng tài sản đã xác minh." : "Chưa có thiết bị được ghi nhận."} />{canManage && !hasActiveCategory && <div className="text-center"><Button className="min-h-10" variant="outline" onClick={() => setCategoryEdit(null)}><Plus className="size-4" />Thêm loại tài sản</Button></div>}</div>
          : <>
            <div className="min-w-0 overflow-hidden rounded-xl border bg-card"><Table aria-label="Danh sách tài sản" className="min-w-[960px] table-fixed"><TableHeader><TableRow className="bg-muted/40"><TableHead className="w-[27%] pl-4">Tài sản</TableHead><TableHead className="w-[24%]">Người sử dụng</TableHead><TableHead className="w-[23%]">Vị trí</TableHead><TableHead className="w-[17%]">Tình trạng</TableHead>{canManage && <TableHead className="w-[9%]"><span className="sr-only">Thao tác</span></TableHead>}</TableRow></TableHeader><TableBody>{list.rows.map(row => inlineRow?.id === row.id ? <AssetInlineEditor key={row.id} row={inlineRow} onCancel={() => { setInlineRow(null); requestAnimationFrame(restoreListFocus); }} onSaved={() => { setInlineRow(null); load(query, true, detailScroll.current?.y, restoreListFocus); }} /> : <TableRow key={row.id}>
              <TableCell className="whitespace-normal pl-2"><Button variant="ghost" disabled={locked} className="h-auto min-h-14 w-full justify-start px-2 py-1.5 text-left whitespace-normal" data-asset-id={row.id} aria-label={`Mở tài sản ${row.ten_tai_san}`} onClick={e => { detailTrigger.current = e.currentTarget; detailScroll.current = { x: window.scrollX, y: window.scrollY }; openDetail(row.id); }}><AssetIdentity row={row} /></Button></TableCell>
              <TableCell className="break-words whitespace-normal">{userLabel(row)}{row.nguoi_su_dung && row.nguoi_su_dung.tinh_trang_lam_viec !== "ACTIVE" && <span className="mt-1 block text-xs text-destructive">Cần bàn giao</span>}</TableCell>
              <TableCell className="break-words whitespace-normal text-muted-foreground">{row.vi_tri?.ten_vi_tri || "Chưa rõ"}</TableCell>
              <TableCell className="whitespace-normal"><Badge variant={row.tinh_trang === "HONG" ? "destructive" : "secondary"}>{ASSET_CONDITIONS[row.tinh_trang]}</Badge></TableCell>
              {canManage && <TableCell><Button variant="ghost" className="min-h-10" disabled={locked || pending} data-asset-id={row.id} aria-label={`Sửa nhanh ${row.ten_tai_san}`} onClick={e => { detailTrigger.current = e.currentTarget; detailScroll.current = { x: window.scrollX, y: window.scrollY }; setInlineRow(row); }}><Pencil aria-hidden="true" className="size-4" /><span className="sr-only">Sửa</span></Button></TableCell>}
            </TableRow>)}</TableBody></Table></div>
          </>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p role="status">{list.total.toLocaleString("vi-VN")} hồ sơ · Trang {list.page}/{list.pages}</p><div className="flex gap-2"><Button className="min-h-10" variant="outline" size="icon-lg" aria-label="Trang trước" disabled={pending || locked || list.page <= 1} onClick={() => load({ ...query, page: list.page - 1 })}><ChevronLeft className="size-4" /></Button><Button className="min-h-10" variant="outline" size="icon-lg" aria-label="Trang sau" disabled={pending || locked || list.page >= list.pages} onClick={() => load({ ...query, page: list.page + 1 })}><ChevronRight className="size-4" /></Button></div></div>
    </>}
    <Sheet open={selected !== null} onOpenChange={open => { if (!open) { ++latestDetail.current; setSelected(null); setDetail(null); } }}><SheetContent className="w-full max-w-none overflow-y-auto sm:max-w-xl" onCloseAutoFocus={e => { e.preventDefault(); if (editing === undefined) restoreListFocus(); }}><SheetHeader className="pr-12"><Button variant="ghost" className="min-h-10 justify-self-start px-0 sm:hidden" onClick={() => { ++latestDetail.current; setSelected(null); setDetail(null); }}><ArrowLeft aria-hidden="true" className="size-4" />Quay lại</Button><SheetTitle>Chi tiết tài sản</SheetTitle><SheetDescription>Thông tin hiện tại và lịch sử thay đổi.</SheetDescription></SheetHeader><div className="px-4 pb-6">{detail ? <AssetDetail key={`${detail.id}:${detail.updated_at.toISOString()}`} row={detail} canManage={canManage} onEdit={focus => { setEditFocus(focus); setEditing(detail); setSelected(null); }} /> : detailError ? <div role="alert" className="space-y-2"><p>{detailError}</p><Button className="min-h-10" variant="outline" onClick={() => selected && openDetail(selected)}>Tải lại hồ sơ</Button></div> : <Skeleton className="h-72 w-full" />}</div></SheetContent></Sheet>
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open) setEditing(undefined); }}><DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto sm:max-w-2xl" onCloseAutoFocus={e => { e.preventDefault(); if (selected === null) restoreListFocus(); }}><DialogHeader><DialogTitle>{editing ? "Sửa tài sản" : "Thêm tài sản"}</DialogTitle><DialogDescription>Ghi nhận thông tin đã xác minh; có thể bổ sung người và vị trí sau.</DialogDescription></DialogHeader>{editing !== undefined && <AssetForm key={editing ? `${editing.id}:${editing.updated_at.toISOString()}` : "new"} row={editing} categories={categories} defaultCategoryId={contextCategory?.dang_su_dung ? contextCategory.id : undefined} initialFocus={editFocus} onCancel={() => setEditing(undefined)} onSaved={id => { setEditing(undefined); if (screen === "assets") load(query, true); else refreshOverview(); openDetail(id); }} />}</DialogContent></Dialog>
    <Dialog open={categoryList} onOpenChange={setCategoryList}><DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Loại tài sản</DialogTitle><DialogDescription>Ngừng dùng loại sẽ giữ nguyên các hồ sơ đang liên kết.</DialogDescription></DialogHeader><Button className="min-h-10 justify-self-start" onClick={() => { setCategoryList(false); setCategoryEdit(null); }}><Plus className="size-4" />Thêm loại tài sản</Button>{!categories.length && <EmptyPanel title="Chưa có loại tài sản" />}{categories.map(c => <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div className="flex min-w-0 items-center gap-3"><AssetCategoryIcon code={c.ma_loai} /><div className="min-w-0"><p className="break-words font-medium">{c.ten_loai}</p><p className="text-xs text-muted-foreground">{c.ma_loai} · {c.dang_su_dung ? "Đang dùng" : "Ngừng dùng"}</p></div></div><Button className="min-h-10" variant="outline" size="icon-lg" aria-label={`Sửa loại ${c.ten_loai}`} onClick={() => { setCategoryList(false); setCategoryEdit(c); }}><Pencil className="size-4" /></Button></div>)}</DialogContent></Dialog>
    <Dialog open={categoryEdit !== undefined} onOpenChange={open => { if (!open) setCategoryEdit(undefined); }}><DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{categoryEdit ? "Sửa loại tài sản" : "Thêm loại tài sản"}</DialogTitle><DialogDescription>Mã loại dùng để phân biệt và giữ ổn định sau khi tạo.</DialogDescription></DialogHeader>{categoryEdit !== undefined && <AssetCategoryForm row={categoryEdit} onCancel={() => setCategoryEdit(undefined)} onSaved={() => { setCategoryEdit(undefined); if (screen === "assets") load(query, true); else refreshOverview(); }} />}</DialogContent></Dialog>
  </div>;
}
