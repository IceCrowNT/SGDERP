"use client";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";
import type { SaveAssetSchema } from "@/lib/validations/asset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export function AssetFinanceFields({ defaultMonths, onApply }: { defaultMonths?: number | null; onApply?: () => void }) {
  const form = useFormContext<z.input<typeof SaveAssetSchema>>();
  return <div className="space-y-3">
    <div className="grid gap-4 sm:grid-cols-2">
      {([["purchaseDate", "Ngày mua"], ["warrantyUntil", "Hết hạn bảo hành"]] as const).map(([name, label]) =>
        <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input {...field} type="date" min="1000-01-01" max="9999-12-31" value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} className="min-w-0 text-base" /></FormControl><FormMessage /></FormItem>} />)}
      <FormField control={form.control} name="purchasePrice" render={({ field }) => <FormItem><FormLabel>Giá mua (VND)</FormLabel><FormControl><Input {...field} inputMode="numeric" placeholder="Ví dụ: 15000000" value={field.value ?? ""} onChange={e => field.onChange(e.target.value || null)} className="text-base" /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="depreciationMonths" render={({ field }) => <FormItem><FormLabel>Khấu hao (tháng)</FormLabel><FormControl><Input {...field} type="number" min={1} max={1200} step={1} placeholder="Ví dụ: 36" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)} className="text-base" /></FormControl><FormMessage /></FormItem>} />
    </div>
    {defaultMonths ? <Button type="button" variant="outline" className="min-h-10 h-auto whitespace-normal text-left" onClick={() => { form.setValue("depreciationMonths", defaultMonths, { shouldDirty: true, shouldValidate: true }); onApply?.(); }}>Áp dụng mặc định của loại: {defaultMonths} tháng</Button> : <p className="text-xs text-muted-foreground">Có thể đặt thời gian mặc định tại Loại tài sản.</p>}
    <p className="text-xs text-muted-foreground">Tính đều từ ngày mua; giá trị còn lại dùng để tham khảo quản lý.</p>
  </div>;
}
