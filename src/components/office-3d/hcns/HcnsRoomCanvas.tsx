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
import { HCNS_LAYOUT, type RoomPoint } from "@/lib/office-3d/hcns-layout";
import { cn } from "@/lib/utils";
import { materials } from "./RoomFurniture";
import { HcnsRoomModel } from "./HcnsRoomModel";

export type CameraCommand = {
  view: "overview" | "top" | "focus";
  key?: string;
  sequence: number;
};
function Fallback() {
  return (
    <div
      role="status"
      className="flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground"
    >
      Không thể hiển thị 3D trên trình duyệt này. Bạn vẫn có thể chọn và đọc đủ
      10 vị trí trong danh sách.
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
function CameraRig({ command }: { command: CameraCommand }) {
  const ref = useRef<CameraControls>(null);
  const { size, gl } = useThree();
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    const animated = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const zoom = Math.max(8, Math.min(size.width / 18.5, size.height / 17));
    const slot = HCNS_LAYOUT.find((s) => s.key === command.key);
    if (command.view === "top") {
      void controls.setLookAt(0, 24, 0.01, 0, 0, 0, animated);
      void controls.zoomTo(
        Math.min(size.width / 11.5, size.height / 16.5),
        animated,
      );
    } else if (command.view === "focus" && slot) {
      void controls.setLookAt(
        slot.x + 8,
        12,
        slot.z + 10,
        slot.x,
        0.7,
        slot.z,
        animated,
      );
      void controls.zoomTo(Math.min(size.width / 5, size.height / 6), animated);
    } else {
      void controls.setLookAt(15, 18, 20, 0, 0, 0, animated);
      void controls.zoomTo(zoom, animated);
    }
  }, [command, size.width, size.height]);
  useEffect(() => {
    gl.domElement.setAttribute("aria-label", "Mô hình 3D phòng HCNS");
    gl.domElement.setAttribute("data-room-ready", "true");
    return () => {
      gl.domElement.removeAttribute("data-room-ready");
    };
  }, [gl]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.3}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.1}
      minZoom={10}
      maxZoom={160}
    />
  );
}
function Scene({
  points,
  selected,
  onSelect,
  command,
}: {
  points: RoomPoint[];
  selected: string | null;
  onSelect: (key: string) => void;
  command: CameraCommand;
}) {
  return (
    <>
      <ambientLight intensity={1.25} />
      <hemisphereLight args={[materials.white, materials.floor, 1.4]} />
      <directionalLight
        position={[-6, 15, 8]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={0.1}
        shadow-camera-far={45}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
      <HcnsRoomModel points={points} selected={selected} onSelect={onSelect} />
      <CameraRig command={command} />
    </>
  );
}
const anchors = [
  ...HCNS_LAYOUT.map((slot) => ({
    key: slot.key,
    x: slot.x,
    y: 1.4,
    z: slot.z,
  })),
  { key: "storage", x: 3.3, y: 0.3, z: -1.05 },
  { key: "entrance", x: 4.8, y: 0.3, z: -4.05 },
];
type AnchorRefs = RefObject<Map<string, HTMLElement>>;

// Keep accessible controls in the application's DOM root. Only their projection
// follows the camera; no extra React roots or continuous animation are needed.
function ProjectedLabels({ elements }: { elements: AnchorRefs }) {
  const projected = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    for (const anchor of anchors) {
      const element = elements.current.get(anchor.key);
      if (!element) continue;
      const p = projected.current
        .set(anchor.x, anchor.y, anchor.z)
        .project(camera);
      const visible =
        p.z >= -1 && p.z <= 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
      element.style.visibility = visible ? "visible" : "hidden";
      element.style.left = `${((p.x + 1) * size.width) / 2}px`;
      element.style.top = `${((1 - p.y) * size.height) / 2}px`;
    }
  });
  return null;
}
export default function HcnsRoomCanvas(props: {
  points: RoomPoint[];
  selected: string | null;
  onSelect: (key: string) => void;
  command: CameraCommand;
}) {
  const [lostContext, setLostContext] = useState(false);
  const [ready, setReady] = useState(false);
  const anchorsRef = useRef(new Map<string, HTMLElement>());
  const registerAnchor = (key: string, element: HTMLElement | null) => {
    if (element) anchorsRef.current.set(key, element);
    else anchorsRef.current.delete(key);
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lossHandler = useRef((event: Event) => {
    event.preventDefault();
    setLostContext(true);
  });
  useEffect(() => {
    const handler = lossHandler.current;
    return () =>
      canvasRef.current?.removeEventListener("webglcontextlost", handler);
  }, []);
  if (lostContext) return <Fallback />;
  return (
    <SceneBoundary>
      <div className="relative h-full w-full">
        <Canvas
          orthographic
          camera={{ position: [15, 18, 20], zoom: 30, near: 0.1, far: 100 }}
          frameloop="demand"
          dpr={[1, 1.5]}
          shadows
          gl={{ antialias: true, alpha: true, powerPreference: "default" }}
          fallback={<Fallback />}
          onCreated={({ gl }) => {
            canvasRef.current = gl.domElement;
            gl.domElement.addEventListener(
              "webglcontextlost",
              lossHandler.current,
            );
            setReady(true);
          }}
        >
          <Scene {...props} />
          <ProjectedLabels elements={anchorsRef} />
        </Canvas>
        {ready && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {props.points.map((point) => {
              const chosen = props.selected === point.key;
              return (
                <Button
                  key={point.key}
                  ref={(element) => registerAnchor(point.key, element)}
                  size="icon"
                  variant="ghost"
                  aria-label={`Trên mô hình: ${point.name}`}
                  aria-pressed={chosen}
                  title={point.name}
                  onClick={() => props.onSelect(point.key)}
                  className="pointer-events-auto invisible absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 hover:bg-transparent focus-visible:visible"
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-xs font-bold shadow-md",
                      chosen
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground",
                      point.state !== "active" && "border-dashed opacity-65",
                    )}
                  >
                    {String(point.number).padStart(2, "0")}
                  </span>
                </Button>
              );
            })}
            <span
              ref={(element) => registerAnchor("storage", element)}
              className="invisible absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-card/95 px-2 py-1 text-xs font-semibold text-muted-foreground shadow-sm"
            >
              Kho
            </span>
            <span
              ref={(element) => registerAnchor("entrance", element)}
              className="invisible absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-card/95 px-2 py-1 text-xs text-muted-foreground shadow-sm"
            >
              Cửa vào
            </span>
          </div>
        )}
      </div>
    </SceneBoundary>
  );
}
