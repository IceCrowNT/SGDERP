"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { getAssetAssignmentOptions, saveAsset } from "@/actions/asset";
import { getLocationOptions } from "@/actions/location";
import { SaveAssetSchema } from "@/lib/validations/asset";
import { ASSET_CONDITIONS, ASSET_USAGES } from "@/lib/asset-labels";
import { locationPath } from "@/lib/location-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableRow, TableCell } from "@/components/ui/table";
import type { AssetRow, AssetAssignments } from "./types";

type InputValues = z.input<typeof SaveAssetSchema>;

export function AssetInlineEditor({ row, onCancel, onSaved }: { row: AssetRow; onCancel: () => void; onSaved: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [choices, setChoices] = useState<{ people: AssetAssignments["employees"]; locations: { id: number; name: string }[] } | null>(null);
  const formId = `edit-asset-${row.id}`;
  const form = useForm<InputValues, unknown, z.output<typeof SaveAssetSchema>>({ resolver: zodResolver(SaveAssetSchema), defaultValues: {
    id: row.id, version: row.updated_at.toISOString(), name: row.ten_tai_san, categoryId: row.loai_tai_san_id,
    condition: row.tinh_trang, usage: row.hinh_thuc_su_dung, employeeId: row.nguoi_su_dung_id,
    locationId: row.vi_tri_id, departmentId: row.phong_quan_ly_id,
    serial: row.so_serial ?? "", model: row.hang_model ?? "", notes: row.ghi_chu ?? "",
  } });
  const usage = useWatch({ control: form.control, name: "usage" });
  const dirty = form.formState.isDirty;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(`input[form="${formId}"]`);
      input?.closest("tr")?.scrollIntoView({ block: "nearest", inline: "start" });
      input?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [formId]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const followLink = (e: MouseEvent) => {
      if (e.defaultPrevented || !(e.target instanceof Element) || !e.target.closest("a[href]")) return;
      e.preventDefault(); e.stopPropagation(); toast.info("Lưu hoặc Hủy dòng đang sửa trước khi chuyển trang.");
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", followLink, true); };
  }, [dirty, pending]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([getAssetAssignmentOptions(), getLocationOptions()]).then(([a, l]) => {
      if (cancelled) return;
      if (!a.success || !l.success) { setLoadError(!a.success ? a.message : !l.success ? l.message : "Không tải được danh mục."); return; }
      setLoadError(""); setChoices({ people: a.employees, locations: l.rows.map(p => ({ id: p.id, name: locationPath(p.id, l.rows) })) });
    }).catch(() => { if (!cancelled) setLoadError("Không tải được danh mục. Hãy thử lại."); });
    return () => { cancelled = true; };
  }, [attempt]);
  const people = [...(choices?.people ?? [])];
  if (row.nguoi_su_dung && !people.some(p => p.id === row.nguoi_su_dung_id)) people.unshift(row.nguoi_su_dung);
  const locations = choices?.locations.map(l => ({ value: String(l.id), label: l.name })) ?? [];
  if (row.vi_tri && !locations.some(l => l.value === String(row.vi_tri_id))) locations.unshift({ value: String(row.vi_tri.id), label: row.vi_tri.ten_vi_tri });
  const submit = form.handleSubmit(v => {
    if (pending || !choices) return;
    start(async () => {
      setError("");
      try {
        const result = await saveAsset(v);
        if (!result.success) {
          setError(result.message);
          if ("fieldErrors" in result && result.fieldErrors) for (const [field, messages] of Object.entries(result.fieldErrors)) if (messages?.[0]) form.setError(field as keyof InputValues, { message: messages[0] });
          return;
        }
        toast.success(result.message); onSaved();
      } catch { setError("Không kết nối được máy chủ. Nội dung đang sửa được giữ lại; hãy thử Lưu lại."); }
    });
  }, () => setError("Kiểm tra các ô được đánh dấu trên dòng đang sửa."));
  return <Form {...form}>
    <TableRow data-inline-editor={row.id} className="bg-muted/40 [&>td]:align-top [&>td]:whitespace-normal [&>td]:py-3">
      <TableCell><FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel required>Tên tài sản</FormLabel><FormControl><Input {...field} form={formId} aria-required="true" disabled={pending} className="text-base" /></FormControl><FormMessage /></FormItem>} /><p className="mt-2 text-xs text-muted-foreground">{row.ma_tai_san}</p></TableCell>
      <TableCell className="space-y-3"><FormField control={form.control} name="usage" render={({ field }) => <FormItem><FormLabel required>Hình thức sử dụng</FormLabel><Select value={field.value} disabled={pending} onValueChange={v => { field.onChange(v); if (v !== "CA_NHAN") form.setValue("employeeId", null, { shouldDirty: true, shouldValidate: true }); }}><FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required="true" className="min-h-10 w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(ASSET_USAGES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
        {usage === "CA_NHAN" && <FormField control={form.control} name="employeeId" render={({ field }) => <FormItem><FormLabel required>Người sử dụng</FormLabel><FormControl><SearchableSelect label="Người sử dụng" ref={field.ref} onBlur={field.onBlur} aria-required="true" disabled={pending || !choices} value={field.value ? String(field.value) : ""} onValueChange={v => field.onChange(Number(v))} placeholder="Chọn người sử dụng" options={people.map(p => ({ value: String(p.id), label: p.ho_ten, description: `${p.ma_nhan_su}${p.tinh_trang_lam_viec !== "ACTIVE" ? " · Cần bàn giao" : ""}`, disabled: p.tinh_trang_lam_viec !== "ACTIVE" }))} /></FormControl><FormMessage /></FormItem>} />}
      </TableCell>
      <TableCell><FormField control={form.control} name="locationId" render={({ field }) => <FormItem><FormLabel>Vị trí</FormLabel><FormControl><SearchableSelect label="Vị trí" ref={field.ref} onBlur={field.onBlur} disabled={pending || !choices} value={field.value ? String(field.value) : "none"} onValueChange={v => field.onChange(v === "none" ? null : Number(v))} options={[{ value: "none", label: "Chưa xác định" }, ...locations]} /></FormControl><FormMessage /></FormItem>} /></TableCell>
      <TableCell><FormField control={form.control} name="condition" render={({ field }) => <FormItem><FormLabel required>Tình trạng</FormLabel><Select value={field.value} disabled={pending} onValueChange={field.onChange}><FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required="true" className="min-h-10 w-full"><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(ASSET_CONDITIONS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} /></TableCell>
      <TableCell><form id={formId} aria-label={`Sửa nhanh ${row.ten_tai_san}`} noValidate onSubmit={submit} className="flex flex-col gap-2"><Button type="submit" className="min-h-10" disabled={pending || !choices}>{pending ? "Đang lưu…" : "Lưu"}</Button><Button type="button" variant="outline" className="min-h-10" disabled={pending} onClick={onCancel}>Hủy</Button></form></TableCell>
    </TableRow>
    <TableRow><TableCell colSpan={5} className="space-y-2 whitespace-normal bg-muted/40 py-3"><FormRequiredHint /><p className="text-sm text-muted-foreground">Lưu hoặc Hủy để tiếp tục xem danh sách.</p>{!choices && !loadError && <p role="status">Đang tải danh mục…</p>}{loadError && <div role="alert"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" className="min-h-10" onClick={() => setAttempt(v => v + 1)}>Tải lại danh mục</Button></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</TableCell></TableRow>
  </Form>;
}
