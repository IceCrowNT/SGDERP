"use client";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormRequiredHint } from "@/components/ui/form";
import { saveLocation } from "@/actions/location";
import { LOCATION_TYPES, LocationFormSchema, type LocationFormInput } from "@/lib/validations/location";
import { descendantIds, locationPath, type LocationRow } from "@/lib/location-tree";

export function LocationForm({
  rows,
  editing,
  onSaved,
  informationOnly = false,
  onCancel,
  onBusy,
  initialValues,
}: {
  rows: LocationRow[];
  editing: { row?: LocationRow; parentId: number | null; };
  onSaved: (id: number) => void;
  informationOnly?: boolean;
  onCancel?: () => void;
  onBusy?: (busy: boolean) => void;
  initialValues?: LocationFormInput;
}) {
  const row = editing.row;
  const form = useForm<LocationFormInput>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: {
      name: row?.ten_vi_tri ?? "",
      type: (row?.loai_vi_tri as LocationFormInput["type"]) ?? "KHU_VUC",
      description: row?.mo_ta ?? "",
      parentId: editing.parentId,
      active: row?.dang_su_dung ?? true,
      ...initialValues,
    },
  });
  const [pending, startTransition] = useTransition();
  useEffect(() => { onBusy?.(pending); }, [pending, onBusy]);
  const [error, setError] = useState("");
  const [confirmedParent, setConfirmedParent] = useState<
    number | null | undefined
  >(undefined);
  const parentId = useWatch({ control: form.control, name: "parentId" });
  const moved = Boolean(row && parentId !== row.parent_id);
  const excluded = row ? descendantIds(row.id, rows) : new Set<number>();
  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Thông tin vị trí"
        className="space-y-4"
        onSubmit={form.handleSubmit(
          (values) => {
            setError("");
            if (moved && confirmedParent !== parentId) {
              setError("Xác nhận chuyển vị trí cha trước khi lưu.");
              return;
            }
            startTransition(async () => {
              try {
                const result = await saveLocation({
                  ...values,
                  ...(row ? { id: row.id, version: row.version } : {}),
                  confirmMove: moved && confirmedParent === parentId,
                });
                if (!result.success) {
                  setError(result.message);
                  if ("fieldErrors" in result && result.fieldErrors)
                    for (const [key, messages] of Object.entries(
                      result.fieldErrors,
                    ))
                      if (messages?.[0])
                        form.setError(
                          key as keyof LocationFormInput,
                          { message: messages[0] },
                          { shouldFocus: true },
                        );
                  return;
                }
                toast.success(result.message);
                onSaved(result.id);
              } catch {
                setError(
                  "Không thể kết nối. Nội dung nhập được giữ lại, hãy thử lại.",
                );
              }
            });
          },
          () => toast.error("Kiểm tra các trường được đánh dấu."),
        )}
      >
        <FormRequiredHint />
        {row && !informationOnly && (
          <p className="text-sm text-muted-foreground">
            Mã vị trí: {row.ma_vi_tri}
          </p>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Tên vị trí</FormLabel>
              <FormControl>
                <Input {...field} aria-required="true" className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!informationOnly && <>
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Loại vị trí</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required="true"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(LOCATION_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vị trí cấp trên</FormLabel>
              <FormControl><SearchableSelect label="Vị trí cấp trên" ref={field.ref} onBlur={field.onBlur} value={field.value === null ? "root" : String(field.value)} onValueChange={value => { field.onChange(value === "root" ? null : Number(value)); setConfirmedParent(undefined); }} searchPlaceholder="Tìm tên hoặc đường dẫn vị trí…" options={[{ value: "root", label: "Vị trí gốc (không có cấp trên)" }, ...rows.filter(r => r.dang_su_dung && !excluded.has(r.id)).map(r => ({ value: String(r.id), label: locationPath(r.id, rows), keywords: r.ma_vi_tri }))]} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {moved && (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>
              Chuyển cả nhánh ({excluded.size} vị trí) sang:{" "}
              <strong>
                {parentId === null
                  ? "Vị trí gốc"
                  : locationPath(parentId, rows)}
              </strong>
              . ID được giữ nguyên; đường dẫn các vị trí con sẽ thay đổi.
            </p>
            <label className="flex min-h-10 items-center gap-2">
              <Checkbox
                checked={confirmedParent === parentId}
                onCheckedChange={(checked) =>
                  setConfirmedParent(checked === true ? parentId : undefined)
                }
              />
              Tôi xác nhận chuyển cả nhánh
            </label>
          </div>
        )}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Trạng thái</FormLabel>
              <Select
                value={field.value ? "active" : "inactive"}
                onValueChange={(value) => field.onChange(value === "active")}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required="true"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Đang sử dụng</SelectItem>
                  <SelectItem value="inactive">Ngừng sử dụng</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        </>}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả / hướng dẫn tìm</FormLabel>
              <FormControl>
                <Textarea {...field} className="text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button>}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}Lưu vị trí
        </Button>
        </div>
      </form>
    </Form>
  );
}
