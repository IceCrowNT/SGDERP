"use client";
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  Focus,
  Map,
  MapPin,
  RotateCcw,
  RefreshCw,
  FileText,
  Monitor,
  Laptop,
  Printer,
  ScanLine,
  Router,
  Pencil,
  MousePointer2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPeople } from "@/components/locations/LocationPeople";
import type { LocationRow } from "@/lib/location-tree";
import type { LocationEmployee } from "@/lib/work-location";
import { cn } from "@/lib/utils";
import type { EquipmentKind, HcnsRoomData } from "@/lib/office-3d/hcns-layout";
import type { CameraCommand } from "./HcnsRoomCanvas";

const RoomCanvas = dynamic(() => import("./HcnsRoomCanvas"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-full w-full" aria-label="Đang dựng phòng 3D" />
  ),
});
const equipmentLabels: Record<
  EquipmentKind,
  { label: string; icon: typeof Monitor }
> = {
  pc: { label: "Máy tính", icon: Monitor },
  laptop: { label: "Laptop", icon: Laptop },
  printer: { label: "Máy in", icon: Printer },
  scanner: { label: "Máy quét", icon: ScanLine },
  "access-point": { label: "Bộ phát Wi-Fi", icon: Router },
};
export function HcnsRoomExplorer({
  room,
  assignmentData,
}: {
  room: HcnsRoomData;
  assignmentData: {
    locations: LocationRow[];
    people: LocationEmployee[];
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>("hcns-01");
  const [command, setCommand] = useState<CameraCommand>({
    view: "overview",
    sequence: 0,
  });
  const point = room.points.find((p) => p.key === selected);
  const assignmentLocation =
    point?.state === "active"
      ? assignmentData?.locations.find(
          (location) => location.id === point.locationId,
        )
      : undefined;
  const active = room.points.filter((p) => p.state === "active");
  const noted = active.filter((p) => p.description?.trim()).length;
  function view(next: CameraCommand["view"]) {
    setCommand((old) => ({
      view: next,
      key: selected ?? undefined,
      sequence: old.sequence + 1,
    }));
  }
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/office-3d?floor=2&room=t2_hcns_pc"
            className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Tòa nhà · Tầng 2
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Không gian HCNS
            </h1>
            <Badge variant="secondary">Bản xem thử</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {room.path}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-10"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
        >
          <RefreshCw className={cn("size-4", pending && "animate-spin")} />
          Cập nhật dữ liệu
        </Button>
      </header>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-label="Bố trí phòng HCNS"
          className="min-w-0 overflow-hidden rounded-2xl border bg-muted/25"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2">
            <div className="flex flex-wrap gap-1">
              <Button
                className="min-h-10"
                size="sm"
                variant={command.view === "overview" ? "secondary" : "ghost"}
                aria-pressed={command.view === "overview"}
                onClick={() => view("overview")}
              >
                <Box className="size-4" />
                Phối cảnh
              </Button>
              <Button
                className="min-h-10"
                size="sm"
                variant={command.view === "top" ? "secondary" : "ghost"}
                aria-pressed={command.view === "top"}
                onClick={() => view("top")}
              >
                <Map className="size-4" />
                Mặt bằng
              </Button>
              <Button
                className="min-h-10"
                size="sm"
                variant="ghost"
                onClick={() => view("focus")}
                disabled={!point}
              >
                <Focus className="size-4" />
                Tập trung
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-10"
              aria-label="Đưa góc nhìn về toàn phòng"
              onClick={() => view("overview")}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
          <div
            className="relative h-[440px] overflow-hidden sm:h-[580px] xl:h-[640px]"
            data-testid="hcns-canvas-container"
          >
            <RoomCanvas
              points={room.points}
              selected={selected}
              onSelect={setSelected}
              command={command}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <MousePointer2 className="size-4" />
              Kéo để xoay · Cuộn/chụm để thu phóng
            </span>
            <span>Bố trí theo bản phác · Kích thước ước lượng</span>
          </div>
        </section>

        <aside
          className="flex min-w-0 flex-col gap-4"
          aria-label="Thông tin vị trí trong phòng"
        >
          <section className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Vị trí trong phòng</h2>
              <Badge variant="secondary">{room.points.length} điểm</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {noted} có ghi chú · {active.length - noted} chưa có ghi chú
            </p>
            <div
              className="mt-4 grid grid-cols-5 gap-2"
              aria-label="Chọn vị trí"
            >
              {room.points.map((p) => (
                <Button
                  key={p.key}
                  variant={selected === p.key ? "default" : "outline"}
                  className={cn(
                    "relative h-12 min-w-0 px-0 font-semibold",
                    p.state !== "active" && "border-dashed",
                  )}
                  aria-label={`Chọn ${p.name}`}
                  aria-pressed={selected === p.key}
                  onClick={() => setSelected(p.key)}
                >
                  {String(p.number).padStart(2, "0")}
                  {p.state === "active" && p.description && (
                    <span
                      className={cn(
                        "absolute bottom-1 size-1 rounded-full",
                        selected === p.key
                          ? "bg-primary-foreground"
                          : "bg-primary",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Số trên hình tương ứng với bản vẽ của bạn.
            </p>
          </section>

          <section
            aria-label="Chi tiết vị trí"
            aria-live="polite"
            className="flex-1 rounded-2xl border bg-card p-5"
          >
            {point ? (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                    {String(point.number).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-semibold">
                      {point.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {point.state === "inactive"
                        ? "Đã ngừng sử dụng"
                        : point.state === "unlinked"
                          ? "Chưa liên kết vị trí"
                          : "Trong phòng HCNS"}
                    </p>
                  </div>
                </div>
                {point.state === "unlinked" ? (
                  <p className="text-sm text-muted-foreground">
                    Vị trí đã bị xóa hoặc chuyển khỏi phòng. Cần kiểm tra lại
                    liên kết trước khi hiển thị dữ liệu.
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
                            Nhân sự đang làm việc
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
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <FileText className="size-4 text-muted-foreground" />
                      Ghi chú vị trí
                    </div>
                    <p className="whitespace-pre-line break-words text-sm leading-7">
                      {point.description ||
                        "Chưa có thông tin người sử dụng hoặc thiết bị trên sơ đồ."}
                    </p>
                    {point.equipment.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {point.equipment.map((kind) => {
                          const info = equipmentLabels[kind];
                          return (
                            <Badge
                              key={kind}
                              variant="secondary"
                              className="gap-1.5 py-1.5"
                            >
                              <info.icon className="size-3.5" />
                              {info.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
                  Thiết bị được minh họa theo ghi chú, chưa phải hồ sơ tài sản.
                  Chỗ chưa có ghi chú chưa được xác nhận là chỗ trống.
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
                  Chọn một số trên mô hình hoặc danh sách để xem thông tin.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
