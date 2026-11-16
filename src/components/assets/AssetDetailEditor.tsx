"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { SaveAssetSchema } from "@/lib/validations/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { locationPath } from "@/lib/location-tree";
import { getAssetAssignmentOptions, saveAsset } from "@/actions/asset";
import { getLocationOptions } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetFinanceFields } from "./AssetFinanceFields";
import { assetFormValues } from "./asset-form-values";
import type { AssetRow, AssetCategory } from "./types";

export type DetailField = "name" | "categoryId" | "condition" | "assignment" | "departmentId" | "locationId" | "model" | "serial" | "notes" | "finance";
type Values = z.input<typeof SaveAssetSchema>;
export function AssetDetailEditor({ row, target, categories, onSaved, onCancel }: { row: AssetRow; target: DetailField; categories: AssetCategory[]; onSaved: (row: AssetRow) => void; onCancel: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [options, setOptions] = useState<SearchableOption[] | null>(null);
  const root = useRef<HTMLFormElement>(null);
  const focused = useRef(false);
  const needsOptions = ["assignment", "departmentId", "locationId"].includes(target);
  const form = useForm<Values, unknown, z.output<typeof SaveAssetSchema>>({ resolver: zodResolver(SaveAssetSchema), defaultValues: assetFormValues(row) });
  const usage = useWatch({ control: form.control, name: "usage" });
  useEffect(() => {
    if (!needsOptions) return;
    let cancelled = false;
    async function load() {
      let choices: SearchableOption[];
      if (target === "locationId") {
        const r = await getLocationOptions(); if (!r.success) throw Error(r.message);
        choices = r.rows.map(p => ({ value: String(p.id), label: locationPath(p.id, r.rows) }));
        if (row.vi_tri && !choices.some(p => p.value === String(row.vi_tri_id))) choices.unshift({ value: String(row.vi_tri.id), label: row.vi_tri.ten_vi_tri, disabled: true });
      } else {
        const r = await getAssetAssignmentOptions(); if (!r.success) throw Error(r.message);
        choices = target === "assignment" ? r.employees.map(p => ({ value: String(p.id), label: p.ho_ten, description: p.ma_nhan_su })) : r.departments.map(p => ({ value: String(p.id), label: p.ten_phong_ban, description: p.ma_phong_ban }));
        if (target === "assignment" && row.nguoi_su_dung && !choices.some(p => p.value === String(row.nguoi_su_dung_id))) choices.unshift({ value: String(row.nguoi_su_dung.id), label: row.nguoi_su_dung.ho_ten, description: "Cần bàn giao", disabled: true });
      }
      if (!cancelled) { setOptions(choices); setLoadError(""); }
    }
    load().catch(() => { if (!cancelled) setLoadError("Không tải được danh mục. Hãy thử lại."); });
    return () => { cancelled = true; };
  }, [needsOptions, target, row, attempt]);
  useEffect(() => {
    if (focused.current || (needsOptions && !options)) return;
    const frame = requestAnimationFrame(() => {
      const first = target === "assignment" ? root.current?.querySelector<HTMLButtonElement>('[aria-label="Người sử dụng"]') : root.current?.querySelector<HTMLElement>('input,textarea,[role="combobox"]');
      first?.focus({ preventScroll: true });
      if (first?.getAttribute("role") === "combobox") first.click();
      focused.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [needsOptions, options, target]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (form.formState.isDirty || pending) event.preventDefault(); };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [form.formState.isDirty, pending]);
  function catalog(name: "categoryId" | "departmentId" | "locationId" | "employeeId", label: string, choices: SearchableOption[], required = false) {
    return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel required={required}>{label}</FormLabel><FormControl><SearchableSelect {...field} label={label} value={field.value ? String(field.value) : "none"} options={choices} disabled={pending || (needsOptions && !options)} aria-required={required} onValueChange={v => {
      field.onChange(v === "none" ? null : Number(v));
      if (name === "employeeId" && v !== "none") form.setValue("usage", "CA_NHAN", { shouldDirty: true });
    }} /></FormControl><FormMessage /></FormItem>} />;
  }
  function enumeration(name: "usage" | "condition", label: string, choices: Record<string, string>) {
    return <FormField control={form.control} name={name} render={({ field }) => <FormItem><FormLabel required>{label}</FormLabel><Select value={field.value} onValueChange={v => { field.onChange(v); if (name === "usage" && v !== "CA_NHAN") form.setValue("employeeId", null, { shouldDirty: true }); }}><FormControl><SelectTrigger ref={field.ref} aria-required className="min-h-10 w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(choices).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />;
  }
  return <Form {...form}><form ref={root} noValidate aria-label="Sửa thông tin tài sản" className="space-y-3 rounded-lg border bg-muted/20 p-3" onSubmit={form.handleSubmit(values => {
    if (pending || (needsOptions && !options)) return;
    start(async () => {
      setError("");
      try {
        const result = await saveAsset(values);
        if (!result.success) {
          setError(result.message);
          if ("fieldErrors" in result && result.fieldErrors) for (const [field, messages] of Object.entries(result.fieldErrors)) if (messages?.[0]) form.setError(field as keyof Values, { message: messages[0] });
          return;
        }
        toast.success(result.message); onSaved(result.row);
      } catch { setError("Không kết nối được máy chủ. Nội dung đang sửa vẫn được giữ."); }
    });
  })}>
    <fieldset disabled={pending} className="min-w-0 space-y-3">
      {(["name", "serial", "model", "notes"] as string[]).includes(target) && <FormField control={form.control} name={target as "name" | "serial" | "model" | "notes"} render={({ field }) => <FormItem><FormLabel required={target === "name"}>{{ name: "Tên tài sản", serial: "Serial / Service tag", model: "Hãng / Model", notes: "Ghi chú" }[target as "name"]}</FormLabel><FormControl>{target === "notes" ? <Textarea {...field} value={field.value ?? ""} className="text-base" rows={4} /> : <Input {...field} value={field.value ?? ""} aria-required={target === "name"} className="text-base" />}</FormControl><FormMessage /></FormItem>} />}
      {target === "categoryId" && catalog("categoryId", "Loại tài sản", categories.map(c => ({ value: String(c.id), label: c.ten_loai, disabled: !c.dang_su_dung })), true)}
      {target === "condition" && enumeration("condition", "Tình trạng", ASSET_CONDITIONS)}
      {target === "assignment" && <>{enumeration("usage", "Hình thức sử dụng", ASSET_USAGES)}{catalog("employeeId", "Người sử dụng", options ?? [], usage === "CA_NHAN")}</>}
      {target === "departmentId" && catalog("departmentId", "Phòng quản lý", [{ value: "none", label: "Chưa xác định" }, ...(options ?? [])])}
      {target === "locationId" && catalog("locationId", "Vị trí", [{ value: "none", label: "Chưa xác định" }, ...(options ?? [])])}
      {target === "finance" && <AssetFinanceFields defaultMonths={categories.find(c => c.id === row.loai_tai_san_id)?.khau_hao_mac_dinh_thang} />}
    </fieldset>
    {needsOptions && !options && !loadError && <p role="status" className="text-sm text-muted-foreground">Đang tải lựa chọn…</p>}
    {loadError && <div role="alert"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" onClick={() => setAttempt(v => v + 1)}>Tải lại danh mục</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-10" disabled={pending} onClick={onCancel}>Hủy</Button><Button type="submit" className="min-h-10" disabled={pending || (needsOptions && !options)}>{pending ? "Đang lưu…" : "Lưu"}</Button></div>
  </form></Form>;
}
