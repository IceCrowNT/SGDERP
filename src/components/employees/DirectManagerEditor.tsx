"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getDirectManagerOptions,
  saveDirectManager,
} from "@/actions/employee-manager";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
type Data = Extract<
  Awaited<ReturnType<typeof getDirectManagerOptions>>,
  { success: true }
>;
export function DirectManagerEditor({ id }: { id: number }) {
  const [data, setData] = useState<Data | null>(null),
    [value, setValue] = useState("NONE"),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  const saved = String(data?.person.quan_ly_truc_tiep_id ?? "NONE");
  const dirty = Boolean(data && value !== saved);
  async function read() {
    const r = await getDirectManagerOptions(id);
    if (!r.success) {
      setError(r.message);
      return;
    }
    setData(r);
    setValue(String(r.person.quan_ly_truc_tiep_id ?? "NONE"));
    setError("");
  }
  function load() {
    start(async () => {
      try {
        await read();
      } catch {
        setError("Chưa tải được quản lý trực tiếp. Hãy thử lại.");
      }
    });
  }
  return (
    <div className="space-y-3 rounded-lg border p-3 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Quản lý trực tiếp</p>
        <Button
          type="button"
          variant="outline"
          disabled={pending || dirty}
          onClick={load}
        >
          {pending ? "Đang xử lý…" : data ? "Tải lại" : "Xem / thay đổi"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            Mặc định theo người phụ trách phòng. Chỉ chọn người riêng khi có
            ngoại lệ.
          </p>
          <SearchableSelect
            label="Quản lý trực tiếp"
            value={value}
            onValueChange={setValue}
            disabled={pending}
            options={[
              {
                value: "NONE",
                label: "Theo phòng ban",
                description: data.inherited.name
                  ? `${data.inherited.name} · ${data.inherited.department}`
                  : data.inherited.source === "TOP_LEVEL"
                    ? "Người phụ trách đơn vị cấp cao nhất"
                    : "Cần kiểm tra cơ cấu phòng ban",
              },
              ...data.people.map((p) => ({
                value: String(p.id),
                label: p.ho_ten,
                disabled: p.tinh_trang_lam_viec !== "ACTIVE",
                description: [
                  "Chỉ định riêng",
                  p.ma_nhan_su,
                  p.phong_ban?.ten_phong_ban,
                ]
                  .filter(Boolean)
                  .join(" · "),
              })),
            ]}
          />
          {value === "NONE" ? (
            <p
              role={data.inherited.error ? "status" : undefined}
              className="text-sm text-muted-foreground"
            >
              {data.inherited.error ??
                (data.inherited.source === "TOP_LEVEL"
                  ? "Người phụ trách đơn vị cấp cao nhất không có quản lý cấp trên theo cơ cấu."
                  : `Quản lý áp dụng: ${data.inherited.name} · ${data.inherited.source === "ANCESTOR" ? "Theo phòng cấp trên" : "Theo phòng"} ${data.inherited.department}.`)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chỉ định riêng:{" "}
              {data.people.find((p) => String(p.id) === value)?.ho_ten ??
                "Người đã chọn"}
              . Không đổi theo người phụ trách phòng.
            </p>
          )}
          {value === saved && value !== "NONE" && data.effective.error && (
            <p role="status" className="text-sm text-destructive">
              {data.effective.error}
            </p>
          )}
          {dirty && (
            <p className="text-xs text-muted-foreground">
              Có thay đổi chưa lưu. Lưu hoặc bỏ chỉnh sửa trước khi tải lại.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !dirty}
              onClick={() =>
                start(async () => {
                  setError("");
                  try {
                    const r = await saveDirectManager({
                      id,
                      managerId: value === "NONE" ? null : Number(value),
                      version: data.person.updated_at.toISOString(),
                    });
                    if (!r.success) {
                      setError(r.message);
                      return;
                    }
                    toast.success(
                      value === "NONE"
                        ? "Đã dùng quản lý theo phòng ban"
                        : "Đã lưu quản lý chỉ định riêng",
                    );
                    await read();
                  } catch {
                    setError(
                      "Chưa nhận được kết quả lưu. Giữ nội dung và thử lưu lại.",
                    );
                  }
                })
              }
            >
              {pending ? "Đang lưu…" : "Lưu quản lý trực tiếp"}
            </Button>
            {dirty && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setValue(saved);
                  setError("");
                }}
              >
                Bỏ chỉnh sửa
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
