"use client";
import { RoomLinkDialog } from "./RoomLinkDialog";
import { canEnterRoom, roomDetailData, roomShortName, roomCameraScope } from "@/lib/office-3d/room-detail";
import type { ObjectEditTarget } from "./ObjectEditDialog";
import { LocationEditDialog } from "@/components/locations/LocationEditDialog";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
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
  RefreshCw,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel } from "@/components/ui/context-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useExpandedWorkspace, hasWorkspaceOverlay } from "./useExpandedWorkspace";
import { cn } from "@/lib/utils";
import {
  BUILDING_ROOMS, isManageableSpace,
  type FloorSelection,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import type { BuildingCamera } from "./BuildingCanvas";
import {
  buildingUrl,
  parentBuildingNavigation,
  selectionCameraKey,
  readBuildingNavigation,
  type BuildingNavigation,
  type BuildingTarget,
} from "@/lib/office-3d/building-navigation";
import { RoomPointPanel, RoomPointList } from "./RoomPointPanel";
import { RoomOverviewPanel, type RoomTab } from "./RoomOverviewPanel";
import { SceneSearch, SceneFilterResults } from "./SceneSearch";
import { SceneLayerControls } from "./SceneLayerControls";
import { SpaceDirectory } from "./SpaceDirectory";
import { filterScene, personDestination, assetDestination, DEFAULT_SCENE_LAYERS, type SceneLayers, type AssetSceneCategory } from "@/lib/office-3d/scene-filter";
import { PlacementEditor } from "./PlacementEditor";
import type { PlacementDraft } from "@/lib/office-3d/placement";
import { assetsForEquipment, equipmentForAssets, type EquipmentKind } from "@/lib/office-3d/hcns-layout";
const ObjectEditDialog = dynamic(() => import("./ObjectEditDialog").then(m => m.ObjectEditDialog));
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
  const detail = navigation.detail && canEnterRoom(building, selected);
  const [draft,setDraft] = useState<PlacementDraft|null>(null);
  const [placementBusy,setPlacementBusy] = useState(false);
  const objects = building.objects ?? [];
  const selectedObject = objects.find(o=>o.point.key===navigation.point && o.roomKey===selected);
  const scope = detail ? roomCameraScope(selected) : `floor:${floor}`;
  const [pending, start] = useTransition();
  const { expanded, setExpanded, workspaceRef, expandButtonRef } = useExpandedWorkspace();
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const [panelOpen, setPanelOpen] = useState<boolean | null>(null);
  const showPanel = panelOpen ?? desktop;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(144);
  const frameRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      // Use the page position, not the current scroll position: scrolling must
      // not keep growing the viewer. Browser chrome/zoom are reflected in CSS px.
      const top = frame.getBoundingClientRect().top + window.scrollY
        + (frame.closest("main")?.scrollTop ?? 0);
      setAvailableHeight(Math.floor((window.visualViewport?.height ?? window.innerHeight) - top - 16));
    };
    const observer = new ResizeObserver(measure);
    if (frame.parentElement) observer.observe(frame.parentElement);
    const header = document.querySelector("header");
    if (header) observer.observe(header);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);
  // On very short screens retain a usable canvas and allow normal page scroll.
  const minimumHeight = Math.ceil((toolbarHeight + 24 + 128 + 180) / (showPanel && !desktop ? .65 : 1));
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const observer = new ResizeObserver(() => setToolbarHeight(Math.ceil(toolbar.getBoundingClientRect().height)));
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);
  const panelButtonRef = useRef<HTMLButtonElement>(null);
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const [modelAttempt, setModelAttempt] = useState(0);
  const retryModel = useCallback(() => {
    setModelUnavailable(false);
    setModelAttempt(attempt => attempt + 1);
  }, []);
  const revealPanel = useCallback(() => { setPanelOpen(true); setModelUnavailable(true); }, []);
  const [roomTabs, setRoomTabs] = useState<Record<string, RoomTab>>({});
  const selectedAsset = navigation.point && navigation.asset ? {point:navigation.point,id:navigation.asset} : null;
  const panelScrollRef = useRef<HTMLDivElement>(null);
  function closePanel() {
    if(draft) return;
    setPanelOpen(false);
    panelButtonRef.current?.focus({ preventScroll: true });
  }
  const [showRoomLabels, setShowRoomLabels] = useState(true);
  const [layers, setLayers] = useState<SceneLayers>(DEFAULT_SCENE_LAYERS);
  const activeCategory = layers.assets && !navigation.point ? layers.category : null;
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const scene = filterScene(building, layers, floor, selected);
  const [contextBackground, setContextBackground] = useState(false);
  const [editingObject, setEditingObject] = useState<ObjectEditTarget | null>(null);
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
    setSearchNotice(null);
    const url = buildingUrl(next);
    if (`${window.location.pathname}${window.location.search}` !== url)
      window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(NAVIGATION_EVENT));
  }
  function enterRoom(key = selected) {
    if (draft || !canEnterRoom(building, key)) return;
    const shape = BUILDING_ROOMS.find(r => r.key === key)!;
    const nextScope = roomCameraScope(key);
    setSelectedPerson(null);
    setCommands(old => ({ ...old, [nextScope]: {
      view: "overview", zoom: 1, sequence: (old[nextScope]?.sequence ?? 0) + 1,
    } }));
    setPanelOpen(true);
    navigate({ floor: shape.floor, room: key, detail: true, point: null });
  }
  function roomOverview() {
    if (draft || !selected) return;
    setSelectedPerson(null);

    setPanelOpen(true);
    navigate({ ...navigation, point: null, asset:undefined,equipment:undefined });
    setCommand(c => ({ view: detail ? "overview" : "focus", key: detail ? undefined : selected,
      zoom: 1, sequence: c.sequence + 1, restoreKey: selectionCameraKey({...navigation,point:null,asset:undefined,equipment:undefined}) }));
  }
  function leaveRoom() {
    if(draft) return;
    navigate({ floor, room: selected, detail: false, point: null });
  }
  function choosePoint(point: string) {
    if(draft) return;
    setPanelOpen(true);
    setSelectedPerson(null);

    const object=objects.find(o=>o.point.key===point);
    if(object) {
      const r=BUILDING_ROOMS.find(r=>r.key===object.roomKey)!;
      navigate({floor:r.floor,room:r.key,detail:canEnterRoom(building,r.key),point});
    } else navigate({ ...navigation, point, asset:undefined,equipment:undefined });
  }
  function choosePerson(point: string, id: number) {
    if (draft) return;
    choosePoint(point);
    setSelectedPerson({ point, id });
  }
  function focusRoomRecord(point: string, id: number, kind: "person" | "asset") {
    if(draft) return;
    const object=objects.find(o=>o.point.key===point);
    if (!object) return;
    const r=BUILDING_ROOMS.find(r=>r.key===object.roomKey);
    if (!r) return;
    setPanelOpen(true);
    setSelectedPerson(kind === "person" ? { point, id } : null);
    const isDetail=canEnterRoom(building,r.key);
    const nextScope=isDetail ? roomCameraScope(r.key) : `floor:${r.floor}`;
    setCommands(old => ({ ...old, [nextScope]: {
      view: "focus", key: point, zoom: 1, sequence: (old[nextScope]?.sequence ?? 0) + 1,
    } }));
    navigate({ floor:r.floor, room:r.key, detail:isDetail, point, ...(kind === "asset" ? {asset:id} : {}) });
  }
  function filterCategory(category: AssetSceneCategory | null) {
    if (draft) return;
    setLayers(old => ({ ...old, category }));
    if (category) setPanelOpen(true);
  }
  function findAsset(id: number) {
    if (draft) return;
    const destination = assetDestination(building, id);
    if (!destination) return;
    setLayers(old => ({ ...old, assets: true, category: null }));
    setPanelOpen(true);
    const { asset, navigation: next } = destination;
    if (!next) {
      setSearchNotice(`${asset.name}: vị trí chưa được liên kết với hình phòng trên mô hình này.`);
      return;
    }
    if (next.point) focusRoomRecord(next.point, id, "asset");
    else {
      setSelectedPerson(null);

      const nextScope = next.detail ? roomCameraScope(next.room) : `floor:${next.floor}`;
      setCommands(old => ({ ...old, [nextScope]: { view: "focus", key: next.room,
        zoom: 1, sequence: (old[nextScope]?.sequence ?? 0) + 1 } }));
      navigate(next);
      setRoomTabs(old => ({ ...old, [next.room]: "assets" }));
      setSearchNotice(`${asset.name}: đã đến phòng; vị trí chưa có điểm riêng trên mô hình.`);
    }
  }
  function findPerson(id: number) {
    if (draft) return;
    const destination = personDestination(building, id);
    if (!destination) return;
    setLayers(old => ({ ...old, people: true }));
    setPanelOpen(true);
    const { person, navigation: next } = destination;
    if (!next) {
      setSearchNotice(`${person.name}: ${person.location ? `vị trí ${person.location} chưa được liên kết với mô hình này.` : "chưa được gán vị trí làm việc."}`);
      return;
    }
    if (next.point) {
      focusRoomRecord(next.point, id, "person");
    } else {
      setSelectedPerson(null);

      const nextScope = next.detail ? roomCameraScope(next.room) : `floor:${next.floor}`;
      setCommands(old => ({ ...old, [nextScope]: { view: "focus", key: next.room,
        zoom: 1, sequence: (old[nextScope]?.sequence ?? 0) + 1 } }));
      navigate(next);
      setRoomTabs(old => ({ ...old, [next.room]: "people" }));
      setSearchNotice(`${person.name}: đã đến phòng; ${person.location ?? "vị trí làm việc"} chưa có điểm riêng trên mô hình.`);
    }
  }
  useEffect(() => {
    panelScrollRef.current?.scrollTo({ top: 0 });
  }, [selected, detail, navigation.point, selectedAsset?.id, personId]);
  function backOne() {
    if (draft) return;
    const next = parentBuildingNavigation(navigation);
    if (buildingUrl(next) === buildingUrl(navigation)) { if (expanded) setExpanded(false); return; }
    setSelectedPerson(null);
    setPanelOpen(next.room || modelUnavailable || activeCategory ? true : null);
    const nextScope = next.detail ? roomCameraScope(next.room) : `floor:${next.floor}`;
    setCommands(old => ({...old,[nextScope]:{view:next.point || next.room ? "focus":"overview",
      key:next.point ?? next.room ?? undefined,zoom:1,sequence:(old[nextScope]?.sequence ?? 0)+1,
      restoreKey:selectionCameraKey(next)}}));
    navigate(next);
  }
  // One Escape handler for normal and expanded workspace; overlays/drafts own it first.
  const backRef = useRef(backOne);
  useEffect(() => { backRef.current = backOne; });
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || hasWorkspaceOverlay(workspaceRef.current) || draft) return;
      if (event.target instanceof HTMLElement && (
        (event.target !== document.body && !workspaceRef.current?.contains(event.target)) ||
        event.target.matches("input,textarea,select") || event.target.isContentEditable)) return;
      event.preventDefault(); backRef.current();
    }
    function historyCamera() {
      const next = readBuildingNavigation(new URLSearchParams(window.location.search));
      const nextScope = next.detail ? roomCameraScope(next.room) : `floor:${next.floor}`;
      setSelectedPerson(null);
      setCommands(old => ({...old,[nextScope]:{view:next.point || next.room ? "focus":"overview",
        key:next.point ?? next.room ?? undefined,equipment:next.equipment,assetId:next.asset,zoom:1,
        sequence:(old[nextScope]?.sequence ?? 0)+1,restoreKey:selectionCameraKey(next)}}));
    }
    window.addEventListener("keydown", escape);
    window.addEventListener("popstate", historyCamera);
    return () => {window.removeEventListener("keydown", escape);window.removeEventListener("popstate", historyCamera);};
  }, [workspaceRef, draft]);
  const room = building.rooms.find((r) => r.key === selected);
  const shape = BUILDING_ROOMS.find((r) => r.key === selected);
  const roomObjects=objects.filter(o=>o.roomKey===selected);
  const roomData = detail || selectedObject ? roomDetailData(building, selected) : null;
  const roomLabel = roomShortName(selected, room?.name);
  const detailsData = navigation.point ? roomData : null;
  const currentPoint = roomData?.points.find(p=>p.key===navigation.point);
  const activeEquipment = navigation.equipment ?? (navigation.asset && currentPoint?.assets
    ? equipmentForAssets(currentPoint.assets.filter(a=>a.id===navigation.asset))[0] : undefined);
  function focusPoint(key: string, equipment?: EquipmentKind, assetId?: number) {
    if(draft) return;
    const object=objects.find(o=>o.point.key===key);
    if (!object) return;
    const r=BUILDING_ROOMS.find(r=>r.key===object.roomKey);
    if (!r) return;
    const isDetail=canEnterRoom(building,r.key);
    const nextScope=isDetail ? roomCameraScope(r.key) : `floor:${r.floor}`;
    if (!equipment) choosePoint(key);
    setCommands(old=>({...old,[nextScope]:{view:"focus",key,equipment,assetId,zoom:1,sequence:(old[nextScope]?.sequence ?? 0)+1}}));
  }
  function chooseEquipment(key: string, kind: EquipmentKind, focus: boolean, assetId?: number) {
    if(draft || !building.canViewAssets) return;
    const p = scene.hcns?.points.find(p=>p.key===key) ?? scene.objects?.find(o=>o.point.key===key)?.point;
    const matches = assetsForEquipment(p?.assets ?? [],kind).filter(a=>assetId === undefined || a.id === assetId);
    if (!matches.length) return;
    const object=objects.find(o=>o.point.key===key);
    if (!object) return;
    const r=BUILDING_ROOMS.find(r=>r.key===object.roomKey);
    if (!r) return;
    setSelectedPerson(null);setPanelOpen(true);
    navigate({floor:r.floor,room:r.key,detail:canEnterRoom(building,r.key),point:key,
      equipment:kind,...(matches.length===1 ? {asset:matches[0].id} : {})});
    if(focus) focusPoint(key,kind,matches.length===1 ? matches[0].id : undefined);
  }
  function chooseAsset(id:number) {
    if(!currentPoint?.assets?.some(a=>a.id===id) || !building.canViewAssets) return;
    navigate({...navigation,asset:id});
  }
  function beginPlacement(edit=false) {
    if(!room?.locationId || room.state!=="active" || !isManageableSpace(shape) || !building.canManage || modelUnavailable || pending) return;
    const object=edit ? selectedObject : room.directPoint ? objects.find(o=>o.point.locationId===room.directPoint!.id) : undefined;
    setDraft({roomKey:room.key,roomId:room.locationId,name:object?.point.name ?? room.directPoint?.name ?? "",kind:object?.kind ?? room.directPoint?.kind ?? "BAN",
      model:object?.model ?? (shape?.kind === "reception" ? "QUAY_LE_TAN" : "MAC_DINH"),
      ...(room.directPoint ? {locationId:room.directPoint.id,locationVersion:room.directPoint.version} : {}),
      width:object?.width,depth:object?.depth,angle:object?.angle ?? (shape?.kind === "reception" ? 180 : 0),point:object ? {x:object.x,z:object.z}:null,
      ...(object ? {id:object.id,version:object.version,locationVersion:object.locationVersion}:{}),});
    setPanelOpen(true);
    setCommand(c=>({view:"top",key:room.key,zoom:1,sequence:c.sequence+1}));
  }
  function changeFloor(next: FloorSelection) {
    if(draft) return;
    if (detail && next === floor) {
      leaveRoom();
      return;
    }
    setPanelOpen(modelUnavailable || activeCategory ? true : null);
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
    if(next === "focus" && navigation.point) {focusPoint(navigation.point,activeEquipment,navigation.asset);return;}
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
  function contextTarget(target: BuildingTarget) {
    if (draft) return;
    setContextBackground(target.kind === "background");
    if (target.kind === "room") choose(target.key);
    if (target.kind === "floor") changeFloor(target.floor);
    if (target.kind === "point") {
      if (target.equipment) chooseEquipment(target.key,target.equipment,false,target.assetId);
      else choosePoint(target.key);
      if (target.personId) setSelectedPerson({ point: target.key, id: target.personId });
    }
  }
  const selectedPoint = roomData?.points.find(p => p.key === navigation.point);
  const contextPerson = selectedPoint?.occupants?.find(p => p.id === personId);
  const contextAsset = selectedPoint?.assets?.find(a => a.id === selectedAsset?.id);
  const equipmentPoint = scene.hcns?.points.find(p => p.key === navigation.point) ?? scene.objects?.find(o => o.point.key === navigation.point)?.point;
  const contextAssets = contextAsset ? [contextAsset] : navigation.equipment ? assetsForEquipment(equipmentPoint?.assets ?? [], navigation.equipment) : [];
  const assetContext = Boolean(navigation.asset || navigation.equipment);
  const editLocationId = selectedPoint ? selectedPoint.state !== "unlinked" ? selectedPoint.locationId : undefined : room?.state !== "unlinked" ? room?.locationId : undefined;
  const editTarget: ObjectEditTarget | null = assetContext
    ? building.canManageAssets && contextAssets.length ? { kind: "asset", ids: contextAssets.map(a => a.id) } : null
    : personId ? building.canManageEmployees && contextPerson ? { kind: "person", id: contextPerson.id } : null
      : building.canManage && editLocationId ? { kind: "location", id: editLocationId } : null;
  const editLabel = assetContext ? "Sửa tài sản" : personId ? "Sửa nhân sự" : "Sửa thông tin vị trí";
  // One set of commands for mouse, touch and keyboard; authorization remains
  // in the existing server actions and the same editor/assignment components.
  function spaceActions(background = false) {
    const editableRoom = Boolean(building.canManage && room?.state === "active" && isManageableSpace(shape));
    return [
      { id: "focus", label: "Tập trung vào đối tượng", icon: Focus, show: !background && Boolean(room && shape?.placed), disabled: modelUnavailable, run: () => view("focus") },
      { id: "edit-record", label: editLabel, icon: Pencil, show: !background && Boolean(editTarget), run: () => { if (editTarget) setEditingObject(editTarget); } },
      { id: "information", label: "Xem thông tin", icon: PanelRight, show: !background && Boolean(room), run: () => setPanelOpen(true) },
      { id: "overview", label: "Tổng quan phòng", icon: Box, show: Boolean(room), run: roomOverview },
      { id: "enter", label: `Vào phòng ${roomLabel}`, icon: ArrowUpRight, show: !detail && canEnterRoom(building, selected), run: () => enterRoom() },
      { id: "floor", label: `Trở lại tầng ${floor}`, icon: ArrowLeft, show: Boolean(room), run: () => navigate({ floor, room: null, detail: false, point: null }) },
      { id: "add", label: "Thêm vị trí", icon: Plus, show: editableRoom, disabled: modelUnavailable || pending, run: () => beginPlacement() },
      { id: "edit", label: "Chỉnh bố trí", icon: Pencil, show: !background && editableRoom && Boolean(selectedObject), disabled: modelUnavailable || pending, run: () => beginPlacement(true) },
      { id: "reset", label: "Đặt lại góc nhìn", icon: RotateCcw, show: true, disabled: modelUnavailable, run: () => view("overview") },
      { id: "refresh", label: "Cập nhật dữ liệu", icon: RefreshCw, show: true, disabled: pending, run: () => start(() => router.refresh()) },
      { id: "locations", label: "Quản lý vị trí", icon: MapPin, show: building.canManage, run: () => router.push("/locations") },
    ].filter(action => action.show);
  }
  const contextTitle = contextBackground ? (detail ? "Tổng quan phòng" : floor === "all" ? building.name : `Tầng ${floor}`)
    : contextAsset?.name ?? (assetContext ? "Chọn tài sản" : contextPerson?.name) ?? selectedPoint?.name ?? room?.name ?? (floor === "all" ? building.name : `Tầng ${floor}`);
  return (
    <div className="min-w-0 space-y-3">
      {editingObject && <ObjectEditDialog target={editingObject} onClose={() => { setEditingObject(null); requestAnimationFrame(() => panelButtonRef.current?.focus({ preventScroll: true })); }} />}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="size-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {detail ? `Không gian ${roomLabel}` : "Bản đồ 3D tòa nhà"}
            </h1>
          </div>

        </div>
      </header>
      <div ref={frameRef} className="min-w-0" style={{
        height: availableHeight === null ? "calc(100dvh - 10rem)" : Math.max(minimumHeight, availableHeight),
        minHeight: minimumHeight,
      }}>
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
          <section aria-label="Mô hình tòa nhà" className="@container relative min-w-0 flex-1 bg-muted/25">
            <div ref={toolbarRef} data-testid="scene-toolbar" className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start gap-2">
              <div role="group" aria-label="Chọn tầng" inert={Boolean(draft)} className="pointer-events-auto order-1 flex max-w-full shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-card/95 p-0.5">
                {detail ? <>
                  <Button variant="ghost" className="min-h-10" aria-label={`Trở lại tầng ${floor}`} onClick={leaveRoom}>
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline">Trở lại tầng {floor}</span>
                    <span className="sm:hidden">Tầng {floor}</span>
                  </Button>
                  <Button variant="ghost" className="min-h-10 border-l px-3" aria-label={`Tổng quan phòng ${roomLabel}`} aria-pressed={!navigation.point} onClick={roomOverview}>{roomLabel}</Button>
                </> : <>
                  <Button variant="ghost" className="min-h-10 px-2 shadow-none aria-pressed:bg-primary/10 aria-pressed:text-primary hover:bg-muted hover:text-foreground sm:px-3"
                    aria-label="Toàn tòa nhà" aria-pressed={floor === "all"} onClick={() => changeFloor("all")}>
                    <Layers3 className="size-4" />
                    <span className="hidden sm:inline">Toàn tòa nhà</span>
                    <span className="sm:hidden">Tòa nhà</span>
                  </Button>
                  {building.floors.map((f) => <Button key={f.floor}
                    variant="ghost" className="min-h-10 px-2 shadow-none aria-pressed:bg-primary/10 aria-pressed:text-primary hover:bg-muted hover:text-foreground sm:px-3"
                    aria-pressed={floor === f.floor} onClick={() => changeFloor(f.floor)}>{f.name}</Button>)}
                </>}
              </div>
              <div className="pointer-events-auto order-2 ml-auto flex shrink-0 items-center rounded-lg border border-border/60 bg-card/95 p-0.5 @[56rem]:order-3">
                <Button ref={panelButtonRef} variant="ghost" size="icon" className="size-10"
                  aria-label={showPanel ? "Ẩn bảng thông tin" : "Hiện bảng thông tin"}
                  title={showPanel ? "Ẩn bảng thông tin" : selected ? "Hiện bảng thông tin" : "Danh sách không gian"}
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
                    {spaceActions().map(action => <DropdownMenuItem key={action.id} disabled={action.disabled} onSelect={action.run}>
                      <action.icon className="size-4" />{action.label}
                    </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="pointer-events-auto order-3 min-w-0 basis-full @[56rem]:order-2 @[56rem]:flex-1 @[56rem]:basis-64" inert={Boolean(draft)}>
                <div className="relative flex flex-col items-start gap-2 @[20rem]:flex-row">
                  <div className="w-full min-w-0 flex-1"><SceneSearch key={`${buildingUrl(navigation)}:${personId ?? ""}:${selectedAsset?.point === navigation.point ? selectedAsset.id : ""}`} building={building} disabled={Boolean(draft)}
                    onSelect={item => item.kind === "person" ? findPerson(item.id) : findAsset(item.id)} /></div>
                  <SceneLayerControls building={building} layers={layers} disabled={Boolean(draft)}
                    showRoomLabels={showRoomLabels} onRoomLabels={setShowRoomLabels}
                    onToggle={layer => setLayers(old => ({ ...old, [layer]: !old[layer] }))} onCategory={filterCategory} />
                </div>
                {layers.assets && layers.category && <p className="mt-1 w-fit max-w-full rounded-md bg-card/95 px-2 py-1 text-xs text-foreground" role="status">Tài sản: {layers.category.name}</p>}
              </div>
            </div>
            <ContextMenu>
            <ContextMenuTrigger asChild disabled={Boolean(draft)}>
            <div onContextMenuCapture={() => setContextBackground(true)} style={{top: toolbarHeight + 24}} className={cn("absolute inset-x-2",
              showPanel && !desktop
                ? "bottom-[calc(35%+8rem)] min-[380px]:bottom-[calc(35%+5rem)]"
                : "bottom-32 min-[380px]:bottom-20")} data-testid="building-canvas-container">
              <Model building={building} scene={scene} showRoomLabels={showRoomLabels} floor={floor} selected={selected} command={command}
                onSelect={choose} onFloor={changeFloor} detail={detail}
                point={navigation.point} onPoint={choosePoint} onEnter={enterRoom}
                onFocusPoint={key=>focusPoint(key)} onEquipment={chooseEquipment} activeEquipment={activeEquipment} activeAsset={navigation.asset}
                selectionKey={selectionCameraKey(navigation)}
                key={modelAttempt} person={personId} onPerson={choosePerson} onUnavailable={revealPanel} onRetry={retryModel} onOverview={roomOverview}
                onContextTarget={contextTarget}
                draft={draft} onPlace={(x,z)=>{if(!placementBusy)setDraft(d=>d ? {...d,point:{x,z}}:null);}} />
            </div>
            </ContextMenuTrigger>
            <ContextMenuContent aria-label="Thao tác trên mô hình">
              <ContextMenuLabel>{contextTitle}</ContextMenuLabel>
              {spaceActions(contextBackground).map(action => <ContextMenuItem key={action.id} disabled={action.disabled} onSelect={action.run}>
                <action.icon />{action.label}
              </ContextMenuItem>)}
            </ContextMenuContent>
            </ContextMenu>
            <div className={cn("pointer-events-none absolute inset-x-3 z-10 flex flex-wrap items-end justify-between gap-2",
              showPanel && !desktop ? "bottom-[calc(35%+0.75rem)]" : "bottom-3")}>
              <div inert={Boolean(draft)} className="pointer-events-auto flex rounded-lg border border-border/60 bg-card/95 p-0.5" role="group" aria-label="Góc nhìn">
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
                    <p>Kéo chuột trái để xoay, giữ chuột giữa để dịch chuyển; cuộn để thu phóng. Trên màn hình cảm ứng, dùng một ngón để xoay, hai ngón để dịch chuyển hoặc thu phóng.</p>
                    <p className="mt-2">Nhấp đúp phòng đã liên kết để vào phòng, hoặc dùng nút trong bảng thông tin. Danh sách phòng/vị trí hỗ trợ bàn phím.</p>
                    <p className="mt-2">Bấm bàn/người/thiết bị để xem chi tiết; nhấp đúp bàn hoặc thiết bị để tập trung gần. Bấm nền hoặc tên phòng để về tổng quan. Chuột phải hoặc nút … mở các thao tác theo lựa chọn.</p>
                    <p className="mt-2 text-muted-foreground">Esc đóng menu/hộp thoại trước, rồi lùi tài sản → vị trí → phòng → tầng → toàn nhà. Ở toàn nhà, Esc thu gọn khung mở rộng.</p>
                    <p className="mt-2 text-xs text-muted-foreground">Mặt bằng giản lược · Nội thất theo khảo sát, kích thước ước lượng.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="pointer-events-auto ml-auto flex rounded-lg border border-border/60 bg-card/95 p-0.5" role="group" aria-label="Điều chỉnh mô hình">
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
              desktop ? "h-full w-80 shrink-0 border-l" : "absolute inset-x-0 bottom-0 h-[35%] rounded-t-2xl border-t shadow-lg",
              showPanel ? "flex" : "hidden")}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
              <div className="min-w-0"><h2 className="break-words font-semibold">{activeCategory ? "Kết quả lọc" : detailsData ? "Vị trí và hồ sơ" : room?.name ?? (floor === "all" ? "Danh sách không gian" : building.floors.find(f => f.floor === floor)?.name ?? "Không gian")}</h2>{!detailsData && room && shape && <p className="mt-1 text-xs text-muted-foreground">Tầng {shape.floor}</p>}</div>
              <Button disabled={Boolean(draft)} variant="ghost" size="icon" className="size-10" aria-label="Đóng bảng thông tin" onClick={closePanel}><X className="size-4" /></Button>
            </div>
            <div ref={panelScrollRef} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-3">
          {searchNotice && <div role="status" className="rounded-xl border bg-muted/50 p-3 text-sm leading-6">{searchNotice}<Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchNotice(null)}>Đóng thông báo</Button></div>}
          {activeCategory && !draft ? <SceneFilterResults building={building} category={activeCategory} floor={floor} room={selected}
            onClear={() => filterCategory(null)} onRecord={focusRoomRecord} onRoom={choose} /> : draft ? <PlacementEditor draft={draft} roomName={building.rooms.find(r=>r.key===draft.roomKey)?.name ?? ""} objects={objects}
            availablePoints={building.rooms.find(r=>r.key===draft.roomKey)?.availablePoints ?? []}
            directPoint={Boolean(building.rooms.find(r=>r.key===draft.roomKey)?.directPoint)}
            onChange={setDraft} onBusy={setPlacementBusy} onCancel={()=>setDraft(null)} onSaved={point=>start(()=>{
              setDraft(null);setSelectedPerson(null);
              navigate({...navigation,room:draft.roomKey,floor:BUILDING_ROOMS.find(r=>r.key===draft.roomKey)!.floor,point});
              router.refresh();
            })}/> : <>
          {detailsData && <Button variant="ghost" onClick={backOne}><ArrowLeft className="size-4"/>{navigation.asset || navigation.equipment ? "Trở lại vị trí" : "Tổng quan phòng"}</Button>}
          {!detailsData && building.canManage && room?.state === "unlinked" && isManageableSpace(shape) &&
            <RoomLinkDialog key={room.key} roomKey={room.key} roomName={room.name} />}
          {!detailsData && building.canManage && room?.locationId !== undefined && room.state !== "unlinked" &&
            <LocationEditDialog key={room.locationId} locationId={room.locationId} />}
          {building.canManage && room?.state === "active" && isManageableSpace(shape) && !modelUnavailable && <div className="flex flex-wrap gap-2">
            {!detailsData && <Button disabled={pending} variant="outline" className="min-h-10" onClick={()=>beginPlacement()}><Plus className="size-4"/>{room.directPoint ? (roomObjects.length ? "Chỉnh bố trí" : "Đặt model") : "Thêm vị trí"}</Button>}
            {selectedObject && <Button variant="outline" className="min-h-10" onClick={()=>beginPlacement(true)}>Chỉnh bố trí</Button>}
          </div>}
          {detailsData ? (
            <RoomPointPanel
              room={detailsData}
              selected={navigation.point}
              onSelect={key=>key===navigation.point && (navigation.asset || navigation.equipment) ? backOne() : choosePoint(key)}
              equipmentKind={navigation.equipment}
              onAsset={chooseAsset}
              personId={personId}
              assetId={selectedAsset?.point === navigation.point ? selectedAsset.id : null}
            />
          ) : room && shape ? (
            <RoomOverviewPanel room={room} placed={shape.placed}
              canViewEmployees={building.canViewEmployees} canViewAssets={building.canViewAssets}
              tab={roomTabs[room.key]} onTabChange={tab => setRoomTabs(old => ({ ...old, [room.key]: tab }))}
              onEnter={!detail && canEnterRoom(building, room.key) ? () => enterRoom(room.key) : undefined}
              onPerson={(point, id) => focusRoomRecord(point, id, "person")}
              onAsset={(point, id) => focusRoomRecord(point, id, "asset")} />
          ) : null}
          {!detailsData && detail && roomData && <RoomPointList room={roomData} selected={null} onSelect={choosePoint} />}
          {!detail && !detailsData && roomObjects.length>0 && <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-medium">Vị trí đã thêm · {roomObjects.length}</summary>
            <div className="mt-2 space-y-1">{roomObjects.map(o=><Button key={o.id} variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal text-left" onClick={()=>choosePoint(o.point.key)}><MapPin className="size-4 shrink-0"/>{o.point.name}</Button>)}</div>
          </details>}
          {!detail && (room ? <details key={`${floor}:${selected}:${modelUnavailable}`} open={modelUnavailable} className="border-t pt-3">
            <summary className="min-h-10 cursor-pointer rounded py-2 text-sm font-medium focus-visible:outline-ring">Đổi không gian</summary>
            <SpaceDirectory building={building} floor={floor} selected={selected} forceOpen={modelUnavailable} onSelect={choose} />
          </details> : <SpaceDirectory key={`${floor}:${modelUnavailable}`} building={building} floor={floor} selected={selected} forceOpen={modelUnavailable} onSelect={choose} />)}

          </>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
