"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getWorkflowDetail, saveWorkflowMaterials } from "@/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDraftGuard } from "@/components/inventory/InventoryForms";
type Data = Extract<Awaited<ReturnType<typeof getWorkflowDetail>>, { success: true }>;
export function WorkflowMaterials({ data, onBlocked }: { data: Data; onBlocked: (value: boolean) => void }) {
  const router = useRouter();
  const initial = data.materials.map(l => ({ itemId: l.mat_hang_vat_tu_id, departmentId: l.phong_ban_nhan_id, quantity: l.so_luong }));
  const [lines, setLines] = useState(initial), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const dirty = editing && JSON.stringify(lines) !== JSON.stringify(initial);
  useDraftGuard(dirty || busy);
  useEffect(() => { onBlocked(dirty || busy); return () => onBlocked(false); }, [dirty, busy, onBlocked]);
  if (!data.canEditMaterials && !data.materials.length) return null;
  async function save() {
    setBusy(true); setError("");
    try {
      const r = await saveWorkflowMaterials({ id: data.record.id, version: data.record.version, lines });
      if (!r.success) { setError(r.message); return; }
      setEditing(false); router.refresh();
    } catch { setError("Chưa xác nhận lưu được. Giữ nội dung, thử lại hoặc tải lại hồ sơ để đối chiếu."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Vật tư sử dụng" className="space-y-4 rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Vật tư sử dụng</h2>{data.canEditMaterials && !editing && <Button variant="outline" onClick={() => { setLines(initial); setEditing(true); }}>Sửa vật tư</Button>}</div>
    <p className="text-sm text-muted-foreground">{data.record.status === "COMPLETED" ? "Đã ghi tiêu hao khi hoàn thành hồ sơ. Điều chỉnh sau đó được lưu trong lịch sử mặt hàng." : ["CANCELLED", "REJECTED"].includes(data.record.status) ? "Hồ sơ không hoàn thành; các dòng này chưa trừ tồn." : "Lưu các dòng bên dưới chưa trừ tồn. Khi hoàn thành hồ sơ, người chốt cần quyền quản lý vật tư; hệ thống kiểm tra đủ tồn và ghi tiêu hao một lần."}</p>
    {editing ? <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        {lines.map((line,i) => <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
          <SearchableSelect label={`Vật tư dòng ${i+1}`} placeholder="Chọn vật tư…" value={line.itemId ? String(line.itemId) : undefined} options={data.materialItems.map(m => ({ value: String(m.id), label: m.ten_mat_hang, description: `${m.ma_mat_hang} · ${m.don_vi_tinh}` }))} onValueChange={v => setLines(lines.map((l,j) => i===j ? { ...l, itemId: Number(v) } : l))} />
          <SearchableSelect label={`Phòng sử dụng dòng ${i+1}`} placeholder="Chọn phòng sử dụng…" value={line.departmentId ? String(line.departmentId) : undefined} options={data.materialDepartments.map(d => ({ value: String(d.id), label: d.ten_phong_ban }))} onValueChange={v => setLines(lines.map((l,j) => i===j ? { ...l, departmentId: Number(v) } : l))} />
          <label className="flex items-center gap-2 text-sm">Số lượng<Input aria-label={`Số lượng dòng ${i+1}`} className="w-24" type="number" required min={1} step={1} value={line.quantity || ""} onChange={e => setLines(lines.map((l,j) => i===j ? { ...l, quantity: Number(e.target.value) } : l))} /><span>{data.materialItems.find(m => m.id===line.itemId)?.don_vi_tinh}</span></label>
          <Button type="button" variant="ghost" onClick={() => setLines(lines.filter((_,j) => j!==i))} aria-label={`Bỏ dòng ${i+1}`}>Bỏ dòng</Button>
        </div>)}
        <Button type="button" variant="outline" disabled={lines.length>=50} onClick={() => setLines([...lines, { itemId: 0, departmentId: 0, quantity: 1 }])}>Thêm vật tư</Button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(false); setLines(initial); setError(""); }}>Hủy</Button><Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu vật tư"}</Button></div>
    </form> : !data.materials.length ? <p className="text-sm text-muted-foreground">Chưa ghi vật tư sử dụng.</p> : <ul className="divide-y">{data.materials.map(l => <li key={l.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><Link className="font-medium hover:underline" href={`/inventory?kind=consumable&item=${l.mat_hang_vat_tu_id}`}>{l.mat_hang.ten_mat_hang}</Link><p className="text-muted-foreground">{l.phong_nhan.ten_phong_ban}</p></div><span>{l.so_luong} {l.mat_hang.don_vi_tinh}</span></li>)}</ul>}
  </section>;
}
