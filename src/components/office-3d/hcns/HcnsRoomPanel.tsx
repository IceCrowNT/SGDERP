"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Pencil,
  MapPin,
  Users,
} from "lucide-react";
import { getLocations } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { LocationPeople } from "@/components/locations/LocationPeople";
import { LocationAssets } from "@/components/locations/LocationAssets";
import type { LocationRow } from "@/lib/location-tree";
import type { LocationEmployee } from "@/lib/work-location";
import type { HcnsRoomData } from "@/lib/office-3d/hcns-layout";
import { cn } from "@/lib/utils";
export function HcnsRoomPanel({
  room,
  selected,
  onSelect,
  personId,
}: {
  room: HcnsRoomData;
  selected: string | null;
  onSelect: (key: string) => void;
  personId?: number | null;
}) {
  const [assignmentData, setAssignmentData] = useState<{
    locations: LocationRow[];
    people: LocationEmployee[];
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!room.canManageEmployees) return;
    let cancelled = false;
    getLocations()
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.canManageEmployees && result.employees) {
          setAssignmentData({
            locations: result.rows,
            people: result.employees.filter((p) => p.status === "ACTIVE"),
          });
          setLoadError("");
        } else {
          setAssignmentData(null);
          setLoadError(
            "Không thể tải lựa chọn nhân sự. Hãy cập nhật dữ liệu và kiểm tra quyền.",
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignmentData(null);
          setLoadError("Không thể tải lựa chọn nhân sự. Vui lòng thử lại.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [room, retry]);
  const point = room.points.find((p) => p.key === selected);
  const assignmentLocation =
    point?.state === "active"
      ? assignmentData?.locations.find(
          (location) => location.id === point.locationId,
        )
      : undefined;
  const person = room.canViewEmployees
    ? point?.occupants?.find((p) => p.id === personId)
    : undefined;
  return (
    <div className="space-y-4" aria-label="Thông tin vị trí trong phòng">
      {room.canManageEmployees && !assignmentData && (
        <div className="rounded-xl border bg-card p-3 text-sm" role="status">
          {loadError || "Đang tải lựa chọn nhân sự…"}
          {loadError && (
            <Button
              variant="outline"
              className="mt-2 min-h-10"
              onClick={() => setRetry((r) => r + 1)}
            >
              Thử lại
            </Button>
          )}
        </div>
      )}
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Danh sách vị trí · {room.points.length}
        </summary>
        <div
          className="mt-3 max-h-72 space-y-1 overflow-y-auto"
          aria-label="Chọn vị trí"
        >
          {room.points.map((p) => (
            <Button
              key={p.key}
              variant={selected === p.key ? "secondary" : "ghost"}
              className={cn(
                "h-auto min-h-11 w-full justify-start whitespace-normal text-left",
                p.state !== "active" && "border border-dashed",
              )}
              aria-label={`Chọn ${p.name}`}
              aria-pressed={selected === p.key}
              onClick={() => onSelect(p.key)}
            >
              <MapPin className="size-4 shrink-0" />
              <span>
                <span className="block">{p.name}</span>
                {room.canViewEmployees && p.occupants?.length ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {p.occupants.map((person) => person.name).join(", ")}
                  </span>
                ) : null}
              </span>
            </Button>
          ))}
        </div>
      </details>

      <section
        aria-label="Chi tiết vị trí"
        aria-live="polite"
        className="flex-1 rounded-2xl border bg-card p-5"
      >
        {point ? (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                {person ? (
                  <Users className="size-5" />
                ) : (
                  <MapPin className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold">
                  {person?.name ?? point.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {person
                    ? [person.position, person.department]
                        .filter(Boolean)
                        .join(" · ")
                    : point.state === "inactive"
                      ? "Đã ngừng sử dụng"
                      : point.state === "unlinked"
                        ? "Chưa liên kết vị trí"
                        : "Trong phòng HCNS"}
                </p>
              </div>
            </div>
            {person && (
              <Button
                variant="ghost"
                className="mb-3 min-h-10"
                onClick={() => onSelect(point.key)}
              >
                <MapPin className="size-4" />
                Thông tin vị trí
              </Button>
            )}
            {point.state === "unlinked" ? (
              <p className="text-sm text-muted-foreground">
                Vị trí đã bị xóa hoặc chuyển khỏi phòng. Cần kiểm tra lại liên
                kết trước khi hiển thị dữ liệu.
              </p>
            ) : (
              <>
                {room.canManageEmployees &&
                assignmentData &&
                assignmentLocation ? (
                  <div className="mb-5">
                    <LocationPeople
                      key={point.key}
                      location={assignmentLocation}
                      locations={assignmentData.locations}
                      people={assignmentData.people}
                      canManage
                    />
                  </div>
                ) : (
                  room.canViewEmployees && (
                    <section
                      aria-label="Nhân sự tại vị trí"
                      className="mb-5 space-y-3 rounded-xl border p-3"
                    >
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="size-4" />
                        Nhân sự đã gán vị trí
                      </h3>
                      {point.occupants?.length ? (
                        point.occupants.map((person) => (
                          <div
                            key={person.id}
                            className="border-t pt-2 text-sm"
                          >
                            <Link
                              className="font-medium hover:text-primary"
                              href={`/employees?search=${encodeURIComponent(person.name)}`}
                            >
                              {person.name}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[person.position, person.department]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Chưa gán nhân sự đang làm việc.
                        </p>
                      )}
                    </section>
                  )
                )}
                {room.canViewAssets && point.locationId !== undefined && (
                  <LocationAssets key={`assets-${point.key}`} location={{ id: point.locationId,
                    name: `${room.path} / ${point.name}`, active: point.state === "active" }}
                    assets={point.assets ?? []} canManage={room.canManageAssets && point.state === "active"} />
                )}
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4 text-muted-foreground" />
                  Ghi chú vị trí
                </div>
                <p className="whitespace-pre-line break-words text-sm leading-7">
                  {point.description ||
                    "Chưa có thông tin người sử dụng hoặc thiết bị trên sơ đồ."}
                </p>
              </>
            )}
            <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
              {room.canViewAssets
                ? "Hình thiết bị đại diện theo loại; danh sách tài sản ghi đầy đủ từng hồ sơ đã gán. Ghi chú cũ chỉ để tham khảo."
                : "Ghi chú vị trí chỉ để tham khảo; dữ liệu tài sản cần quyền xem tài sản."}
            </p>
            {room.canManage && (
              <Button
                variant="outline"
                asChild
                className="mt-4 min-h-10 w-full"
              >
                <Link href="/locations">
                  <Pencil className="size-4" />
                  Sửa trong danh mục vị trí
                </Link>
              </Button>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <MapPin className="mx-auto mb-3 size-8" />
            <p className="text-sm">
              Chọn bàn hoặc hình người trên mô hình để xem thông tin. Bạn cũng
              có thể chọn trong danh sách vị trí.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
