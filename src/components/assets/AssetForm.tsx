"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAssetAssignmentOptions, saveAsset, saveAssetCategory } from "@/actions/asset";
import { getLocationOptions } from "@/actions/location";
import { SaveAssetSchema, SaveAssetCategorySchema } from "@/lib/validations/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { locationPath } from "@/lib/location-tree";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetRow, AssetCategory, AssetAssignments } from "./types";
import { AssetCategoryIcon } from "./AssetCategoryIcon";

type AssetInput = z.input<typeof SaveAssetSchema>;
type CategoryInput = z.input<typeof SaveAssetCategorySchema>;

export function AssetForm({ row, categories, onSaved, onCancel, defaultCategoryId, initialFocus }: { row: AssetRow | null; categories: AssetCategory[]; onSaved: (id: number) => void; onCancel: () => void; defaultCategoryId?: number; initialFocus?: "employee" | "location" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<{ people: AssetAssignments["employees"]; departments: AssetAssignments["departments"]; locations: { id: number; name: string }[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [extraOpen, setExtraOpen] = useState(false);
  const form = useForm<AssetInput, unknown, z.output<typeof SaveAssetSchema>>({
    resolver: zodResolver(SaveAssetSchema),
    defaultValues: {
      id: row?.id, version: row?.updated_at.toISOString(), name: row?.ten_tai_san ?? "",
      categoryId: row?.loai_tai_san_id ?? defaultCategoryId ?? 0, condition: row?.tinh_trang ?? "CHUA_XAC_NHAN",
      usage: row?.hinh_thuc_su_dung ?? "CHUA_XAC_DINH", departmentId: row?.phong_quan_ly_id ?? null,
      employeeId: row?.nguoi_su_dung_id ?? null, locationId: row?.vi_tri_id ?? null,
      serial: row?.so_serial ?? "", model: row?.hang_model ?? "", notes: row?.ghi_chu ?? "",
    },
  });
  const usage = useWatch({ control: form.control, name: "usage" });
  const focused = useRef(false);
  useEffect(() => {
    if (!initialFocus || !choices || focused.current) return;
    focused.current = true;
    const field = initialFocus === "location" ? "locationId" : usage === "CA_NHAN" ? "employeeId" : "usage";
    requestAnimationFrame(() => form.setFocus(field));
  }, [choices, initialFocus, usage, form]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([getAssetAssignmentOptions(), getLocationOptions()]).then(([a, l]) => {
      if (cancelled) return;
      if (!a.success || !l.success) { setLoadError(!a.success ? a.message : !l.success ? l.message : "Không tải được danh mục."); return; }
      setLoadError("");
      setChoices({ people: a.employees, departments: a.departments, locations: l.rows.map(p => ({ id: p.id, name: locationPath(p.id, l.rows) })) });
    }).catch(() => { if (!cancelled) setLoadError("Không tải được danh mục. Hãy thử lại."); });
    return () => { cancelled = true; };
  }, [attempt]);
  const people = [...(choices?.people ?? [])];
  if (row?.nguoi_su_dung && !people.some(p => p.id === row.nguoi_su_dung_id)) people.unshift(row.nguoi_su_dung);
  function focusError(fields: string[]) {
    if (fields.some(field => ["serial", "model", "notes"].includes(field))) setExtraOpen(true);
    const first = fields.find(field => !["id", "version"].includes(field));
    if (first) requestAnimationFrame(() => form.setFocus(first as keyof AssetInput));
  }
  const submit = form.handleSubmit(v => start(async () => {
    setError("");
    try {
      const r = await saveAsset(v);
      if (!r.success) {
        setError(r.message);
        if ("fieldErrors" in r && r.fieldErrors) {
          for (const [field, messages] of Object.entries(r.fieldErrors)) if (messages?.[0]) form.setError(field as keyof AssetInput, { message: messages[0] });
          focusError(Object.keys(r.fieldErrors));
        }
        toast.error(r.message); return;
      }
      toast.success(r.message); onSaved(r.id);
    } catch { setError("Không kết nối được máy chủ. Nội dung đã nhập vẫn được giữ; hãy thử lại."); }
  }), errors => { setError("Kiểm tra thông tin được đánh dấu bên dưới."); focusError(Object.keys(errors)); });
  return <Form {...form}><form noValidate onSubmit={submit} className="space-y-5">
    <FormRequiredHint />
    {row && <p className="text-sm text-muted-foreground">Mã tài sản: {row.ma_tai_san}</p>}
    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel required>Tên tài sản</FormLabel><FormControl><Input {...field} aria-required="true" className="text-base" /></FormControl><FormMessage /></FormItem>} />
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField control={form.control} name="categoryId" render={({ field }) => <FormItem><FormLabel required>Loại tài sản</FormLabel><FormControl><SearchableSelect label="Loại tài sản" ref={field.ref} onBlur={field.onBlur} aria-required="true" value={field.value ? String(field.value) : ""} onValueChange={v => field.onChange(Number(v))} placeholder="Chọn loại tài sản" options={categories.map(c => ({ value: String(c.id), label: c.ten_loai, keywords: c.ma_loai, description: c.dang_su_dung ? undefined : "Ngừng dùng", icon: <AssetCategoryIcon code={c.ma_loai} className="size-4" />, disabled: !c.dang_su_dung }))} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="condition" render={({ field }) => <FormItem><FormLabel required>Tình trạng</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required="true" className="min-h-10 w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(ASSET_CONDITIONS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
      <FormField control={form.control} name="usage" render={({ field }) => <FormItem><FormLabel required>Hình thức sử dụng</FormLabel><Select value={field.value} onValueChange={v => { field.onChange(v); if (v !== "CA_NHAN") form.setValue("employeeId", null, { shouldValidate: true }); }}><FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required="true" className="min-h-10 w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(ASSET_USAGES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
      {usage === "CA_NHAN" && <FormField control={form.control} name="employeeId" render={({ field }) => <FormItem><FormLabel required>Người sử dụng</FormLabel><FormControl><SearchableSelect label="Người sử dụng" ref={field.ref} onBlur={field.onBlur} aria-required="true" value={field.value ? String(field.value) : ""} onValueChange={v => field.onChange(Number(v))} disabled={!choices} placeholder="Chọn người sử dụng" options={people.map(p => ({ value: String(p.id), label: p.ho_ten, description: `${p.ma_nhan_su}${p.tinh_trang_lam_viec !== "ACTIVE" ? " · Cần bàn giao" : ""}`, disabled: p.tinh_trang_lam_viec !== "ACTIVE" }))} /></FormControl><FormMessage /></FormItem>} />}
      <FormField control={form.control} name="departmentId" render={({ field }) => <FormItem><FormLabel>Phòng quản lý</FormLabel><FormControl><SearchableSelect label="Phòng quản lý" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : "none"} onValueChange={v => field.onChange(v === "none" ? null : Number(v))} disabled={!choices} options={[{ value: "none", label: "Chưa xác định" }, ...(choices?.departments.map(p => ({ value: String(p.id), label: p.ten_phong_ban, keywords: p.ma_phong_ban })) ?? [])]} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="locationId" render={({ field }) => <FormItem><FormLabel>Vị trí</FormLabel><FormControl><SearchableSelect label="Vị trí" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : "none"} onValueChange={v => field.onChange(v === "none" ? null : Number(v))} disabled={!choices} searchPlaceholder="Tìm tên hoặc đường dẫn vị trí…" options={[{ value: "none", label: "Chưa xác định" }, ...(choices?.locations.map(p => ({ value: String(p.id), label: p.name })) ?? [])]} /></FormControl><FormMessage /></FormItem>} />
    </div>
    <details open={extraOpen} onToggle={e => setExtraOpen(e.currentTarget.open)} className="rounded-lg border">
      <summary className="min-h-10 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-ring">Thông tin bổ sung</summary>
      <div className="space-y-4 border-t p-3"><div className="grid gap-4 sm:grid-cols-2">
      {([['serial', 'Serial / Service tag'], ['model', 'Hãng / Model']] as const).map(([name, label]) => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} className="text-base" /></FormControl><FormMessage /></FormItem>} />)}
      </div>
    <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Ghi chú</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} rows={3} className="text-base" /></FormControl><FormMessage /></FormItem>} />
      </div>
    </details>
    {!choices && !loadError && <p role="status" className="text-sm text-muted-foreground">Đang tải danh mục lựa chọn…</p>}
    {loadError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{loadError}</p><Button className="min-h-10" type="button" variant="outline" onClick={() => setAttempt(v => v + 1)}>Tải lại danh mục</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2 border-t pt-4"><Button className="min-h-10" type="button" variant="outline" onClick={onCancel} disabled={pending}>Hủy</Button><Button className="min-h-10" type="submit" disabled={pending || !choices}>{pending && <Loader2 className="size-4 animate-spin" />}Lưu tài sản</Button></div>
  </form></Form>;
}

