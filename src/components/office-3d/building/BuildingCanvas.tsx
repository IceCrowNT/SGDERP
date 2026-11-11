"use client";
import {
  Component,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { Vector3 } from "three";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BUILDING_ROOMS,
  BUILDING_FLOORS,
  floorElevation,
  type FloorSelection,
  type FloorNumber,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { BuildingModel } from "./BuildingModel";
import { materials } from "../hcns/RoomFurniture";

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
function CameraRig({ command, floor }: Pick<Props, "command" | "floor">) {
  const ref = useRef<CameraControls>(null);
  const { size, gl } = useThree();
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const room = BUILDING_ROOMS.find((r) => r.key === command.key);
    let zoom = Math.min(
      size.width / 68,
      size.height / (floor === "all" ? 66 : 49),
    );
    if (command.view === "focus" && room && floor !== "all") {
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
      zoom = Math.min(size.width / 49, size.height / 38);
    } else {
      const targetY = floor === "all" ? 10 : 0;
      void c.setLookAt(60, targetY + 46, 65, 0, targetY, 0, animate);
    }
    void c.zoomTo(Math.max(3, zoom * command.zoom), animate);
  }, [command, floor, size.width, size.height]);
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
      smoothTime={0.3}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.12}
      minZoom={3}
      maxZoom={100}
    />
  );
}
const labelKeys = [
  ...BUILDING_FLOORS.map((floor) => `floor-${floor.floor}`),
  ...BUILDING_ROOMS.map((room) => room.key),
];
function ProjectedLabels({
  elements,
  floor,
  show,
  ready,
}: {
  elements: RefObject<Map<string, HTMLElement>>;
  floor: FloorSelection;
  show: string[];
  ready: boolean;
}) {
  const v = useRef(new Vector3());
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [ready, show, floor, invalidate]);
  useFrame(({ camera, size }) => {
    for (const key of labelKeys) {
      const element = elements.current.get(key);
      if (!element) continue;
      const room = BUILDING_ROOMS.find((r) => r.key === key);
      const f = BUILDING_FLOORS.find((r) => `floor-${r.floor}` === key);
      const p = room
        ? v.current
            .set(
              room.x,
              0.45,
              room.key === "t2_hcns_pc"
                ? room.z + room.depth / 2 + 0.6
                : room.z,
            )
            .project(camera)
        : f
          ? v.current
              .set(-22, floorElevation(f.floor, floor) + 0.6, 17)
              .project(camera)
          : null;
      const visible =
        p &&
        show.includes(key) &&
        p.z >= -1 &&
        p.z <= 1 &&
        Math.abs(p.x) < 1 &&
        Math.abs(p.y) < 1;
      element.style.visibility = visible ? "visible" : "hidden";
      if (p) {
        element.style.left = `${((p.x + 1) * size.width) / 2}px`;
        element.style.top = `${((1 - p.y) * size.height) / 2}px`;
      }
    }
  });
  return null;
}
export default function BuildingCanvas(props: Props) {
  const [ready, setReady] = useState(false),
    [lost, setLost] = useState(false);
  const elements = useRef(new Map<string, HTMLElement>());
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
  const shown =
    props.floor === "all"
      ? BUILDING_FLOORS.map((f) => `floor-${f.floor}`)
      : props.command.view === "focus" && props.selected
        ? [props.selected]
        : BUILDING_ROOMS.filter((r) => r.floor === props.floor).map(
            (r) => r.key,
          );
  const register = (key: string, element: HTMLElement | null) => {
    if (element) elements.current.set(key, element);
    else elements.current.delete(key);
  };
  if (lost) return <Fallback />;
  return (
    <SceneBoundary>
      <div className="relative h-full w-full">
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
          <BuildingModel {...props} />
          <CameraRig floor={props.floor} command={props.command} />
          <ProjectedLabels
            elements={elements}
            floor={props.floor}
            show={shown}
            ready={ready}
          />
        </Canvas>
        {ready && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
            {props.building.rooms.map((r) => (
              <Button
                key={r.key}
                ref={(el) => register(r.key, el)}
                variant="ghost"
                title={r.name}
                aria-label={`Trên mô hình: ${r.name}`}
                aria-pressed={r.key === props.selected}
                onClick={() => props.onSelect(r.key)}
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
