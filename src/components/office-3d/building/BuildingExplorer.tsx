"use client";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Layers3,
  Map,
  Box,
  Focus,
  RotateCcw,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowLeft,
  MousePointer2,
  Users,
  MapPin,
  Search,
  RefreshCw,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BUILDING_ROOMS,
  HCNS_BUILDING_KEY,
  type FloorSelection,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import type { BuildingCamera } from "./BuildingCanvas";
import {
  buildingUrl,
  readBuildingNavigation,
  type BuildingNavigation,
} from "@/lib/office-3d/building-navigation";
import { HcnsRoomPanel } from "../hcns/HcnsRoomPanel";
const DEFAULT_CAMERA: BuildingCamera = {
  view: "overview",
  sequence: 0,
  zoom: 1,
};
const NAVIGATION_EVENT = "sdg-office-3d-navigate";
function subscribeNavigation(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(NAVIGATION_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(NAVIGATION_EVENT, listener);
  };
}
const currentQuery = () => window.location.search;
const Model = dynamic(() => import("./BuildingCanvas"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-full w-full" aria-label="Đang dựng tòa nhà 3D" />
  ),
});
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
export function BuildingExplorer({ building }: { building: BuildingData }) {
  const router = useRouter();
  const params = useSearchParams();
  // History changes must update the selected point immediately, even while
  // Next's transition is waiting for a server action to finish.
  const query = useSyncExternalStore(subscribeNavigation, currentQuery, () =>
    params.size ? `?${params.toString()}` : "",
  );
  const navigation = readBuildingNavigation(new URLSearchParams(query));
  const { floor, room: selected } = navigation;
  const detail = navigation.detail && Boolean(building.hcns);
  const scope = detail ? "room:hcns" : `floor:${floor}`;
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<{
    point: string;
    id: number;
  } | null>(null);
  const personId =
    detail && selectedPerson?.point === navigation.point
      ? selectedPerson.id
      : null;
  const [commands, setCommands] = useState<Record<string, BuildingCamera>>({});
  const command = commands[scope] ?? DEFAULT_CAMERA;
  function setCommand(update: (c: BuildingCamera) => BuildingCamera) {
    setCommands((old) => ({
      ...old,
      [scope]: update(old[scope] ?? DEFAULT_CAMERA),
    }));
  }
  function navigate(next: BuildingNavigation) {
    const url = buildingUrl(next);
    if (`${window.location.pathname}${window.location.search}` !== url)
      window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(NAVIGATION_EVENT));
    setSearch("");
  }
  function enterRoom() {
    if (!building.hcns) return;
    setSelectedPerson(null);
    navigate({
      floor: 2,
      room: HCNS_BUILDING_KEY,
      detail: true,
      point: "hcns-01",
    });
  }
  function leaveRoom() {
    navigate({ floor: 2, room: HCNS_BUILDING_KEY, detail: false, point: null });
  }
  function choosePoint(point: string) {
    setSelectedPerson(null);
    navigate({ ...navigation, point });
  }
  function choosePerson(point: string, id: number) {
    setSelectedPerson({ point, id });
    navigate({ ...navigation, point });
  }
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || !detail) return;
      if (
        document.querySelector('[role="dialog"]') ||
        (event.target instanceof HTMLElement &&
          (event.target.matches("input,textarea,select") ||
            event.target.isContentEditable))
      )
        return;
      window.history.pushState(
        null,
        "",
        buildingUrl({
          floor: 2,
          room: HCNS_BUILDING_KEY,
          detail: false,
          point: null,
        }),
      );
      window.dispatchEvent(new Event(NAVIGATION_EVENT));
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [detail]);
  const room = building.rooms.find((r) => r.key === selected);
  const shape = BUILDING_ROOMS.find((r) => r.key === selected);
  const visible = building.rooms.filter(
    (r) =>
      (floor === "all" ||
        BUILDING_ROOMS.find((s) => s.key === r.key)?.floor === floor) &&
      normalize(r.name).includes(normalize(search)),
  );
  function changeFloor(next: FloorSelection) {
    if (detail && next === 2) {
      leaveRoom();
      return;
    }
    navigate({ floor: next, room: null, detail: false, point: null });
  }
  function choose(key: string) {
    const shape = BUILDING_ROOMS.find((r) => r.key === key);
    if (!shape) return;
    navigate({ floor: shape.floor, room: key, detail: false, point: null });
  }
  function view(next: BuildingCamera["view"]) {
    const targetScope = next === "top" && floor === "all" ? "floor:2" : scope;
    if (targetScope !== scope)
      navigate({ floor: 2, room: null, detail: false, point: null });
    setCommands((old) => ({
      ...old,
      [targetScope]: {
        view: next,
        key: detail ? (navigation.point ?? undefined) : (selected ?? undefined),
        sequence: (old[targetScope]?.sequence ?? 0) + 1,
        zoom: 1,
      },
    }));
  }
  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="size-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {detail ? "Không gian HCNS" : "Bản đồ 3D tòa nhà"}
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail
              ? building.hcns?.path
              : `${building.name} · 3 tầng trong mô hình`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-10"
            disabled={pending}
            onClick={() => start(() => router.refresh())}
          >
            <RefreshCw className={cn("size-4", pending && "animate-spin")} />
            {detail ? "Cập nhật dữ liệu" : "Cập nhật"}
          </Button>
          {building.canManage && (
            <Button variant="outline" asChild className="min-h-10">
              <Link href="/locations">
                <MapPin className="size-4" />
                Quản lý vị trí
              </Link>
            </Button>
          )}
        </div>
      </header>
      <nav
        aria-label="Cấp xem không gian"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        <Button
          variant="ghost"
          className="min-h-10"
          onClick={() => changeFloor("all")}
        >
          Tòa nhà
        </Button>
        {floor !== "all" && (
          <>
            <span aria-hidden="true">/</span>
            <Button
              variant="ghost"
              className="min-h-10"
              onClick={() => changeFloor(floor)}
            >
              Tầng {floor}
            </Button>
          </>
        )}
        {detail && (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="px-2 font-medium">
              HCNS
            </span>
            <Button
              variant="outline"
              className="ml-auto min-h-10"
              onClick={leaveRoom}
            >
              <ArrowLeft className="size-4" />
              Trở lại tầng 2
            </Button>
          </>
        )}
      </nav>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-label="Mô hình tòa nhà"
          className="min-w-0 self-start overflow-hidden rounded-2xl border bg-muted/25"
        >
          <div
            className="grid grid-cols-2 gap-2 border-b bg-card p-3 sm:flex sm:flex-wrap"
            role="group"
            aria-label="Chọn tầng"
          >
            <Button
              variant={floor === "all" ? "default" : "ghost"}
              className="min-h-10"
              aria-pressed={floor === "all"}
              onClick={() => changeFloor("all")}
            >
              <Layers3 className="size-4" />
              Toàn tòa nhà
            </Button>
            {building.floors.map((f) => (
              <Button
                key={f.floor}
                variant={floor === f.floor ? "default" : "ghost"}
                className="min-h-10"
                aria-pressed={floor === f.floor}
                onClick={() => changeFloor(f.floor)}
              >
                {f.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={command.view === "overview" ? "secondary" : "ghost"}
                className="min-h-10"
                onClick={() => view("overview")}
                aria-pressed={command.view === "overview"}
              >
                <Box className="size-4" />
                <span className="hidden sm:inline">Phối cảnh</span>
                <span className="sr-only sm:hidden">Phối cảnh</span>
              </Button>
              <Button
                size="sm"
                variant={command.view === "top" ? "secondary" : "ghost"}
                className="min-h-10"
                onClick={() => view("top")}
                aria-pressed={command.view === "top"}
              >
                <Map className="size-4" />
                Mặt bằng
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-10"
                disabled={!room || !shape?.placed}
                onClick={() => view("focus")}
              >
                <Focus className="size-4" />
                Tập trung
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-10"
                aria-label="Thu nhỏ mô hình"
                disabled={command.zoom <= 0.6}
                onClick={() =>
                  setCommand((c) => ({
                    ...c,
                    zoom: Math.max(0.6, c.zoom / 1.25),
                  }))
                }
              >
                <Minus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-10"
                aria-label="Phóng to mô hình"
                disabled={command.zoom >= 3}
                onClick={() =>
                  setCommand((c) => ({
                    ...c,
                    zoom: Math.min(3, c.zoom * 1.25),
                  }))
                }
              >
                <Plus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-10"
                aria-label="Đặt lại góc nhìn"
                onClick={() => view("overview")}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </div>
          <div
            className={cn("relative sm:h-[600px] xl:h-[660px]", "h-[440px]")}
            data-testid="building-canvas-container"
          >
            <Model
              building={building}
              floor={floor}
              selected={selected}
              command={command}
              onSelect={choose}
              onFloor={changeFloor}
              detail={detail}
              point={detail ? navigation.point : null}
              onPoint={choosePoint}
              onEnter={enterRoom}
              person={personId}
              onPerson={choosePerson}
            />
          </div>
          <footer className="flex flex-wrap justify-between gap-2 border-t bg-card px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <MousePointer2 className="size-4" />
              {detail
                ? "Chọn bàn hoặc người · Esc để về tầng"
                : "Nhấp đúp HCNS để vào phòng"}{" "}
              · Kéo để xoay · Cuộn/chụm để thu phóng
            </span>
            <span>Mặt bằng giản lược · Bố trí nội thất tham khảo</span>
          </footer>
        </section>
        <aside
          className="min-w-0 space-y-4"
          aria-label="Phòng và thông tin không gian"
        >
          {detail && building.hcns ? (
            <HcnsRoomPanel
              room={building.hcns}
              selected={navigation.point}
              onSelect={choosePoint}
              personId={personId}
            />
          ) : room && shape ? (
            <section
              className="space-y-4 rounded-2xl border bg-card p-4"
              aria-label="Thông tin phòng"
              aria-live="polite"
            >
              <div>
                <Badge variant="secondary">Tầng {shape.floor}</Badge>
                <h2 className="mt-2 text-lg font-semibold">{room.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {room.state === "unlinked"
                    ? "Bố cục tham khảo · Chưa có dữ liệu vị trí"
                    : room.state === "inactive"
                      ? "Đã ngừng sử dụng"
                      : room.path}
                </p>
                {!shape.placed && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chưa xác định vị trí trên mặt bằng mới.
                  </p>
                )}
              </div>
              {room.key === HCNS_BUILDING_KEY && building.hcns && (
                <Button
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={enterRoom}
                >
                  Vào phòng HCNS · 10 vị trí
                  <ArrowUpRight className="size-4" />
                </Button>
              )}
              {room.description && (
                <p className="whitespace-pre-line text-sm leading-6">
                  {room.description}
                </p>
              )}
              {room.state === "active" && building.canViewEmployees && (
                <div
                  className="space-y-3 border-t pt-3"
                  aria-label="Nhân sự trong không gian"
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4" />
                    Nhân sự đã gán vị trí
                    <Badge variant="secondary">
                      {room.occupants?.length ?? 0}
                    </Badge>
                  </h3>
                  {room.occupants?.length ? (
                    room.occupants.map((p) => (
                      <div key={p.id} className="border-t pt-2">
                        <Link
                          href={`/employees?search=${encodeURIComponent(p.name)}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {p.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[p.position, p.department]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.location}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có nhân sự đang làm việc được gán vào không gian này.
                    </p>
                  )}
                </div>
              )}
              {room.key !== HCNS_BUILDING_KEY && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Chưa có sơ đồ nội thất chi tiết của phòng.
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <CircleDot className="size-5" />
                <h2 className="font-semibold">Khám phá không gian</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Chọn một tầng hoặc phòng trên mô hình để xem thông tin.
              </p>
              {building.hcns && (
                <Button
                  variant="outline"
                  className="mt-4 min-h-11 w-full"
                  onClick={() => choose(HCNS_BUILDING_KEY)}
                >
                  Đến phòng HCNS
                  <ArrowUpRight className="size-4" />
                </Button>
              )}
            </section>
          )}
          {!detail && (
            <section
              className="rounded-2xl border bg-card p-4"
              aria-label="Danh sách phòng"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {floor === "all"
                    ? "Các không gian"
                    : building.floors.find((f) => f.floor === floor)?.name}
                </h2>
                <Badge variant="secondary">{visible.length}</Badge>
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  aria-label="Tìm phòng trong mô hình"
                  placeholder="Tìm phòng…"
                  className="pl-9 text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {visible.map((r) => {
                  const s = BUILDING_ROOMS.find((v) => v.key === r.key)!;
                  return (
                    <Button
                      key={r.key}
                      variant={selected === r.key ? "secondary" : "ghost"}
                      aria-label={`Xem phòng ${r.name}, tầng ${s.floor}`}
                      aria-pressed={selected === r.key}
                      className="h-auto min-h-12 w-full justify-start whitespace-normal px-2 py-2 text-left"
                      onClick={() => choose(r.key)}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                        {BUILDING_ROOMS.indexOf(s) + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {r.name}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Tầng {s.floor}
                          {r.key === HCNS_BUILDING_KEY && building.hcns
                            ? " · Có nội thất chi tiết"
                            : ""}
                        </span>
                      </span>
                    </Button>
                  );
                })}
                {!visible.length && (
                  <p className="py-4 text-sm text-muted-foreground">
                    Không tìm thấy phòng phù hợp.
                  </p>
                )}
              </div>
            </section>
          )}
          <details className="rounded-xl border bg-card p-3 text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Về mô hình này
            </summary>
            <p className="mt-2">
              Giữ bố cục ba tầng đã phác trước đây. Nội thất HCNS theo sơ đồ 10
              vị trí; cầu thang, quầy lễ tân và cây xanh là hình minh họa. Tên
              và nhân sự của các vị trí đã xác nhận được đọc từ dữ liệu quản lý.
              Các khu vực còn lại chờ bổ sung thông tin thực tế.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
