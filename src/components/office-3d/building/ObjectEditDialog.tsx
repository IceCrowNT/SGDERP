"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAsset, getAssetCategories } from "@/actions/asset";
import { getEmployeeForEdit } from "@/actions/employee";
import { AssetDetail } from "@/components/assets/AssetDetail";
import type { AssetRow, AssetCategory } from "@/components/assets/types";
import { EmployeeForm } from "@/components/employees/EmployeeManager";
import { LocationEditor } from "@/components/locations/LocationEditDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export type ObjectEditTarget = { kind: "location"; id: number } | { kind: "person"; id: number } | { kind: "asset"; ids: number[] };
export function ObjectEditDialog({ target, onClose }: { target: ObjectEditTarget; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const title = target.kind === "location" ? "Sửa thông tin vị trí" : target.kind === "person" ? "Sửa nhân sự" : "Sửa tài sản";
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (editing) event.preventDefault(); };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [editing]);
  return <Dialog open onOpenChange={open => { if (!open && !editing) onClose(); }}>
    <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-2xl" showCloseButton={!editing}
      onInteractOutside={event => event.preventDefault()}
      onEscapeKeyDown={event => { if (editing) { event.preventDefault(); toast.info("Hãy lưu hoặc hủy nội dung đang sửa."); } }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>
        {target.kind === "asset" ? "Bấm vào thông tin cần sửa trong hồ sơ." : target.kind === "person" ? "Cập nhật hồ sơ nhân sự. Ghi nhận nghỉ việc sẽ khóa tài khoản liên kết." : "Cập nhật tên và mô tả của vị trí đang chọn."}
      </DialogDescription></DialogHeader>
      {target.kind === "location" ? <LocationEditor locationId={target.id} onBusy={setEditing} onClose={onClose} />
        : target.kind === "person" ? <PersonEditor id={target.id} onEditingChange={setEditing} onClose={onClose} />
          : <AssetEditor ids={target.ids} onEditingChange={setEditing} />}
    </DialogContent>
  </Dialog>;
}
function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{message}</p><Button variant="outline" onClick={retry}>Thử lại</Button></div>;
}
function PersonEditor({ id, onEditingChange, onClose }: { id: number; onEditingChange: (value: boolean) => void; onClose: () => void }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof getEmployeeForEdit>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getEmployeeForEdit(id).then(r => { if (!cancelled) setResult(r); }).catch(() => { if (!cancelled) setResult({ success: false, message: "Không tải được hồ sơ nhân sự." }); });
    return () => { cancelled = true; };
  }, [id, attempt]);
  if (!result) return <Skeleton className="h-48" aria-label="Đang tải hồ sơ nhân sự" />;
  if (!result.success) return <LoadError message={result.message} retry={() => { setResult(null); setAttempt(a => a + 1); }} />;
  return <EmployeeForm employee={result.employee} departments={result.departments} workLocations={result.workLocations}
    accountAccess={false} roles={[]} accounts={[]} done={onClose} onEditingChange={onEditingChange} />;
}
function AssetEditor({ ids, onEditingChange }: { ids: number[]; onEditingChange: (value: boolean) => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<AssetRow[] | null>(null);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selected, setSelected] = useState<number | null>(ids.length === 1 ? ids[0] : null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [catalog, results] = await Promise.all([getAssetCategories(), Promise.all(ids.map(id => getAsset(id)))]);
      if (!catalog.success || !catalog.canManage) throw Error("Không có quyền sửa tài sản.");
      const records: AssetRow[] = [];
      for (const r of results) { if (!r.success || !r.canManage) throw Error("Không thể tải tài sản hoặc quyền sửa đã thay đổi."); records.push(r.row); }
      if (!cancelled) { setCategories(catalog.rows); setRows(records); }
    }
    load().catch(e => { if (!cancelled) setError(e instanceof Error && e.message.startsWith("Không") ? e.message : "Không tải được hồ sơ tài sản."); });
    return () => { cancelled = true; };
  }, [ids, attempt]);
  if (error) return <LoadError message={error} retry={() => { setError(""); setAttempt(a => a + 1); }} />;
  if (!rows) return <Skeleton className="h-48" aria-label="Đang tải hồ sơ tài sản" />;
  const row = rows.find(r => r.id === selected);
  if (!row) return <div className="space-y-3"><p className="text-sm text-muted-foreground">Hình này đại diện nhiều tài sản. Chọn hồ sơ cần sửa.</p>
    <Input aria-label="Tìm tài sản cần sửa" placeholder="Tìm tên, mã tài sản…" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="max-h-72 space-y-2 overflow-y-auto">{rows.filter(r => `${r.ten_tai_san} ${r.ma_tai_san}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))).map(r => <Button key={r.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal text-left" onClick={() => setSelected(r.id)}>{r.ten_tai_san} · {r.ma_tai_san}</Button>)}</div>
  </div>;
  return <AssetDetail key={row.id} row={row} categories={categories} canManage onEditingChange={onEditingChange}
    onSaved={updated => { setRows(old => old!.map(r => r.id === updated.id ? updated : r)); router.refresh(); }} />;
}
