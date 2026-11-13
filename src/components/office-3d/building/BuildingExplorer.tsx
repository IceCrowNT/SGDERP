"use client";
import {
  useEffect,
  useCallback,
  useRef,
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
  Maximize2,
  Minimize2,
  PanelRight,
  MoreHorizontal,
  CircleHelp,
  X,
  MapPin,
  Search,
  RefreshCw,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useExpandedWorkspace, hasWorkspaceOverlay } from "./useExpandedWorkspace";
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
import { RoomOverviewPanel, type RoomTab } from "./RoomOverviewPanel";
import { PlacementEditor } from "./PlacementEditor";
import type { PlacementDraft } from "@/lib/office-3d/placement";
import type { HcnsRoomData } from "@/lib/office-3d/hcns-layout";
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
const desktopQuery = "(min-width: 1024px), (min-width: 640px) and (max-height: 500px)";
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
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
  const [draft,setDraft] = useState<PlacementDraft|null>(null);
  const [placementBusy,setPlacementBusy] = useState(false);
  const objects = building.objects ?? [];
  const selectedObject = objects.find(o=>o.point.key===navigation.point && o.roomKey===selected);
  const scope = detail ? "room:hcns" : `floor:${floor}`;
  const [pending, start] = useTransition();
  const { expanded, setExpanded, workspaceRef, expandButtonRef } = useExpandedWorkspace();
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const [panelOpen, setPanelOpen] = useState<boolean | null>(null);
  const showPanel = panelOpen ?? desktop;
  const panelButtonRef = useRef<HTMLButtonElement>(null);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const [modelAttempt, setModelAttempt] = useState(0);
  const retryModel = useCallback(() => {
    setModelUnavailable(false);
    setModelAttempt(attempt => attempt + 1);
  }, []);
  const revealPanel = useCallback(() => { setPanelOpen(true); setModelUnavailable(true); }, []);
  const [roomTabs, setRoomTabs] = useState<Record<string, RoomTab>>({});
  const [selectedAsset, setSelectedAsset] = useState<{ point: string; id: number } | null>(null);
  const panelScrollRef = useRef<HTMLDivElement>(null);
  function closePanel() {
    if(draft) return;
    setPanelOpen(false);
    panelButtonRef.current?.focus({ preventScroll: true });
  }
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<{
    point: string;
    id: number;
  } | null>(null);
  const personId =
    (detail || selectedObject) && selectedPerson?.point === navigation.point
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
    if(draft) return;
    if (!building.hcns) return;
    setSelectedPerson(null);
    setSelectedAsset(null);
    setCommands(old => ({ ...old, "room:hcns": {
      view: "overview", zoom: 1, sequence: (old["room:hcns"]?.sequence ?? 0) + 1,
    } }));
    setPanelOpen(true);
    navigate({
      floor: 2,
      room: HCNS_BUILDING_KEY,
      detail: true,
      point: "hcns-01",
    });
  }
  function leaveRoom() {
    if(draft) return;
    navigate({ floor: 2, room: HCNS_BUILDING_KEY, detail: false, point: null });
  }
  function choosePoint(point: string) {
    if(draft) return;
    setPanelOpen(true);
    setSelectedPerson(null);
    setSelectedAsset(null);
    const object=objects.find(o=>o.point.key===point);
    if(object) {
      const r=BUILDING_ROOMS.find(r=>r.key===object.roomKey)!;
      navigate({floor:r.floor,room:r.key,detail:r.key===HCNS_BUILDING_KEY&&Boolean(building.hcns),point});
    } else navigate({ ...navigation, point });
  }
  function choosePerson(point: string, id: number) {
    if(draft) return;
    setPanelOpen(true);
    setSelectedPerson({ point, id });
    setSelectedAsset(null);
    navigate({ ...navigation, point });
  }
  function focusRoomRecord(point: string, id: number, kind: "person" | "asset") {
    if(draft) return;
    setPanelOpen(true);
    setSelectedPerson(kind === "person" ? { point, id } : null);
    setSelectedAsset(kind === "asset" ? { point, id } : null);
    const object=objects.find(o=>o.point.key===point);
    const r=BUILDING_ROOMS.find(r=>r.key===(object?.roomKey ?? HCNS_BUILDING_KEY))!;
    const isHcns=r.key===HCNS_BUILDING_KEY&&Boolean(building.hcns);
    const nextScope=isHcns ? "room:hcns" : `floor:${r.floor}`;
    setCommands(old => ({ ...old, [nextScope]: {
      view: "focus", key: point, zoom: 1, sequence: (old[nextScope]?.sequence ?? 0) + 1,
    } }));
    navigate({ floor:r.floor, room:r.key, detail:isHcns, point });
  }
  useEffect(() => {
    panelScrollRef.current?.scrollTo({ top: 0 });
  }, [selected, detail, navigation.point, selectedAsset?.id, personId]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || hasWorkspaceOverlay(workspaceRef.current)) return;
      if(draft) return;
      if (expanded) {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (!detail) return;
      if (
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
  }, [detail, expanded, setExpanded, workspaceRef,draft]);
  const room = building.rooms.find((r) => r.key === selected);
  const shape = BUILDING_ROOMS.find((r) => r.key === selected);
  const roomObjects=objects.filter(o=>o.roomKey===selected);
  const detailsData:HcnsRoomData|null = detail && building.hcns ? {...building.hcns,points:[...building.hcns.points,...roomObjects.map(o=>o.point)]}
    : selectedObject && room ? {name:room.name,path:room.path ?? room.name,points:roomObjects.map(o=>o.point),
      canManage:building.canManage,canViewEmployees:building.canViewEmployees,canManageEmployees:Boolean(building.canManageEmployees),
      canViewAssets:building.canViewAssets,canManageAssets:Boolean(building.canManageAssets)} : null;
  function beginPlacement(edit=false) {
    if(!room?.locationId || room.state!=="active" || shape?.kind!=="room" || !building.canManage || modelUnavailable) return;
    const object=edit ? selectedObject : undefined;
    setDraft({roomKey:room.key,roomId:room.locationId,name:object?.point.name ?? "",kind:object?.kind ?? "BAN",
      angle:object?.angle ?? 0,point:object ? {x:object.x,z:object.z}:null,
      ...(object ? {id:object.id,version:object.version,locationVersion:object.locationVersion}:{}),});
    setPanelOpen(true);
    setCommand(c=>({view:"top",key:room.key,zoom:1,sequence:c.sequence+1}));
  }
  const visible = building.rooms.filter(
    (r) =>
      (floor === "all" ||
        BUILDING_ROOMS.find((s) => s.key === r.key)?.floor === floor) &&
      normalize(r.name).includes(normalize(search)),
  );
  function changeFloor(next: FloorSelection) {
    if(draft) return;
    if (detail && next === 2) {
      leaveRoom();
      return;
    }
    navigate({ floor: next, room: null, detail: false, point: null });
  }
  function choose(key: string) {
    if(draft) return;
    const shape = BUILDING_ROOMS.find((r) => r.key === key);
    if (!shape) return;
    setPanelOpen(true);
    navigate({ floor: shape.floor, room: key, detail: false, point: null });
  }
  function view(next: BuildingCamera["view"]) {
    if(draft) return;
    const targetScope = next === "top" && floor === "all" ? "floor:2" : scope;
    if (targetScope !== scope)
      navigate({ floor: 2, room: null, detail: false, point: null });
    setCommands((old) => ({
      ...old,
      [targetScope]: {
        view: next,
        key: detail || selectedObject ? (navigation.point ?? undefined) : (selected ?? undefined),
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
      </header>
      <div className="h-[640px] min-w-0 sm:h-[720px]">
        <div
          ref={workspaceRef}
          role={expanded ? "dialog" : "region"}
          aria-modal={expanded || undefined}
          aria-label="Không gian làm việc 3D"
          tabIndex={-1}
          data-testid="building-workspace"
          data-expanded={expanded}
          className={cn(
            "flex min-w-0 overflow-hidden border bg-background text-foreground",
            expanded ? "fixed inset-0 z-40 h-dvh w-full" : "relative h-full rounded-2xl",
          )}
        >
          <section aria-label="Mô hình tòa nhà" className="relative min-w-0 flex-1 bg-muted/25">
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
              <div role="group" aria-label="Chọn tầng" inert={Boolean(draft)} className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border bg-card/95 p-1 shadow-sm">
                {detail ? <>
                  <Button variant="ghost" className="min-h-10" aria-label="Trở lại tầng 2" onClick={leaveRoom}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline">Trở lại tầng 2</span>
                    <span className="sm:hidden">Tầng 2</span>
                  </Button>
                  <span className="border-l px-3 text-sm font-semibold" aria-current="page">HCNS</span>
                </> : <>
                  <Button variant={floor === "all" ? "default" : "ghost"} className="min-h-10 px-2 sm:px-3"
                    aria-label="Toàn tòa nhà" aria-pressed={floor === "all"} onClick={() => changeFloor("all")}>
                    <Layers3 className="size-4" />
                    <span className="hidden sm:inline">Toàn tòa nhà</span>
                    <span className="sm:hidden">Tòa nhà</span>
                  </Button>
                  {building.floors.map((f) => <Button key={f.floor}
                    variant={floor === f.floor ? "default" : "ghost"} className="min-h-10 px-2 sm:px-3"
                    aria-pressed={floor === f.floor} onClick={() => changeFloor(f.floor)}>{f.name}</Button>)}
                </>}
              </div>
              <div className="pointer-events-auto ml-auto flex items-center rounded-xl border bg-card/95 p-1 shadow-sm">
                <Button ref={panelButtonRef} variant="ghost" size="icon" className="size-10"
                  aria-label={showPanel ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"}
                  title={showPanel ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"}
                  aria-expanded={showPanel} aria-controls="building-information"
                  disabled={Boolean(draft)} onClick={() => setPanelOpen(!showPanel)}><PanelRight className="size-4" /></Button>
                <Button ref={expandButtonRef} variant="ghost" size="icon" className="size-10"
                  aria-label={expanded ? "Thu gọn không gian 3D" : "Mở rộng không gian 3D"}
                  title={expanded ? "Thu gọn không gian 3D" : "Mở rộng không gian 3D"}
                  aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>
                  {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-10"
                    disabled={Boolean(draft)} aria-label="Thao tác không gian"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={pending} onSelect={() => start(() => router.refresh())}>
                      <RefreshCw className={cn("size-4", pending && "animate-spin")} />Cập nhật dữ liệu
                    </DropdownMenuItem>
                    {building.canManage && <DropdownMenuItem asChild>
                      <Link href="/locations"><MapPin className="size-4" />Quản lý vị trí</Link>
                    </DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className={cn("absolute inset-x-2 top-32 sm:top-28 xl:top-20",
              showPanel && !desktop
                ? "bottom-[calc(45%+8rem)] min-[380px]:bottom-[calc(45%+5rem)]"
                : "bottom-32 min-[380px]:bottom-20")} data-testid="building-canvas-container">
              <Model building={building} floor={floor} selected={selected} command={command}
                onSelect={choose} onFloor={changeFloor} detail={detail}
                point={navigation.point} onPoint={choosePoint} onEnter={enterRoom}
                key={modelAttempt} person={personId} onPerson={choosePerson} onUnavailable={revealPanel} onRetry={retryModel}
                draft={draft} onPlace={(x,z)=>{if(!placementBusy)setDraft(d=>d ? {...d,point:{x,z}}:null);}} />
            </div>
            <div className={cn("pointer-events-none absolute inset-x-3 z-10 flex flex-wrap items-end justify-between gap-2",
              showPanel && !desktop ? "bottom-[calc(45%+0.75rem)]" : "bottom-3")}>
              <div inert={Boolean(draft)} className="pointer-events-auto flex rounded-xl border bg-card/95 p-1 shadow-sm" role="group" aria-label="Góc nhìn">
                <Button size="sm" variant={command.view === "overview" ? "secondary" : "ghost"}
                  className="min-h-10 min-w-10 px-2" onClick={() => view("overview")}
                  aria-label="Phối cảnh" title="Phối cảnh" aria-pressed={command.view === "overview"}>
                  <Box className="size-4" /><span className="hidden sm:inline">Phối cảnh</span>
                </Button>
                <Button size="sm" variant={command.view === "top" ? "secondary" : "ghost"}
                  className="min-h-10 min-w-10 px-2" onClick={() => view("top")}
                  aria-label="Mặt bằng" title="Mặt bằng" aria-pressed={command.view === "top"}>
                  <Map className="size-4" /><span className="hidden sm:inline">Mặt bằng</span>
                </Button>
                <Popover>
                  <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-10"
                    aria-label="Hướng dẫn thao tác 3D"><CircleHelp className="size-4" /></Button></PopoverTrigger>
                  <PopoverContent side="top" className="w-72 p-4 text-sm leading-6" aria-label="Hướng dẫn thao tác 3D">
                    <p className="font-semibold">Khám phá mô hình</p>
                    <p>Kéo để xoay, cuộn hoặc chụm để thu phóng. Chọn phòng, bàn hoặc người để xem thông tin.</p>
                    <p className="mt-2">Nhấp đúp HCNS để vào phòng, hoặc dùng nút trong bảng thông tin. Danh sách phòng/vị trí hỗ trợ bàn phím.</p>
                    <p className="mt-2 text-muted-foreground">Esc đóng hộp thoại trước, sau đó thu gọn màn hình; ở chế độ thường sẽ quay về tầng.</p>
                    <p className="mt-2 text-xs text-muted-foreground">Mặt bằng giản lược · Nội thất theo khảo sát, kích thước ước lượng.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="pointer-events-auto ml-auto flex rounded-xl border bg-card/95 p-1 shadow-sm" role="group" aria-label="Điều chỉnh mô hình">
                {room && shape?.placed && <Button disabled={Boolean(draft)} size="icon" variant="ghost" className="size-10"
                  aria-label="Tập trung" title="Tập trung vào vị trí đang chọn" onClick={() => view("focus")}><Focus className="size-4" /></Button>}
                <Button size="icon" variant="ghost" className="size-10" aria-label="Thu nhỏ mô hình" title="Thu nhỏ mô hình"
                  disabled={command.zoom <= 0.6} onClick={() => setCommand(c => ({ ...c, zoom: Math.max(0.6, c.zoom / 1.25) }))}><Minus className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-10" aria-label="Phóng to mô hình" title="Phóng to mô hình"
                  disabled={command.zoom >= 3} onClick={() => setCommand(c => ({ ...c, zoom: Math.min(3, c.zoom * 1.25) }))}><Plus className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-10" aria-label="Đặt lại góc nhìn" title="Đặt lại góc nhìn"
                  disabled={Boolean(draft)} onClick={() => view("overview")}><RotateCcw className="size-4" /></Button>
              </div>
            </div>
            <span role="status" className="sr-only">{pending ? "Đang cập nhật dữ liệu" : ""}</span>
          </section>
          <aside id="building-information" aria-label="Phòng và thông tin không gian"
            className={cn("z-20 min-w-0 flex-col bg-background",
              desktop ? "h-full w-80 shrink-0 border-l" : "absolute inset-x-0 bottom-0 h-[45%] rounded-t-2xl border-t shadow-lg",
              showPanel ? "flex" : "hidden")}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
              <div className="min-w-0"><h2 className="break-words font-semibold">{detail ? "Vị trí và hồ sơ" : room?.name ?? "Thông tin không gian"}</h2>{!detail && room && shape && <p className="mt-1 text-xs text-muted-foreground">Tầng {shape.floor}</p>}</div>
              <Button disabled={Boolean(draft)} variant="ghost" size="icon" className="size-10" aria-label="Đóng bảng thông tin" onClick={closePanel}><X className="size-4" /></Button>
            </div>
            <div ref={panelScrollRef} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-3">
          {draft ? <PlacementEditor draft={draft} roomName={building.rooms.find(r=>r.key===draft.roomKey)?.name ?? ""} objects={objects}
            onChange={setDraft} onBusy={setPlacementBusy} onCancel={()=>setDraft(null)} onSaved={point=>{
              setDraft(null);setSelectedAsset(null);setSelectedPerson(null);
              navigate({...navigation,room:draft.roomKey,floor:BUILDING_ROOMS.find(r=>r.key===draft.roomKey)!.floor,point});
              router.refresh();
            }}/> : <>
          {building.canManage && room?.state === "active" && shape?.placed && shape.kind==="room" && !modelUnavailable && <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-10" onClick={()=>beginPlacement()}><Plus className="size-4"/>Thêm vị trí</Button>
            {selectedObject && <Button variant="outline" className="min-h-10" onClick={()=>beginPlacement(true)}>Chỉnh bố trí</Button>}
          </div>}
          {selectedObject && !detail && <Button variant="ghost" onClick={()=>navigate({...navigation,point:null})}><ArrowLeft className="size-4"/>Tổng quan phòng</Button>}
          {detailsData ? (
            <HcnsRoomPanel
              room={detailsData}
              selected={navigation.point}
              onSelect={choosePoint}
              personId={personId}
              assetId={selectedAsset?.point === navigation.point ? selectedAsset.id : null}
            />
          ) : room && shape ? (
            <RoomOverviewPanel room={room} placed={shape.placed}
              canViewEmployees={building.canViewEmployees} canViewAssets={building.canViewAssets}
              tab={roomTabs[room.key]} onTabChange={tab => setRoomTabs(old => ({ ...old, [room.key]: tab }))}
              onEnter={room.key === HCNS_BUILDING_KEY && building.hcns ? enterRoom : undefined}
              onPerson={(point, id) => focusRoomRecord(point, id, "person")}
              onAsset={(point, id) => focusRoomRecord(point, id, "asset")} />
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
          {!detailsData && roomObjects.length>0 && <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-medium">Vị trí đã thêm · {roomObjects.length}</summary>
            <div className="mt-2 space-y-1">{roomObjects.map(o=><Button key={o.id} variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal text-left" onClick={()=>choosePoint(o.point.key)}><MapPin className="size-4 shrink-0"/>{o.point.name}</Button>)}</div>
          </details>}
          {!detail && (
            <details key={`${floor}:${selected ?? "none"}:${modelUnavailable}`} open={!room || modelUnavailable}
              className="border-t pt-3">
              <summary className="min-h-10 cursor-pointer rounded py-2 text-sm font-medium focus-visible:outline-ring">{room ? "Đổi phòng" : "Danh sách phòng"}</summary>
              <div role="region" aria-label="Danh sách phòng">
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
              </div>
            </details>
          )}
          <details className="rounded-xl border bg-card p-3 text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Về mô hình này
            </summary>
            <p className="mt-2">
              Mặt bằng ba tầng theo bản vẽ kiến trúc giản lược. HCNS có 10 vị trí
              theo khảo sát; có thể thêm bàn hoặc điểm thiết bị trong phòng đã liên kết.
              Kích thước nội thất ước lượng. Người và tài sản hiển thị theo dữ liệu đã gán.
            </p>
          </details>
          </>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
