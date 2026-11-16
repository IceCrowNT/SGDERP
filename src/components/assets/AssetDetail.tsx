"use client";
import { useEffect, useState } from "react";
import { History, Pencil, LockKeyhole } from "lucide-react";
import { getAssetHistory } from "@/actions/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetCategoryIcon } from "./AssetCategoryIcon";
import { AssetQrCard } from "./AssetQrCard";
import { AssetDetailEditor, type DetailField } from "./AssetDetailEditor";
import { AssetDepreciationBar } from "./AssetDepreciationBar";
import { assetDepreciation, displayAssetDate, displayVnd } from "@/lib/asset-depreciation";
import { toast } from "sonner";
import type { AssetRow, AssetCategory } from "./types";

type HistoryRow = Extract<Awaited<ReturnType<typeof getAssetHistory>>, { success: true }>["rows"][number];
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const value = (v: unknown) => typeof v === "string" && v ? v : "Chưa xác định";
function snapshot(v: unknown) {
  const s = object(v);
  return {
    "Tên tài sản": value(s.ten_tai_san), "Loại tài sản": value(object(s.loai_tai_san).ten_loai),
    "Tình trạng": ASSET_CONDITIONS[s.tinh_trang as keyof typeof ASSET_CONDITIONS] ?? "Chưa xác nhận",
    "Hình thức sử dụng": ASSET_USAGES[s.hinh_thuc_su_dung as keyof typeof ASSET_USAGES] ?? "Chưa xác định",
    "Phòng quản lý": value(object(s.phong_quan_ly).ten_phong_ban), "Người sử dụng": value(object(s.nguoi_su_dung).ho_ten),
    "Vị trí": value(object(s.vi_tri).ten_vi_tri), "Serial / Service tag": value(s.so_serial),
    "Hãng / Model": value(s.hang_model), "Ghi chú": value(s.ghi_chu),
    "Ngày mua": displayAssetDate(typeof s.ngay_mua === "string" ? s.ngay_mua : null),
    "Giá mua": displayVnd(typeof s.gia_mua === "string" ? s.gia_mua : null),
    "Khấu hao": typeof s.thoi_gian_khau_hao_thang === "number" ? `${s.thoi_gian_khau_hao_thang} tháng` : "Chưa xác định",
    "Hết hạn bảo hành": displayAssetDate(typeof s.han_bao_hanh === "string" ? s.han_bao_hanh : null),
  };
}
function AssetHistory({ id }: { id: number }) {
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getAssetHistory(id).then(r => {
      if (cancelled) return;
      if (r.success) { setHistory(r.rows); setError(""); } else setError(r.message);
    }).catch(() => { if (!cancelled) setError("Không tải được lịch sử."); });
    return () => { cancelled = true; };
  }, [id, attempt]);
  return <section aria-label="Lịch sử tài sản" className="space-y-3">
      {error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button className="min-h-10" variant="outline" onClick={() => setAttempt(v => v + 1)}>Tải lại lịch sử</Button></div>
        : !history ? <div role="status" aria-label="Đang tải lịch sử"><Skeleton className="h-24 w-full" /></div>
          : !history.length ? <p className="text-sm text-muted-foreground">Chưa có lịch sử thay đổi.</p>
            : <ol className="space-y-3">{history.map(h => {
              const before = snapshot(h.du_lieu_cu), after = snapshot(h.du_lieu_moi);
              const changes = Object.entries(after).filter(([label, text]) => !h.du_lieu_cu || before[label as keyof typeof before] !== text);
              return <li key={h.id} className="rounded-xl border"><details className="group"><summary className="min-h-10 cursor-pointer rounded-xl p-3 text-sm focus-visible:outline-ring"><span className="font-medium">{h.hanh_dong === "CREATE" ? "Tạo hồ sơ" : "Cập nhật hồ sơ"}</span><span className="ml-2 text-xs text-muted-foreground">{h.hanh_dong !== "CREATE" && `${changes.length} mục thay đổi`}</span><span className="mt-1 block pl-4 text-xs text-muted-foreground">{h.ho_ten} · {new Date(h.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span></summary><dl className="space-y-3 border-t p-3">{changes.map(([label, text]) => <div key={label} className="text-sm"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words">{h.du_lieu_cu && <><span className="text-muted-foreground">{before[label as keyof typeof before]}</span><span aria-label="thành"> → </span></>}{text}</dd></div>)}</dl></details></li>;
            })}</ol>}
      {history?.length === 50 && <p className="text-xs text-muted-foreground">Đang hiển thị 50 thay đổi gần nhất.</p>}
    </section>;
}

export function AssetDetail({ row, canManage, categories, onSaved, onEditingChange }: { row: AssetRow; canManage: boolean; categories: AssetCategory[]; onSaved: (row: AssetRow) => void; onEditingChange: (editing: boolean) => void }) {
  const [active, setActive] = useState<DetailField | null>(null);
  const depreciation = assetDepreciation(row.ngay_mua, row.thoi_gian_khau_hao_thang, row.gia_mua);
  function begin(target: DetailField) { if (!canManage || active) return; onEditingChange(true); setActive(target); }
  function finish(updated?: AssetRow) {
    const target = active; setActive(null); onEditingChange(false);
    if (updated) onSaved(updated);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-detail-field="${target}"]`)?.focus({ preventScroll: true }));
  }
  function editor(target: DetailField) {
    return <AssetDetailEditor row={row} target={target} categories={categories} onCancel={() => finish()} onSaved={finish} />;
  }
  function valueButton(target: DetailField, label: string, value: React.ReactNode) {
    return canManage ? <Button data-detail-field={target} variant="ghost" aria-label={`Sửa ${label.toLocaleLowerCase("vi")}`} disabled={active !== null} onClick={() => begin(target)} className={`group h-auto min-h-10 w-full justify-start gap-2 px-2 py-1 text-left whitespace-normal font-medium ${target === "name" ? "text-xl font-semibold" : ""}`}><span className="min-w-0 flex-1 break-words">{value}</span><Pencil aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground opacity-50 group-hover:opacity-100" /></Button>
      : <span className="block min-h-10 break-words py-2">{value}</span>;
  }
  function field(target: DetailField, label: string, value: string | null | undefined) {
    return <div key={target} className={active === target ? "sm:col-span-2" : ""}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{active === target ? editor(target) : valueButton(target, label, value || "Chưa xác định")}</dd></div>;
  }
  function guardCollapse(event: React.MouseEvent, target: DetailField) {
    if (active === target) { event.preventDefault(); toast.info("Lưu hoặc Hủy thông tin đang sửa trước khi thu gọn."); }
  }
  return <div className="space-y-5">
    <div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted"><AssetCategoryIcon code={row.loai_tai_san.ma_loai} className="size-6" /></span><div className="min-w-0 flex-1">{active === "name" ? editor("name") : <h2 aria-label={row.ten_tai_san} className="break-words text-xl font-semibold">{valueButton("name", "Tên tài sản", row.ten_tai_san)}</h2>}<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><LockKeyhole aria-hidden="true" className="size-3" /><span aria-label="Mã tài sản tự sinh, không thể sửa">{row.ma_tai_san}</span></p></div></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div>{active === "condition" ? editor("condition") : valueButton("condition", "Tình trạng", <Badge variant={row.tinh_trang === "HONG" ? "destructive" : "secondary"}>{ASSET_CONDITIONS[row.tinh_trang]}</Badge>)}</div>
      <div>{valueButton("assignment", "Hình thức sử dụng", <Badge variant="outline">{ASSET_USAGES[row.hinh_thuc_su_dung]}</Badge>)}</div>
    </div>
    {row.nguoi_su_dung && row.nguoi_su_dung.tinh_trang_lam_viec !== "ACTIVE" && <p role="status" className="rounded-lg border bg-muted p-3 text-sm">Người sử dụng không còn ở trạng thái đang làm việc. Cần kiểm tra và xử lý bàn giao thiết bị.</p>}
    {!row.loai_tai_san.dang_su_dung && <p className="text-sm text-muted-foreground">Loại tài sản này đã ngừng dùng cho hồ sơ mới.</p>}
    <Tabs defaultValue="information"><TabsList className="mb-3 min-h-11 w-full"><TabsTrigger className="min-h-10" value="information">Thông tin</TabsTrigger><TabsTrigger disabled={active !== null} className="min-h-10" value="history"><History aria-hidden="true" className="size-4" />Lịch sử</TabsTrigger></TabsList>
      <TabsContent value="information" className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          {field("categoryId", "Loại tài sản", row.loai_tai_san.ten_loai)}
          {field("assignment", "Người sử dụng", row.nguoi_su_dung?.ho_ten)}
          {field("locationId", "Vị trí", row.vi_tri?.ten_vi_tri)}
          {field("departmentId", "Phòng quản lý", row.phong_quan_ly?.ten_phong_ban)}
          {field("model", "Hãng / Model", row.hang_model)}
          {field("serial", "Serial / Service tag", row.so_serial)}
        </dl>
        {(row.ghi_chu || canManage) && <details className="rounded-lg border"><summary onClick={event => guardCollapse(event, "notes")} className="min-h-10 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-ring">Ghi chú</summary><div className="whitespace-pre-wrap break-words border-t p-3 text-sm">{active === "notes" ? editor("notes") : valueButton("notes", "Ghi chú", row.ghi_chu || "Thêm ghi chú")}</div></details>}
        <details className="rounded-lg border"><summary onClick={event => guardCollapse(event, "finance")} className="min-h-11 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-ring">Mua sắm & khấu hao</summary><div className="space-y-3 border-t p-3">
          {active === "finance" ? editor("finance") : <dl className="grid gap-3 sm:grid-cols-2">{[
            ["Ngày mua", displayAssetDate(row.ngay_mua)], ["Giá mua (VND)", displayVnd(row.gia_mua)],
            ["Khấu hao (tháng)", row.thoi_gian_khau_hao_thang ? `${row.thoi_gian_khau_hao_thang} tháng` : "Chưa xác định"], ["Hết hạn bảo hành", displayAssetDate(row.han_bao_hanh)],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{valueButton("finance", label, value)}</dd></div>)}</dl>}
          {depreciation && <div className="rounded-lg bg-muted p-3 text-sm"><AssetDepreciationBar purchase={row.ngay_mua} months={row.thoi_gian_khau_hao_thang} /><p className="mt-2 text-xs text-muted-foreground">Kết thúc: {displayAssetDate(depreciation.endDate)}{depreciation.remainingValue !== null && ` · Giá trị còn lại: ${displayVnd(depreciation.remainingValue)}`}</p></div>}
          {!active && <p className="text-xs text-muted-foreground">Thông tin tùy chọn. Khấu hao tính đều từ ngày mua, dùng để tham khảo quản lý.</p>}
        </div></details>
        <AssetQrCard id={row.id} code={row.ma_tai_san} name={row.ten_tai_san} />
      </TabsContent>
      <TabsContent value="history"><AssetHistory key={row.updated_at.toISOString()} id={row.id} /></TabsContent>
    </Tabs>
  </div>;
}
