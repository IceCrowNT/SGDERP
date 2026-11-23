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
    [pending, start] = useTransition();
  function load() {
    start(async () => {
      const r = await getDirectManagerOptions(id);
      if (!r.success) {
        toast.error(r.message);
        return;
      }
      setData(r);
      setValue(String(r.person.quan_ly_truc_tiep_id ?? "NONE"));
    });
  }
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Quản lý trực tiếp</p>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={load}
        >
          {data ? "Tải lại" : "Xem / thay đổi"}
        </Button>
      </div>
      {data && (
        <>
          <SearchableSelect
            label="Quản lý trực tiếp"
            value={value}
            onValueChange={setValue}
            options={[
              { value: "NONE", label: "Chưa xác định" },
              ...data.people.map((p) => ({
                value: String(p.id),
                label: p.ho_ten,
                description: [p.ma_nhan_su, p.phong_ban?.ten_phong_ban]
                  .filter(Boolean)
                  .join(" · "),
              })),
            ]}
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveDirectManager({
                  id,
                  managerId: value === "NONE" ? null : Number(value),
                  version: data.person.updated_at.toISOString(),
                });
                if (!r.success) {
                  toast.error(r.message);
                  return;
                }
                toast.success("Đã lưu quản lý trực tiếp");
                load();
              })
            }
          >
            Lưu quản lý trực tiếp
          </Button>
        </>
      )}
    </div>
  );
}
