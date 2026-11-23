"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { approveAiWork, cancelAiWork, getAiWork, refreshAiWork } from "@/actions/ai-work";
import { updateInventoryReceiptWork } from "@/actions/ai-inventory-receipt";
import { getInventoryOptions } from "@/actions/inventory";
import { InventoryReceiptRequestSchema, type InventoryReceiptRequest, type InventoryReceiptWorkView } from "@/lib/ai-inventory-receipt";
import { workStatusLabels, type AiWorkView } from "@/lib/ai-work";
import type { InventoryOptions } from "@/components/inventory/types";
import { TextField, useDraftGuard } from "@/components/inventory/InventoryForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AiInventoryReceiptCard({ work, onChange }: { work: InventoryReceiptWorkView; onChange: (work: AiWorkView) => void }) {
  const [pending, start] = useTransition(), [error, setError] = useState(""), [uncertain, setUncertain] = useState(false), [editing, setEditing] = useState(false);
  const editable = ["CHO_DUYET", "CAN_LAM_MOI"].includes(work.status);
  function run(operation: "approve" | "refresh" | "cancel" | "status") {
    if (pending) return;
    setError("");
    start(async () => {
      try {
        const id = { id: work.id, version: work.version };
        const result = operation === "approve" ? await approveAiWork(id) : operation === "refresh" ? await refreshAiWork(id) : operation === "cancel" ? await cancelAiWork(id) : await getAiWork({ id: work.id });
        if (!result.success) { setError(result.message); setUncertain(true); return; }
        onChange(result.work); setUncertain(false);
        if (result.work.status === "HOAN_TAT") toast.success("Đã ghi nhận nhập hàng");
      } catch { setUncertain(true); setError("Chưa xác nhận được kết quả. Tải trạng thái trước khi thử lại."); }
    });
  }
  return <article aria-label={`Công việc AI ${work.id}`} aria-busy={pending} className="min-w-0 space-y-4 rounded-xl border bg-background p-3 text-foreground sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><PackagePlus className="size-4 text-primary" />Ghi nhận hàng vừa mua</h3><span role="status" className="rounded-full bg-muted px-3 py-1 text-xs">{pending ? "Đang xử lý…" : workStatusLabels[work.status]}</span></div>
    <div className="space-y-3 md:hidden">{work.snapshot.rows.map((row, i) => <section key={i} className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.createItem ? work.result ? "Đã tạo mặt hàng" : "Tạo mặt hàng mới" : "Mặt hàng hiện có"}</p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2"><dt className="text-muted-foreground">Loại</dt><dd className="break-words">{row.categoryName || "Chưa chọn"}{row.createCategory ? work.result ? " · Đã tạo loại" : " · Tạo loại mới" : ""}</dd>
        <dt className="text-muted-foreground">Nhập thêm</dt><dd>+{row.quantity} {row.unit}</dd><dt className="text-muted-foreground">Nơi giữ</dt><dd className="break-words">{row.locationName}</dd>
        <dt className="text-muted-foreground">Tồn trước → sau</dt><dd>{row.locationId || row.kind === "TIEU_HAO" ? `${row.before} → ${row.after} ${row.unit}` : "Chưa chọn nơi giữ"}</dd>
        <dt className="text-muted-foreground">Đơn giá</dt><dd>{row.price === null ? "Chưa có" : `${BigInt(row.price).toLocaleString("vi-VN")} VND`}</dd></dl>
      {row.notes && <p className="text-muted-foreground">{row.notes}</p>}{row.issues.map(issue => <p key={issue} className="text-destructive">{issue}</p>)}
    </section>)}</div>
    <div className="hidden overflow-x-auto rounded-lg border md:block" role="region" aria-label="Bảng nhập hàng trước và sau" tabIndex={0}><Table>
      <TableHeader><TableRow><TableHead>Mặt hàng</TableHead><TableHead>Loại</TableHead><TableHead>Nhập thêm</TableHead><TableHead>Nơi giữ</TableHead><TableHead>Tồn trước → sau</TableHead>{work.snapshot.rows.some(r => r.price !== null) && <TableHead>Đơn giá (VND)</TableHead>}</TableRow></TableHeader>
      <TableBody>{work.snapshot.rows.map((row, i) => <TableRow key={i}>
        <TableCell className="min-w-36"><span className="font-medium">{row.name}</span><span className="block text-xs text-muted-foreground">{row.createItem ? work.result ? "Đã tạo mặt hàng" : "Tạo mặt hàng mới" : "Mặt hàng hiện có"}</span>{row.notes && <span className="block text-xs text-muted-foreground">{row.notes}</span>}{row.issues.map(issue => <span key={issue} className="block text-xs text-destructive">{issue}</span>)}</TableCell>
        <TableCell className="max-w-40 whitespace-normal break-words">{row.categoryName || "Chưa chọn"}{row.createCategory && <span className="block text-xs text-muted-foreground">{work.result ? "Đã tạo loại" : "Tạo loại mới"}</span>}</TableCell>
        <TableCell className="whitespace-nowrap">+{row.quantity} {row.unit}</TableCell><TableCell className="max-w-48 whitespace-normal break-words">{row.locationName}</TableCell>
        <TableCell className="whitespace-nowrap">{row.locationId || row.kind === "TIEU_HAO" ? `${row.before} → ${row.after} ${row.unit}` : "Chọn nơi giữ để xem tồn"}</TableCell>
        {work.snapshot.rows.some(r => r.price !== null) && <TableCell>{row.price === null ? "Chưa có" : BigInt(row.price).toLocaleString("vi-VN")}</TableCell>}
      </TableRow>)}</TableBody>
    </Table></div>
    {work.result && <div role="status" className="space-y-2 text-sm"><p>Đã nhập {work.result.rows.length} mặt hàng. Tạo mới {work.result.createdItems} mặt hàng và {work.result.createdCategories} loại.</p><div className="flex flex-wrap gap-2">{work.result.rows.map(row => <Button key={row.itemId} asChild variant="outline" size="sm"><Link href={`/inventory?kind=${row.kind === "PHU_KIEN" ? "accessory" : "consumable"}&item=${row.itemId}`}>Xem {row.name}</Link></Button>)}</div></div>}
    {work.status === "CAN_LAM_MOI" && <p role="alert" className="text-sm text-destructive">Danh mục hoặc tồn đã thay đổi. Chưa nhập hàng; làm mới bảng để kiểm tra lại.</p>}
    {editable && !work.snapshot.ready && <p className="text-sm text-muted-foreground">Bổ sung thông tin còn thiếu bằng nút Chỉnh sửa bảng trước khi xác nhận.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {editing && editable ? <ReceiptEditor key={work.version} work={work} onSaved={next => { onChange(next); setEditing(false); }} onCancel={() => setEditing(false)} /> : <div className="flex flex-wrap gap-2">
      {editable && <>{work.status === "CHO_DUYET" ? <Button disabled={pending || uncertain || !work.snapshot.ready} onClick={() => run("approve")}>{pending && <Loader2 className="size-4 animate-spin" />}Xác nhận nhập hàng</Button> : <Button disabled={pending || uncertain} onClick={() => run("refresh")}>Làm mới bảng</Button>}
        <Button variant="outline" disabled={pending || uncertain} onClick={() => setEditing(true)}>Chỉnh sửa bảng</Button><Button variant="ghost" disabled={pending || uncertain} onClick={() => run("cancel")}>Hủy công việc</Button></>}
      <Button variant="ghost" disabled={pending} onClick={() => run("status")}>Tải trạng thái</Button>
    </div>}
  </article>;
}
function ReceiptEditor({ work, onSaved, onCancel }: { work: InventoryReceiptWorkView; onSaved: (work: AiWorkView) => void; onCancel: () => void }) {
  const form = useForm<InventoryReceiptRequest>({ resolver: zodResolver(InventoryReceiptRequestSchema), defaultValues: { rows: work.snapshot.input.rows.map((row, i) => ({ ...row, itemId: work.snapshot.rows[i].itemId, name: work.snapshot.rows[i].name, unit: work.snapshot.rows[i].unit, categoryId: work.snapshot.rows[i].categoryId, newCategoryName: work.snapshot.rows[i].categoryId ? "" : row.newCategoryName })) } });
  const [options, setOptions] = useState<InventoryOptions | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [uncertain, setUncertain] = useState(false);
  const rows = useWatch({ control: form.control, name: "rows" }), busy = form.formState.isSubmitting;
  useDraftGuard(form.formState.isDirty || busy);
  useEffect(() => { let alive = true; getInventoryOptions().then(result => { if (!alive) return; if (result.success && result.canManage) setOptions(result); else setError(result.success ? "Bạn cần quyền quản lý vật tư." : result.message); }).catch(() => { if (alive) setError("Chưa tải được danh mục. Đóng phần chỉnh sửa và thử lại."); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  async function save(values: InventoryReceiptRequest) {
    setError("");
    let incomplete = false;
    values.rows.forEach((row, i) => {
      if (!row.itemId && !row.categoryId && !row.newCategoryName) { form.setError(`rows.${i}.newCategoryName`, { message: "Nhập tên loại mới hoặc chọn loại hiện có" }, { shouldFocus: !incomplete }); incomplete = true; }
      if (row.kind === "PHU_KIEN" && !row.locationId) { form.setError(`rows.${i}.locationId`, { message: "Chọn nơi giữ phụ kiện" }, { shouldFocus: !incomplete }); incomplete = true; }
    });
    if (incomplete) return;
    try {
      const result = await updateInventoryReceiptWork({ id: work.id, version: work.version, ...values });
      if (!result.success) { setError(result.message); return; }
      toast.success("Đã cập nhật bảng chờ duyệt"); onSaved(result.work);
    } catch { setUncertain(true); setError("Chưa xác nhận bảng đã lưu. Đóng phần chỉnh sửa và tải trạng thái trước khi tiếp tục."); }
  }
  return <Form {...form}><form onSubmit={form.handleSubmit(save)} noValidate className="space-y-4"><FormRequiredHint />
    {loading ? <Skeleton className="h-32 w-full" /> : options && <fieldset disabled={busy || uncertain} className="space-y-4">{rows.map((row, i) => <div key={i} className="space-y-3 border-t pt-3">
      <p className="font-medium">{i + 1}. {work.snapshot.rows[i].name}</p><div className="grid gap-3 sm:grid-cols-2">
        {!row.itemId && <><TextField form={form} name={`rows.${i}.name`} label="Tên và quy cách" required /><TextField form={form} name={`rows.${i}.unit`} label="Đơn vị tính" required />
          <FormField control={form.control} name={`rows.${i}.kind`} render={({ field }) => <FormItem><FormLabel required>Hạng mục</FormLabel><FormControl><SearchableSelect label="Hạng mục" ref={field.ref} onBlur={field.onBlur} value={field.value} aria-required onValueChange={v => { field.onChange(v); form.setValue(`rows.${i}.categoryId`, null); form.setValue(`rows.${i}.newCategoryName`, ""); form.setValue(`rows.${i}.locationId`, null); }} options={[{ value: "PHU_KIEN", label: "Phụ kiện" }, { value: "TIEU_HAO", label: "Tiêu hao" }]} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name={`rows.${i}.categoryId`} render={({ field }) => <FormItem><FormLabel required>Loại mặt hàng</FormLabel><FormControl><SearchableSelect label="Loại mặt hàng" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : "new"} aria-required onValueChange={v => { field.onChange(v === "new" ? null : Number(v)); if (v !== "new") form.setValue(`rows.${i}.newCategoryName`, ""); }} options={[{ value: "new", label: "Tạo loại mới" }, ...options.categories.filter(c => c.dang_su_dung && c.hang_muc === row.kind).map(c => ({ value: String(c.id), label: c.ten_loai }))]} /></FormControl><FormMessage /></FormItem>} />
          {!row.categoryId && <TextField form={form} name={`rows.${i}.newCategoryName`} label="Tên loại mới" required />}</>}
        <TextField form={form} name={`rows.${i}.quantity`} label={`Số lượng (${row.unit})`} required numeric />
        {row.kind === "PHU_KIEN" && <FormField control={form.control} name={`rows.${i}.locationId`} render={({ field }) => <FormItem><FormLabel required>Nơi giữ</FormLabel><FormControl><SearchableSelect label="Nơi giữ" ref={field.ref} onBlur={field.onBlur} value={field.value ? String(field.value) : ""} aria-required onValueChange={v => field.onChange(Number(v))} options={options.locations.filter(l => l.active).map(l => ({ value: String(l.id), label: l.path }))} /></FormControl><FormMessage /></FormItem>} />}
        <FormField control={form.control} name={`rows.${i}.price`} render={({ field }) => <FormItem><FormLabel>Đơn giá (VND)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} inputMode="numeric" placeholder="Chưa có" onChange={e => field.onChange(e.target.value || null)} /></FormControl><FormMessage /></FormItem>} />
        <TextField form={form} name={`rows.${i}.notes`} label="Ghi chú" />
      </div></div>)}</fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !options || uncertain}>{busy && <Loader2 className="size-4 animate-spin" />}Cập nhật bảng</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Đóng chỉnh sửa</Button></div>
  </form></Form>;
}