export function AssetCategoryForm({ row, onSaved, onCancel }: { row: AssetCategory | null; onSaved: () => void; onCancel: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const form = useForm<CategoryInput, unknown, z.output<typeof SaveAssetCategorySchema>>({ resolver: zodResolver(SaveAssetCategorySchema), defaultValues: { id: row?.id, version: row?.updated_at.toISOString(), code: row?.ma_loai ?? "", name: row?.ten_loai ?? "", description: row?.mo_ta ?? "", active: row?.dang_su_dung ?? true } });
  return <Form {...form}><form noValidate className="space-y-4" onSubmit={form.handleSubmit(v => start(async () => {
    setError("");
    try {
      const r = await saveAssetCategory(v);
      if (!r.success) { setError(r.message); if ("fieldErrors" in r && r.fieldErrors) for (const [field, messages] of Object.entries(r.fieldErrors)) if (messages?.[0]) form.setError(field as keyof CategoryInput, { message: messages[0] }); return; }
      toast.success(r.message); onSaved();
    } catch { setError("Không kết nối được máy chủ. Hãy thử lại."); }
  }))}>
    <FormRequiredHint />
    {([['code', 'Mã loại'], ['name', 'Tên loại']] as const).map(([name, label]) => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel required={name === "name" || !row}>{label}</FormLabel><FormControl><Input {...field} aria-required={name === "name" || !row} readOnly={name === "code" && Boolean(row)} className="text-base" /></FormControl><FormMessage /></FormItem>} />)}
    <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Mô tả</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} className="text-base" /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="active" render={({ field }) => <FormItem className="flex items-center gap-3"><FormControl><Checkbox ref={field.ref} onBlur={field.onBlur} checked={field.value} onCheckedChange={v => field.onChange(v === true)} /></FormControl><FormLabel>Cho phép chọn khi thêm thiết bị</FormLabel><FormMessage /></FormItem>} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2 border-t pt-4"><Button className="min-h-10" type="button" variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button><Button className="min-h-10" type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Lưu loại tài sản</Button></div>
  </form></Form>;
}
