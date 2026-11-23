"use client";
import { useEffect, useState } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createInventoryRequestId } from "@/lib/inventory";
import { saveInventoryCategory, saveInventoryItem } from "@/actions/inventory";
import { InventoryCategorySchema, InventoryItemSchema, type InventoryCategoryInput, type InventoryItemInput, type InventoryKind } from "@/lib/validations/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import type { InventoryCategory, InventoryItem, InventoryOptions } from "./types";
export function TextField<T extends FieldValues>({ form, name, label, required, disabled, numeric, multiline }: { form: UseFormReturn<T>; name: Path<T>; label: string; required?: boolean; disabled?: boolean; numeric?: boolean; multiline?: boolean }) {
  return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel required={required}>{label}</FormLabel><FormControl>{multiline ? <Textarea {...field} value={field.value ?? ""} aria-required={required} disabled={disabled} /> : <Input {...field} value={field.value ?? ""} aria-required={required} disabled={disabled} type={numeric ? "number" : "text"} min={numeric ? 0 : undefined} step={numeric ? 1 : undefined} onChange={e => field.onChange(numeric ? e.target.value === "" ? null : Number(e.target.value) : name === "price" ? e.target.value || null : e.target.value)} />}</FormControl><FormMessage /></FormItem>} />;
}
export function PickField<T extends FieldValues>({ form, name, label, options, required }: { form: UseFormReturn<T>; name: Path<T>; label: string; options: SearchableOption[]; required?: boolean }) {
  return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel required={required}>{label}</FormLabel><FormControl><SearchableSelect label={label} ref={field.ref} onBlur={field.onBlur} value={field.value == null ? "none" : String(field.value)} onValueChange={v => field.onChange(v === "none" ? null : Number(v))} options={options} aria-required={required} /></FormControl><FormMessage /></FormItem>} />;
}
function ActiveField<T extends FieldValues>({ form }: { form: UseFormReturn<T> }) {
  return <FormField control={form.control} name={"active" as Path<T>} render={({ field }) => <FormItem className="flex items-center gap-3"><FormControl><Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} /></FormControl><FormLabel>Đang sử dụng</FormLabel><FormMessage /></FormItem>} />;
}
export function useDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const click = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("a[href]") && !window.confirm("Có nội dung chưa lưu. Bỏ thay đổi để chuyển trang?")) { e.preventDefault(); e.stopImmediatePropagation(); } };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty]);
}
export function InventoryItemForm({ row, kind, options, recorded, initialValues, onBusy, onSaved, onCancel, onBlocked }: { row?: InventoryItem; kind: InventoryKind; options: InventoryOptions; recorded?: boolean; initialValues?: Partial<InventoryItemInput>; onBusy?: (busy: boolean) => void; onSaved: (r: InventoryItem) => void; onCancel: () => void; onBlocked: (v: boolean) => void }) {
  const [initialRequestId] = useState(createInventoryRequestId);
  const form = useForm<InventoryItemInput>({ resolver: zodResolver(InventoryItemSchema), defaultValues: { ...(row ? { id: row.id, version: row.updated_at.toISOString(), name: row.ten_mat_hang, categoryId: row.loai_vat_tu_id, unit: row.don_vi_tinh, minimum: row.muc_ton_toi_thieu, departmentId: row.phong_quan_ly_id, notes: row.ghi_chu ?? "", active: row.dang_su_dung } : { name: "", categoryId: 0, unit: "", initialQuantity: null, initialRequestId, minimum: null, departmentId: null, notes: "", active: true }), ...initialValues } });
  const [error, setError] = useState("");
  const busy = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  useDraftGuard(dirty || busy);
  useEffect(() => { onBlocked(dirty || busy); return () => onBlocked(false); }, [dirty, busy, onBlocked]);
  async function save(v: InventoryItemInput) {
    setError("");
    try {
      const r = await saveInventoryItem(v);
      if (!r.success) { setError(r.message); if ("fieldErrors" in r) for (const [key, msgs] of Object.entries(r.fieldErrors ?? {})) if (msgs?.[0]) form.setError(key as Path<InventoryItemInput>, { message: msgs[0] }); return; }
      form.reset(v); onBlocked(false); toast.success("Đã lưu mặt hàng"); onSaved(r.row);
    } catch { setError("Chưa lưu được. Nội dung đang nhập vẫn được giữ; hãy thử lại."); }
  }
  return <Form {...form}><form onSubmit={form.handleSubmit(save, () => setError("Kiểm tra các trường được đánh dấu."))} noValidate className="space-y-4"><FormRequiredHint />{row && <p className="text-sm text-muted-foreground">{row.ma_mat_hang}</p>}<fieldset disabled={busy} className="space-y-4">
    <TextField form={form} name="name" label="Tên mặt hàng" required />
    <PickField form={form} name="categoryId" label="Loại mặt hàng" required options={options.categories.filter(c => c.hang_muc === kind).map(c => ({ value: String(c.id), label: c.ten_loai, disabled: !c.dang_su_dung && c.id !== row?.loai_vat_tu_id }))} />
    <div className="grid gap-4 sm:grid-cols-2"><div><TextField form={form} name="unit" label="Đơn vị tính" required /><p className="mt-1 text-xs text-muted-foreground">{recorded ? "Sửa tên đơn vị sẽ cập nhật cách hiển thị cả lịch sử, không thay đổi số lượng." : "Ví dụ: lọ, hộp, cái — không nhập số lượng ở đây."}</p></div><TextField form={form} name="minimum" label="Mức tồn tối thiểu" numeric /></div>
    {!row && kind === "TIEU_HAO" && <div><TextField form={form} name="initialQuantity" label="Số lượng ban đầu" numeric /><p className="mt-1 text-xs text-muted-foreground">Để trống nếu chưa kiểm đếm. Nhập 0 khi đã xác nhận hết hàng.</p></div>}
    <PickField form={form} name="departmentId" label="Phòng quản lý" options={[{ value: "none", label: "Chưa xác định" }, ...options.departments.map(d => ({ value: String(d.id), label: d.ten_phong_ban }))]} />
    <TextField form={form} name="notes" label="Ghi chú" multiline /><ActiveField form={form} />
  </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button><Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mặt hàng"}</Button></div></form></Form>;
}
export function InventoryCategoryForm({ row, kind, onSaved, onCancel, onBlocked }: { row?: InventoryCategory; kind: InventoryKind; onSaved: () => void; onCancel: () => void; onBlocked: (v: boolean) => void }) {
  const form = useForm<InventoryCategoryInput>({ resolver: zodResolver(InventoryCategorySchema), defaultValues: row ? { id: row.id, version: row.updated_at.toISOString(), code: row.ma_loai, name: row.ten_loai, kind: row.hang_muc, description: row.mo_ta ?? "", active: row.dang_su_dung } : { code: "", name: "", kind, description: "", active: true } });
  const [error, setError] = useState(""); const busy = form.formState.isSubmitting; const dirty = form.formState.isDirty;
  useDraftGuard(dirty || busy);
  useEffect(() => { onBlocked(dirty || busy); return () => onBlocked(false); }, [dirty, busy, onBlocked]);
  async function save(v: InventoryCategoryInput) {
    setError(""); try { const r = await saveInventoryCategory(v); if (!r.success) { setError(r.message); if ("fieldErrors" in r) for (const [key, msgs] of Object.entries(r.fieldErrors ?? {})) if (msgs?.[0]) form.setError(key as Path<InventoryCategoryInput>, { message: msgs[0] }); return; } form.reset(v); onBlocked(false); toast.success("Đã lưu loại mặt hàng"); onSaved(); } catch { setError("Chưa lưu được. Nội dung đang nhập vẫn được giữ."); }
  }
  return <Form {...form}><form noValidate onSubmit={form.handleSubmit(save, () => setError("Kiểm tra các trường được đánh dấu."))} className="space-y-4"><FormRequiredHint /><fieldset disabled={busy} className="space-y-4"><TextField form={form} name="code" label="Mã loại" required disabled={Boolean(row)} /><TextField form={form} name="name" label="Tên loại" required /><TextField form={form} name="description" label="Mô tả" multiline /><ActiveField form={form} /></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button><Button disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu loại"}</Button></div></form></Form>;
}
