"use client";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { Vector3, type Camera } from "three";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BUILDING_ROOMS,
  BUILDING_FLOORS,
  floorElevation,
  type FloorSelection,
  type FloorNumber,
  HCNS_PLACEMENT,
  HCNS_BUILDING_KEY,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { BuildingModel } from "./BuildingModel";
import { hcnsWorldPoint } from "@/lib/office-3d/building-navigation";
import { HCNS_LAYOUT, HCNS_ROOM_BOUNDS, personRoomPosition } from "@/lib/office-3d/hcns-layout";
import { materials } from "../hcns/RoomFurniture";
import { ARCHITECTURAL_BOUNDS } from "@/lib/office-3d/architectural-layout";

export type BuildingCamera = {
  view: "overview" | "top" | "focus";
  key?: string;
  sequence: number;
  zoom: number;
};
type Props = {
  building: BuildingData;
  floor: FloorSelection;
  selected: string | null;
  command: BuildingCamera;
  onSelect: (key: string) => void;
  onFloor: (floor: FloorNumber) => void;
  detail: boolean;
  point: string | null;
  onPoint: (key: string) => void;
  onEnter: (key: string) => void;
  person: number | null;
  onPerson: (key: string, id: number) => void;
};
function Fallback() {
  return (
    <div
      role="status"
      className="flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground"
    >
      Không thể hiển thị 3D trên trình duyệt này. Bạn vẫn có thể chọn tầng,
      phòng và đọc thông tin trong danh sách.
    </div>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
// Demand rendering can wake after minutes of idle time. Never integrate that
// entire interval into a new camera movement. Drei supports a custom controls impl.
class DemandCameraControls extends CameraControlsImpl {
  override update(delta: number) {
    return super.update(Math.min(delta, 1 / 30));
  }
}
function roomFitZoom(camera: Camera, size: { width: number; height: number }) {
  const inverse = camera.quaternion.clone().invert();
  const corners = [HCNS_ROOM_BOUNDS.minX, HCNS_ROOM_BOUNDS.maxX].flatMap((x) =>
    [HCNS_ROOM_BOUNDS.minZ, HCNS_ROOM_BOUNDS.maxZ].flatMap((z) =>
      [0, 2.4].map((y) =>
        new Vector3(...hcnsWorldPoint(x, y, z)).applyQuaternion(inverse),
      ),
    ),
  );
  const width =
    Math.max(...corners.map((v) => v.x)) - Math.min(...corners.map((v) => v.x));
  const height =
    Math.max(...corners.map((v) => v.y)) - Math.min(...corners.map((v) => v.y));
  return Math.min(size.width / (width + 2), size.height / (height + 2));
}
function floorFitZoom(
  camera: Camera, size: { width: number; height: number },
  position: [number, number, number], target: [number, number, number], all: boolean,
) {
  const view = camera.clone();
  view.position.set(...position);
  view.lookAt(...target);
  const inverse = view.quaternion.clone().invert();
  const { width, depth } = ARCHITECTURAL_BOUNDS;
  const corners = [-width / 2 - 2, width / 2 + 2].flatMap((x) =>
    [-depth / 2, depth / 2].flatMap((z) =>
      [0, all ? floorElevation(3, "all") + 2.4 : 2.4].map((y) =>
        new Vector3(x, y, z).applyQuaternion(inverse),
      ),
    ),
  );
  return Math.min(
    size.width / (Math.max(...corners.map((p) => p.x)) - Math.min(...corners.map((p) => p.x)) + 4),
    size.height / (Math.max(...corners.map((p) => p.y)) - Math.min(...corners.map((p) => p.y)) + 4),
  );
}
function CameraRig({
  command,
  floor,
  detail,
}: Pick<Props, "command" | "floor" | "detail">) {
  const ref = useRef<CameraControls>(null);
  const { size, gl, camera } = useThree();
  const scope = detail ? "room:hcns" : `floor:${floor}`;
  const previous = useRef<{
    scope: string;
    command: BuildingCamera;
    width: number;
    height: number;
  } | null>(null);
  const saved = useRef(
    new Map<
      string,
      { json: string; width: number; height: number; command: BuildingCamera }
    >(),
  );
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const old = previous.current;
    const animate =
      Boolean(old) &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (old && old.scope !== scope) {
      // Snapshot the actual view, including a mouse orbit still decelerating.
      c.stop();
      saved.current.set(old.scope, {
        json: c.toJSON(),
        width: old.width,
        height: old.height,
        command: old.command,
      });
    }
    previous.current = {
      scope,
      command,
      width: size.width,
      height: size.height,
    };
    const cached = saved.current.get(scope);
    if (!detail && old && old.scope !== scope && cached?.command === command) {
      const state = JSON.parse(cached.json);
      state.zoom *= Math.min(
        size.width / cached.width,
        size.height / cached.height,
      );
      c.fromJSON(JSON.stringify(state), animate);
      return;
    }
    if (old?.scope === scope && old.command === command) {
      void c.zoomTo(
        camera.zoom *
          (detail
            ? roomFitZoom(camera, size) / roomFitZoom(camera, old)
            : Math.min(size.width / old.width, size.height / old.height)),
        false,
      );
      return;
    }
    if (
      old?.scope === scope &&
      old.command.sequence === command.sequence &&
      old.command.zoom !== command.zoom
    ) {
      void c.zoomTo((camera.zoom * command.zoom) / old.command.zoom, animate);
      return;
    }
    if (detail && old && old.scope !== scope) {
      // Translate and zoom from the current pose. Do not rotate to a second
      // prebuilt room camera when entering the same embedded geometry.
      const target = new Vector3(...hcnsWorldPoint(0, 0.8, 0.3));
      const offset = c
        .getPosition(new Vector3(), false)
        .sub(c.getTarget(new Vector3(), false));
      const position = target.clone().add(offset);
      void c.setLookAt(...position.toArray(), ...target.toArray(), animate);
      void c.zoomTo(roomFitZoom(camera, size), animate);
      return;
    }
    if (detail) {
      const slot = HCNS_LAYOUT.find((p) => p.key === command.key);
      let position: [number, number, number] = [15, 18, 20];
      let target: [number, number, number] = [0, 0, 0];
      let zoom = Math.min(size.width / (HCNS_ROOM_BOUNDS.width * 1.4), size.height / (HCNS_ROOM_BOUNDS.depth * 1.2));
      if (command.view === "top") {
        position = [0, 24, 0.01];
        zoom = Math.min(size.width / (HCNS_ROOM_BOUNDS.width + 2), size.height / (HCNS_ROOM_BOUNDS.depth + 2));
      } else if (command.view === "focus" && slot) {
        position = [slot.x + 8, 12, slot.z + 10];
        target = [slot.x, 0.7, slot.z];
        zoom = Math.min(size.width / 5, size.height / 6);
      }
      void c.setLookAt(
        ...hcnsWorldPoint(...position),
        ...hcnsWorldPoint(...target),
        animate,
      );
      void c.zoomTo((zoom / HCNS_PLACEMENT.scale) * command.zoom, animate);
      return;
    }
    const room = BUILDING_ROOMS.find((r) => r.key === command.key);
    let zoom: number;
    if (command.view === "focus" && room?.placed && floor !== "all") {
      void c.setLookAt(
        room.x + 22,
        25,
        room.z + 28,
        room.x,
        0.3,
        room.z,
        animate,
      );
      zoom = Math.min(
        size.width / (Math.max(room.width, room.depth) * 1.55),
        size.height / (Math.max(room.width, room.depth) * 1.6),
      );
    } else if (command.view === "top" && floor !== "all") {
      void c.setLookAt(0, 65, 0.01, 0, 0, 0, animate);
      zoom = floorFitZoom(camera, size, [0, 65, 0.01], [0, 0, 0], false);
    } else {
      const targetY = floor === "all" ? floorElevation(2, "all") : 0;
      const position: [number, number, number] = [60, targetY + 46, 65];
      const target: [number, number, number] = [0, targetY, 0];
      void c.setLookAt(...position, ...target, animate);
      zoom = floorFitZoom(camera, size, position, target, floor === "all");
    }
    void c.zoomTo(Math.max(3, zoom * command.zoom), animate);
  }, [scope, command, detail, floor, size, camera]);
  useEffect(() => {
    gl.domElement.setAttribute("aria-label", "Mô hình 3D tòa nhà Sao Đỏ");
    gl.domElement.setAttribute("data-building-ready", "true");
    return () => {
      gl.domElement.removeAttribute("data-building-ready");
    };
  }, [gl]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      impl={DemandCameraControls}
      smoothTime={0.36}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.12}
      minZoom={3}
      maxZoom={220}
    />
  );
}
type LabelAnchor = {
  key: string;
  at: [number, number, number];
  point?: string;
  priority?: number;
};
function ProjectedLabels({
  elements,
  anchors,
  ready,
}: {
  elements: RefObject<Map<string, HTMLElement>>;
  anchors: LabelAnchor[];
  ready: boolean;
}) {
  const v = useRef(new Vector3());
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [ready, anchors, invalidate]);
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    for (const element of elements.current.values())
      element.style.visibility = "hidden";
    for (const anchor of [...anchors].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    )) {
      const element = elements.current.get(anchor.key);
      if (!element) continue;
      const p = v.current.set(...anchor.at).project(camera);
      if (p.z < -1 || p.z > 1 || Math.abs(p.x) >= 1 || Math.abs(p.y) >= 1)
        continue;
      if (anchor.point && camera.zoom < 24) continue;
      const w = element.offsetWidth,
        h = element.offsetHeight;
      const x = Math.max(
        w / 2 + 4,
        Math.min(size.width - w / 2 - 4, ((p.x + 1) * size.width) / 2),
      );
      const y = ((1 - p.y) * size.height) / 2 - (anchor.point ? 24 : 0);
      if (y < h / 2 || y > size.height - h / 2) continue;
      // Name labels are secondary to the actual mesh. Keep them from covering
      // one another; the full list remains available beside the canvas.
      if (
        boxes.some(
          (b) =>
            Math.abs(b.x - x) < (b.w + w) / 2 + 6 &&
            Math.abs(b.y - y) < (b.h + h) / 2 + 6,
        )
      )
        continue;
      element.style.visibility = "visible";
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      boxes.push({ x, y, w, h });
    }
  });
  return null;
}
export default function BuildingCanvas(props: Props) {
  const [ready, setReady] = useState(false),
    [lost, setLost] = useState(false);
  const elements = useRef(new Map<string, HTMLElement>());
  const [hovered, setHovered] = useState<string | null>(null);
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pickTimer.current) clearTimeout(pickTimer.current);
    },
    [],
  );
  function pickRoom(key: string) {
    if (pickTimer.current) clearTimeout(pickTimer.current);
    // A first click must not move the all-floor target before the second click.
    if (props.floor === "all")
      pickTimer.current = setTimeout(() => props.onSelect(key), 300);
    else props.onSelect(key);
  }
  function enterRoom(key: string) {
    if (pickTimer.current) clearTimeout(pickTimer.current);
    if (props.floor === "all") props.onSelect(key);
    else if (key === HCNS_BUILDING_KEY && props.building.hcns)
      props.onEnter(key);
  }
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const lostHandler = useRef((e: Event) => {
    e.preventDefault();
    setLost(true);
  });
  useEffect(() => {
    const handler = lostHandler.current;
    return () =>
      canvas.current?.removeEventListener("webglcontextlost", handler);
  }, []);
  const people = useMemo(
    () =>
      props.building.hcns?.canViewEmployees
        ? props.building.hcns.points
            .filter((p) => p.state === "active")
            .flatMap((p) => {
              const slot = HCNS_LAYOUT.find((s) => s.key === p.key)!;
              const occupants = p.occupants ?? [];
              const result = occupants.slice(0, 3).map((person, index) => ({
                key: `person:${p.key}:${person.id}`,
                point: p.key,
                id: person.id,
                name: person.name,
                at: hcnsWorldPoint(
                  ...personRoomPosition(slot, index, occupants.length),
                ),
              }));
              if (occupants.length > 3)
                result.push({
                  key: `group:${p.key}`,
                  point: p.key,
                  id: 0,
                  name: `+${occupants.length - 3} người`,
                  at: hcnsWorldPoint(slot.x, 1.3, slot.z),
                });
              return result;
            })
        : [],
    [props.building.hcns],
  );
  const anchors = useMemo<LabelAnchor[]>(() => {
    if (props.detail)
      return people.map((p) => ({
        ...p,
        priority:
          p.id === props.person
            ? 3
            : p.point === hovered
              ? 2
              : p.point === props.point
                ? 1
                : 0,
      }));
    if (props.floor === "all")
      return BUILDING_FLOORS.map((f) => ({
        key: `floor-${f.floor}`,
        at: [-ARCHITECTURAL_BOUNDS.width / 2 - 1, floorElevation(f.floor, props.floor) + 0.6, 9],
      }));
    return BUILDING_ROOMS.filter(
      (r) =>
        r.placed && r.floor === props.floor && (r.showLabel || r.key === props.selected) &&
        (props.command.view !== "focus" ||
          !props.selected ||
          r.key === props.selected),
    ).map((r) => ({
      key: r.key,
      at: [r.label[0], 0.7, r.label[1]],
      priority: r.key === props.selected ? 3 : r.key === HCNS_BUILDING_KEY ? 1 : 0,
    }));
  }, [
    props.detail,
    props.floor,
    props.command.view,
    props.selected,
    props.point,
    props.person,
    people,
    hovered,
  ]);
  const register = (key: string, element: HTMLElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };
  if (lost) return <Fallback />;
  return (
    <SceneBoundary>
      <div
        className={cn(
          "relative h-full w-full",
          props.detail && hovered && "cursor-pointer",
        )}
      >
        <Canvas
          orthographic
          camera={{ position: [60, 56, 65], zoom: 9, near: 0.1, far: 300 }}
          frameloop="demand"
          dpr={[1, 1.5]}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: "default" }}
          fallback={<Fallback />}
          onCreated={({ gl }) => {
            canvas.current = gl.domElement;
            gl.domElement.addEventListener(
              "webglcontextlost",
              lostHandler.current,
            );
            setReady(true);
          }}
        >
          <ambientLight intensity={1.3} />
          <hemisphereLight args={[materials.white, materials.floor, 1.35]} />
          <directionalLight
            position={[-30, 65, 25]}
            intensity={2.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-38}
            shadow-camera-right={38}
            shadow-camera-top={42}
            shadow-camera-bottom={-38}
            shadow-camera-near={0.1}
            shadow-camera-far={160}
            shadow-normalBias={0.045}
            shadow-bias={-0.0001}
          />
          <BuildingModel
            {...props}
            onSelect={pickRoom}
            onEnter={enterRoom}
            hovered={hovered}
            onHover={setHovered}
          />
          <CameraRig
            floor={props.floor}
            command={props.command}
            detail={props.detail}
          />
          <ProjectedLabels
            elements={elements}
            anchors={anchors}
            ready={ready}
          />
        </Canvas>
        {ready && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {props.detail &&
              people.map((p) => (
                <Button
                  key={p.key}
                  ref={(el) => register(p.key, el)}
                  variant={
                    props.person === p.id && props.point === p.point
                      ? "default"
                      : "outline"
                  }
                  className="pointer-events-auto invisible absolute h-auto min-h-10 max-w-40 -translate-x-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs shadow-sm"
                  data-person-marker={p.id ? "person" : "group"}
                  aria-label={
                    p.id
                      ? `Xem nhân sự ${p.name}`
                      : `Xem tất cả nhân sự tại vị trí này`
                  }
                  onPointerEnter={() => setHovered(p.point)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(p.point)}
                  onBlur={() => setHovered(null)}
                  onClick={() =>
                    p.id
                      ? props.onPerson(p.point, p.id)
                      : props.onPoint(p.point)
                  }
                >
                  <span className="truncate">{p.name}</span>
                </Button>
              ))}
            {BUILDING_FLOORS.map((f) => (
              <Button
                key={f.floor}
                ref={(el) => register(`floor-${f.floor}`, el)}
                variant="outline"
                onClick={() => props.onFloor(f.floor)}
                aria-label={`Xem mô hình tầng ${f.floor}`}
                className="pointer-events-auto invisible absolute min-h-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card/95 shadow-sm"
              >
                {f.name}
              </Button>
            ))}
            {props.building.rooms.filter((r) => BUILDING_ROOMS.find((s) => s.key === r.key)?.placed).map((r) => (
              <Button
                key={r.key}
                ref={(el) => register(r.key, el)}
                variant="ghost"
                title={r.name}
                aria-label={`Trên mô hình: ${r.name}`}
                aria-pressed={r.key === props.selected}
                onClick={() => pickRoom(r.key)}
                onDoubleClick={() => enterRoom(r.key)}
                className={cn(
                  "pointer-events-auto invisible absolute h-auto min-h-10 max-w-40 -translate-x-1/2 -translate-y-1/2 whitespace-normal rounded-xl border px-2 py-1.5 text-xs shrink-0 shadow-sm max-sm:size-10 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none max-sm:hover:bg-transparent",
                  r.key === props.selected
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "border-border bg-card/95 text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-[10px] shadow-sm sm:hidden",
                    r.key === props.selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {BUILDING_ROOMS.findIndex((s) => s.key === r.key) + 1}
                </span>
                <span className="hidden sm:block">{r.name}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </SceneBoundary>
  );
}
