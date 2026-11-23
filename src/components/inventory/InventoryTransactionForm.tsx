"use client";
import { useEffect, useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getInventoryDetail, recordInventoryTransaction } from "@/actions/inventory";
import { InventoryTransactionSchema, type InventoryTransactionInput } from "@/lib/validations/inventory";
import { INVENTORY_LABELS, createInventoryRequestId } from "@/lib/inventory";
import { Form, FormRequiredHint } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TextField, PickField, useDraftGuard } from "./InventoryForms";
import type { InventoryDetail, InventoryOptions } from "./types";
export type TransactionTarget = { operation: InventoryTransactionInput["operation"]; issueId?: number; reversalId?: number };
export function InventoryTransactionForm({ detail, target, options, initialValues, onBusy, onSaved, onCancel, onBlocked }: { detail: InventoryDetail; target: TransactionTarget; options: InventoryOptions; initialValues?: Partial<InventoryTransactionInput>; onBusy?: (busy: boolean) => void; onSaved: () => void; onCancel: () => void; onBlocked: (v: boolean) => void }) {
  const [current, setCurrent] = useState(detail), [error, setError] = useState(""), [refreshing, setRefreshing] = useState(false);
  const op = target.operation;
  const pooled = detail.row.loai_vat_tu.hang_muc === "TIEU_HAO";
  const [requestId] = useState(createInventoryRequestId);
  const form = useForm<InventoryTransactionInput>({ resolver: zodResolver(InventoryTransactionSchema), defaultValues: {
    quantity: op === "DAO_GIAO_DICH" ? 0 : 1, fromId: null, toId: null, employeeId: null, departmentId: null,
    issueId: target.issueId ?? null, reversalId: target.reversalId ?? null, price: null, reason: "", notes: "", expected: detail.expected, ...initialValues, itemId: detail.row.id, operation: op, requestId: initialValues?.requestId ?? requestId,
  } });
  const v = useWatch({ control: form.control }), busy = form.formState.isSubmitting || refreshing;
  useDraftGuard(form.formState.isDirty || busy);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useEffect(() => { onBlocked(form.formState.isDirty || busy); return () => onBlocked(false); }, [form.formState.isDirty, busy, onBlocked]);
  const source = current.stock.find(r => r.locationId === v.fromId)?.quantity ?? 0;
  const destination = current.stock.find(r => r.locationId === v.toId)?.quantity ?? 0;
  const issue = current.issues.find(r => r.id === target.issueId);
  const original = current.history.find(r => r.id === target.reversalId) ?? detail.history.find(r => r.id === target.reversalId);
  const qty = v.quantity ?? 0;
  const needFrom = ["CAP_PHAT", "CHUYEN_NOI_GIU", "DIEU_CHINH_GIAM"].includes(op);
  const needTo = ["TON_DAU", "NHAP", "THU_HOI", "CHUYEN_NOI_GIU", "DIEU_CHINH_TANG"].includes(op);
  const reasonRequired = ["TON_DAU", "DIEU_CHINH_TANG", "DIEU_CHINH_GIAM", "GIAM_DANG_CAP", "DAO_GIAO_DICH"].includes(op);
  async function refresh() {
    setRefreshing(true); try { const next = await getInventoryDetail(detail.row.id, detail.page); if (!next.success) { setError(next.message); return; } setCurrent(next); form.setValue("expected", next.expected); setError("Đã cập nhật số dư. Hãy kiểm tra số lượng trước khi xác nhận."); } catch { setError("Không cập nhật được số dư. Vui lòng thử lại."); } finally { setRefreshing(false); }
  }
  async function save(values: InventoryTransactionInput) {
    setError(""); try {
      const r = await recordInventoryTransaction(values);
      if (!r.success) { setError(r.message); if ("fieldErrors" in r) for (const [key, msgs] of Object.entries(r.fieldErrors ?? {})) if (msgs?.[0]) form.setError(key as Path<InventoryTransactionInput>, { message: msgs[0] }, { shouldFocus: true }); return; }
      form.reset(values); onBlocked(false); toast.success("Đã ghi nhận giao dịch"); onSaved();
    } catch { setError("Chưa nhận được kết quả. Giữ nguyên nội dung và bấm xác nhận lại để kiểm tra; hệ thống không ghi trùng yêu cầu."); }
  }
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(save, () => setError("Kiểm tra các trường được đánh dấu."))}>
    <p className="font-medium">{current.row.ten_mat_hang} <span className="text-muted-foreground">· {current.row.don_vi_tinh}</span></p><FormRequiredHint />
    <fieldset disabled={busy} className="space-y-4">
      {!pooled && needFrom && <PickField form={form} name="fromId" label="Nơi xuất" required options={options.locations.filter(l => op !== "CAP_PHAT" || l.active).map(l => ({ value: String(l.id), label: l.name, description: `${l.path} · Còn ${current.stock.find(s => s.locationId === l.id)?.quantity ?? 0} ${current.row.don_vi_tinh}` }))} />}
      {!pooled && needTo && <PickField form={form} name="toId" label="Nơi nhập" required options={options.locations.filter(l => l.active).map(l => ({ value: String(l.id), label: l.name, description: l.path }))} />}
      {op === "CAP_PHAT" && <div className="space-y-3"><p className="text-sm text-muted-foreground">Chọn một người hoặc một phòng nhận.</p><PickField form={form} name="employeeId" label="Người nhận" options={[{ value: "none", label: "Không chọn người" }, ...options.employees.map(e => ({ value: String(e.id), label: e.ho_ten, description: e.ma_nhan_su }))]} /><PickField form={form} name="departmentId" label="Phòng nhận" options={[{ value: "none", label: "Không chọn phòng" }, ...options.departments.map(d => ({ value: String(d.id), label: d.ten_phong_ban }))]} /></div>}
      {target.issueId && <p className="rounded-lg bg-muted p-3 text-sm">{issue ? `${issue.nhan_su_nhan?.ho_ten ?? issue.phong_ban_nhan?.ten_phong_ban} · Còn giữ ${issue.remaining} ${current.row.don_vi_tinh}` : "Lần cấp đã hết số dư hoặc thay đổi. Hãy đóng và cập nhật hồ sơ."}</p>}
      {op !== "DAO_GIAO_DICH" ? <TextField form={form} name="quantity" label="Số lượng" required numeric /> : <p className="rounded-lg bg-muted p-3 text-sm">Đảo toàn bộ {original?.so_luong} {current.row.don_vi_tinh} của lần {original ? INVENTORY_LABELS[original.loai_giao_dich].toLocaleLowerCase("vi") : "đã chọn"}. Bản ghi gốc vẫn được giữ trong lịch sử.</p>}
      {op === "NHAP" && <TextField form={form} name="price" label="Đơn giá (VND)" />}
      <TextField form={form} name="reason" label="Lý do" required={reasonRequired} />
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Ghi chú</summary><div className="pt-3"><TextField form={form} name="notes" label="Ghi chú giao dịch" multiline /></div></details>
    </fieldset>
    <div aria-label="Số lượng dự kiến" aria-live="polite" className="rounded-lg bg-muted p-3 text-sm space-y-1">
      {pooled && op !== "DAO_GIAO_DICH" && <p>Còn lại: {source} → {source + (needFrom ? -qty : qty)} {current.row.don_vi_tinh}</p>}
      {pooled && op === "DAO_GIAO_DICH" && original && <p>Còn lại: {source} → {source + (["CAP_PHAT", "DIEU_CHINH_GIAM"].includes(original.loai_giao_dich) ? original.so_luong : -original.so_luong)} {current.row.don_vi_tinh}</p>}
      {needFrom && v.fromId && <p>Nơi xuất: {source} → {source - qty} {current.row.don_vi_tinh}</p>}
      {needTo && v.toId && <p>Nơi nhập: {destination} → {destination + qty} {current.row.don_vi_tinh}</p>}
      {issue && <p>Đang giữ: {issue.remaining} → {issue.remaining - qty} {current.row.don_vi_tinh}</p>}
      {op === "CAP_PHAT" && <p>{current.row.loai_vat_tu.hang_muc === "PHU_KIEN" ? `Tăng số đang cấp: ${qty} ${current.row.don_vi_tinh}` : "Cấp ra được tính là xuất dùng."}</p>}
      {op === "DAO_GIAO_DICH" && original && <>{original.vi_tri_xuat_id && <p>Nơi xuất: {current.stock.find(r => r.locationId === original.vi_tri_xuat_id)?.quantity ?? 0} → {(current.stock.find(r => r.locationId === original.vi_tri_xuat_id)?.quantity ?? 0) + original.so_luong} {current.row.don_vi_tinh}</p>}{original.vi_tri_nhap_id && <p>Nơi nhập: {current.stock.find(r => r.locationId === original.vi_tri_nhap_id)?.quantity ?? 0} → {(current.stock.find(r => r.locationId === original.vi_tri_nhap_id)?.quantity ?? 0) - original.so_luong} {current.row.don_vi_tinh}</p>}{current.row.loai_vat_tu.hang_muc === "PHU_KIEN" && (original.loai_giao_dich === "CAP_PHAT" || original.cap_phat_goc_id) && <p>Đang giữ: {current.issues.find(r => r.id === (original.cap_phat_goc_id ?? original.id))?.remaining ?? 0} → {(current.issues.find(r => r.id === (original.cap_phat_goc_id ?? original.id))?.remaining ?? 0) + (original.loai_giao_dich === "CAP_PHAT" ? -original.so_luong : original.so_luong)} {current.row.don_vi_tinh}</p>}<p>Số dư và các lần thu hồi liên quan sẽ được kiểm tra trước khi ghi.</p></>}
      {!current.recorded && <p>Chưa ghi nhận tồn.</p>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-2"><Button type="button" variant="ghost" onClick={refresh} disabled={busy}>Cập nhật số dư</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button><Button type="submit" disabled={busy}>{busy ? "Đang xử lý…" : "Xác nhận ghi nhận"}</Button></div>
  </form></Form>;
}
