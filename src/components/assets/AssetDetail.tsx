"use client";
import { useEffect, useState } from "react";
import { History, Pencil } from "lucide-react";
import { getAssetHistory } from "@/actions/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetCategoryIcon } from "./AssetCategoryIcon";
import type { AssetRow } from "./types";

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

export function AssetDetail({ row, canManage, onEdit }: { row: AssetRow; canManage: boolean; onEdit: (focus?: "employee" | "location") => void }) {
  return <div className="space-y-5">
    <div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted"><AssetCategoryIcon code={row.loai_tai_san.ma_loai} className="size-6" /></span><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{row.ten_tai_san}</h2><p className="mt-1 text-sm text-muted-foreground">{row.ma_tai_san}</p></div></div>
    <div className="flex flex-wrap items-center gap-2"><Badge variant={row.tinh_trang === "HONG" ? "destructive" : "secondary"}>{ASSET_CONDITIONS[row.tinh_trang]}</Badge><Badge variant="outline">{ASSET_USAGES[row.hinh_thuc_su_dung]}</Badge>{canManage && <Button className="ml-auto min-h-10" variant="outline" onClick={() => onEdit()}><Pencil aria-hidden="true" className="size-4" />Sửa tài sản</Button>}</div>
    {row.nguoi_su_dung && row.nguoi_su_dung.tinh_trang_lam_viec !== "ACTIVE" && <p role="status" className="rounded-lg border bg-muted p-3 text-sm">Người sử dụng không còn ở trạng thái đang làm việc. Cần kiểm tra và xử lý bàn giao thiết bị.</p>}
    {!row.loai_tai_san.dang_su_dung && <p className="text-sm text-muted-foreground">Loại tài sản này đã ngừng dùng cho hồ sơ mới.</p>}
    <Tabs defaultValue="information"><TabsList className="mb-3 min-h-11 w-full"><TabsTrigger className="min-h-10" value="information">Thông tin</TabsTrigger><TabsTrigger className="min-h-10" value="history"><History aria-hidden="true" className="size-4" />Lịch sử</TabsTrigger></TabsList>
      <TabsContent value="information" className="space-y-4"><dl className="grid gap-4 sm:grid-cols-2">{[
        ["Loại tài sản", row.loai_tai_san.ten_loai], ["Người sử dụng", row.nguoi_su_dung?.ho_ten],
        ["Vị trí", row.vi_tri?.ten_vi_tri], ["Phòng quản lý", row.phong_quan_ly?.ten_phong_ban],
        ["Hãng / Model", row.hang_model], ["Serial / Service tag", row.so_serial],
      ].map(([label, data]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 flex items-start justify-between gap-2 text-sm font-medium"><span className="min-w-0 break-words">{data || "Chưa xác định"}</span>{canManage && (label === "Người sử dụng" || label === "Vị trí") && <Button variant="ghost" className="min-h-10 shrink-0 px-2 text-xs" aria-label={label === "Vị trí" ? "Đổi vị trí" : "Đổi người sử dụng"} onClick={() => onEdit(label === "Vị trí" ? "location" : "employee")}>Đổi</Button>}</dd></div>)}</dl>
        {row.ghi_chu && <details className="rounded-lg border"><summary className="min-h-10 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-ring">Ghi chú</summary><p className="whitespace-pre-wrap break-words border-t p-3 text-sm">{row.ghi_chu}</p></details>}
      </TabsContent>
      <TabsContent value="history"><AssetHistory id={row.id} /></TabsContent>
    </Tabs>
  </div>;
}
