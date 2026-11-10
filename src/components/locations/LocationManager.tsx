"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Layers,
  History,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRequiredHint,
} from "@/components/ui/form";
import { FeatureOverview, EmptyPanel } from "@/components/ui/feature-overview";
import {
  saveLocation,
  deleteLocation,
  getLocationHistory,
} from "@/actions/location";
import {
  LOCATION_TYPES,
  LocationFormSchema,
  type LocationFormInput,
} from "@/lib/validations/location";
import {
  descendantIds,
  locationPath,
  type LocationRow,
} from "@/lib/location-tree";
import { cn } from "@/lib/utils";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
const typeLabel = (type: string) =>
  LOCATION_TYPES[type as keyof typeof LOCATION_TYPES] ?? type;

export function LocationManager({
  rows,
  canManage,
}: {
  rows: LocationRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<{
    row?: LocationRow;
    parentId: number | null;
  } | null>(null);
  const [removing, setRemoving] = useState<LocationRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const matches = rows.filter(
    (r) =>
      normalize(
        `${r.ten_vi_tri} ${r.ma_vi_tri} ${locationPath(r.id, rows)}`,
      ).includes(normalize(search)) &&
      (status === "all" || r.dang_su_dung === (status === "active")),
  );
  const visible = new Set<number>();
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const row of matches) {
    let current: LocationRow | undefined = row;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current =
        current.parent_id === null ? undefined : map.get(current.parent_id);
    }
  }
  const filtered = Boolean(search || status !== "all");
  const picked = rows.find((r) => r.id === selected);
  function branch(parentId: number | null, ancestors: Set<number> = new Set()) {
    return rows
      .filter(
        (r) =>
          r.parent_id === parentId && visible.has(r.id) && !ancestors.has(r.id),
      )
      .map((row) => {
        const children = rows.filter((r) => r.parent_id === row.id);
        const open = filtered || !collapsed.has(row.id);
        const next = new Set(ancestors).add(row.id);
        return (
          <li key={row.id} className="min-w-0">
            <div className="flex min-w-0 items-center gap-1 rounded-lg border bg-card p-2 transition-colors hover:bg-muted/40">
              {children.length ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label={`${open ? "Thu" : "Mở"} nhánh ${row.ten_vi_tri}`}
                  aria-expanded={open}
                  disabled={filtered}
                  onClick={() =>
                    setCollapsed((previous) => {
                      const value = new Set(previous);
                      if (value.has(row.id)) value.delete(row.id);
                      else value.add(row.id);
                      return value;
                    })
                  }
                >
                  {open ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              ) : (
                <MapPin
                  className="mx-3 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <Button
                variant="ghost"
                className="h-auto min-h-10 min-w-0 flex-1 justify-start whitespace-normal px-2 text-left hover:text-foreground"
                aria-label={`Xem vị trí ${row.ten_vi_tri}`}
                onClick={(event) => {
                  detailTrigger.current = event.currentTarget;
                  setSelected(row.id);
                }}
              >
                <span className="min-w-0">
                  <span className="block break-words font-medium">
                    {row.ten_vi_tri}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {typeLabel(row.loai_vi_tri)} · {row.ma_vi_tri}
                    {children.length ? ` · ${children.length} vị trí con` : ""}
                  </span>
                </span>
              </Button>
              {!row.dang_su_dung && (
                <Badge
                  variant="secondary"
                  className="max-w-24 whitespace-normal text-center"
                >
                  Ngừng dùng
                </Badge>
              )}
            </div>
            {children.length > 0 && open && (
              <ul className="ml-2 mt-2 space-y-2 border-l pl-2 sm:ml-5 sm:pl-4">
                {branch(row.id, next)}
              </ul>
            )}
          </li>
        );
      });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPin className="size-6 text-primary" />
            Vị trí & không gian
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tòa nhà, khu vực và chỗ ngồi dùng chung
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing({ parentId: null })}>
            <Plus className="size-4" />
            Thêm vị trí
          </Button>
        )}
      </div>
      <FeatureOverview
        items={[
          { label: "Tổng vị trí", value: rows.length, icon: MapPin },
          {
            label: "Đang sử dụng",
            value: rows.filter((r) => r.dang_su_dung).length,
            icon: Building2,
          },
          {
            label: "Vị trí gốc",
            value: rows.filter((r) => r.parent_id === null).length,
            icon: Layers,
          },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Tìm vị trí"
          placeholder="Tìm theo tên, mã hoặc đường dẫn..."
          className="text-base sm:flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger
            aria-label="Trạng thái vị trí"
            className="w-full sm:w-52"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang sử dụng</SelectItem>
            <SelectItem value="inactive">Ngừng sử dụng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyPanel
          title="Chưa có vị trí"
          description={
            canManage
              ? "Bắt đầu bằng một tòa nhà hoặc khu vực, sau đó thêm các vị trí con."
              : "Người quản lý sẽ bổ sung danh mục vị trí tại đây."
          }
        />
      ) : matches.length === 0 ? (
        <EmptyPanel
          title="Không tìm thấy vị trí phù hợp"
          description="Thử đổi từ khóa hoặc trạng thái."
        />
      ) : (
        <section aria-label="Cây vị trí" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered
                ? `${matches.length} kết quả; giữ nhánh cha để định hướng`
                : "Chọn một vị trí để xem thông tin"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={filtered}
                onClick={() => setCollapsed(new Set())}
              >
                Mở tất cả
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={filtered}
                onClick={() => setCollapsed(new Set(rows.map((r) => r.id)))}
              >
                Thu gọn
              </Button>
            </div>
          </div>
          <ul className="space-y-2">{branch(null)}</ul>
        </section>
      )}
      <Sheet
        open={Boolean(picked)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!editing && !removing) detailTrigger.current?.focus();
          }}
        >
          <SheetHeader>
            <SheetTitle>{picked?.ten_vi_tri}</SheetTitle>
            <SheetDescription>
              {picked ? locationPath(picked.id, rows) : "Thông tin vị trí"}
            </SheetDescription>
          </SheetHeader>
          {picked && (
            <div className="space-y-5 px-4 pb-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Mã vị trí</dt>
                  <dd className="mt-1 font-medium">{picked.ma_vi_tri}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Loại</dt>
                  <dd className="mt-1 font-medium">
                    {typeLabel(picked.loai_vi_tri)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Trạng thái</dt>
                  <dd className="mt-1">
                    {picked.dang_su_dung ? "Đang sử dụng" : "Ngừng sử dụng"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Vị trí con trực tiếp
                  </dt>
                  <dd className="mt-1">
                    {rows.filter((r) => r.parent_id === picked.id).length}
                  </dd>
                </div>
              </dl>
              {picked.mo_ta && (
                <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-sm">
                  {picked.mo_ta}
                </p>
              )}
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(null);
                      setEditing({ row: picked, parentId: picked.parent_id });
                    }}
                  >
                    <Pencil className="size-4" />
                    Sửa vị trí
                  </Button>
                  {picked.dang_su_dung && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(null);
                        setEditing({ parentId: picked.id });
                      }}
                    >
                      <Plus className="size-4" />
                      Thêm vị trí con
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(null);
                      setError("");
                      setRemoving(picked);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Xóa vị trí
                  </Button>
                </div>
              )}
              <LocationHistory
                key={`${picked.id}-${picked.version}`}
                id={picked.id}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.row ? "Sửa vị trí" : "Thêm vị trí"}
            </DialogTitle>
            <DialogDescription>
              Mã được cấp tự động và giữ nguyên. Vị trí vật lý độc lập với phòng
              ban.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <LocationForm
              key={editing.row?.id ?? `new-${editing.parentId}`}
              rows={rows}
              editing={editing}
              onSaved={(id) => {
                setEditing(null);
                router.refresh();
                setSelected(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!pending && !open) setRemoving(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa vị trí trống?</DialogTitle>
            <DialogDescription>
              Chỉ xóa “{removing?.ten_vi_tri}” khi không còn vị trí con hoặc dữ
              liệu liên kết. Nhật ký vẫn được giữ.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setRemoving(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                startTransition(async () => {
                  try {
                    const result = await deleteLocation({
                      id: removing.id,
                      version: removing.version,
                    });
                    if (!result.success) {
                      setError(result.message);
                      return;
                    }
                    toast.success(result.message);
                    setRemoving(null);
                    router.refresh();
                  } catch {
                    setError("Không thể kết nối. Vui lòng thử lại.");
                  }
                });
              }}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}Xác nhận
              xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function LocationForm({
  rows,
  editing,
  onSaved,
}: {
  rows: LocationRow[];
  editing: { row?: LocationRow; parentId: number | null };
  onSaved: (id: number) => void;
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
    },
  });
  const [pending, startTransition] = useTransition();
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
        {row && (
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
              <Select
                value={field.value === null ? "root" : String(field.value)}
                onValueChange={(value) => {
                  field.onChange(value === "root" ? null : Number(value));
                  setConfirmedParent(undefined);
                }}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required="false"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="root">
                    Vị trí gốc (không có cấp trên)
                  </SelectItem>
                  {rows
                    .filter((r) => r.dang_su_dung && !excluded.has(r.id))
                    .map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {locationPath(r.id, rows)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}Lưu vị trí
        </Button>
      </form>
    </Form>
  );
}
function LocationHistory({ id }: { id: number }) {
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof getLocationHistory>
  > | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3 border-t pt-4">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              setResult(await getLocationHistory(id));
            } catch {
              setResult({
                success: false,
                message: "Không thể tải lịch sử. Vui lòng thử lại.",
              });
            }
          })
        }
      >
        <History className="size-4" />
        {pending ? "Đang tải..." : "Xem lịch sử vị trí"}
      </Button>
      {result &&
        (result.success ? (
          <>
            <p className="text-xs text-muted-foreground">
              Tối đa 50 thay đổi gần nhất
            </p>
            {!result.rows.length && <p className="text-sm">Chưa có lịch sử.</p>}
            <ol className="space-y-3">
              {result.rows.map((r) => (
                <li key={r.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{r.mo_ta}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.ho_ten || "Hệ thống"} ·{" "}
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer">
                      Thay đổi trước / sau
                    </summary>
                    <div className="mt-2 grid gap-2">
                      {[r.du_lieu_cu, r.du_lieu_moi].map((data, i) => (
                        <div
                          key={i}
                          className={cn("rounded bg-muted/40 p-2 text-xs")}
                        >
                          <p className="font-medium">{i ? "Sau" : "Trước"}</p>
                          {data &&
                          typeof data === "object" &&
                          !Array.isArray(data) ? (
                            <p className="break-words">
                              {String(data.ten_vi_tri ?? "")} ·{" "}
                              {typeLabel(String(data.loai_vi_tri ?? ""))} ·{" "}
                              {data.dang_su_dung
                                ? "Đang sử dụng"
                                : "Ngừng sử dụng"}
                              <br />
                              {String(data.duong_dan ?? "")}
                              <br />
                              {String(data.mo_ta ?? "")}
                            </p>
                          ) : (
                            "Chưa có"
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            {result.message}
          </p>
        ))}
    </div>
  );
}
