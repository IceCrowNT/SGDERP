"use client";
import type { EquipmentKind } from "@/lib/office-3d/hcns-layout";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Line, Mesh, Path, Shape, type Material } from "three";
import {
  BUILDING_ROOMS,
  BUILDING_FLOORS,
  HCNS_BUILDING_KEY,
  HCNS_PLACEMENT,
  floorElevation,
  roomWallSegments,
  type BuildingRoom,
  type FloorSelection,
  type FloorNumber,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { RoomBackdrop } from "./RoomBackdrop";
import { RoomShell } from "../hcns/RoomFurniture";
import { Block, materials as m } from "../hcns/RoomFurniture";

import {
  architecturalFloorSurface,
  type ArchitecturalFloor,
  type ArchitecturalPoint,
} from "@/lib/office-3d/architectural-layout";

const palette = { stone: "#e2dbd0", mutedFloor: "#dedbd5" };
const NO_HOLES: ArchitecturalPoint[][] = [];
const ignoreDecorativeRaycast = () => {};
function ContextLayer({
  detail,
  children,
  duration = .65,
}: {
  detail: boolean;
  children: ReactNode;
  duration?: number;
}) {
  const ref = useRef<Group>(null);
  const opacity = useRef(detail ? 0 : 1);
  const [initialVisible] = useState(!detail);
  const originals = useRef(
    new WeakMap<
      Material,
      { opacity: number; transparent: boolean; depthWrite: boolean }
    >(),
  );
  useFrame(({ invalidate }, delta) => {
    const group = ref.current;
    if (!group) return;
    const target = detail ? 0 : 1;
    if (opacity.current === target && group.visible === Boolean(target)) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    opacity.current = reduce
      ? target
      : Math.max(
          0,
          Math.min(
            1,
            opacity.current +
              ((detail ? -1 : 1) * Math.min(delta, 1 / 30)) / duration,
          ),
        );
    group.visible = opacity.current > 0;
    group.traverse((node) => {
      if (!(node instanceof Mesh) && !(node instanceof Line)) return;
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        let original = originals.current.get(material);
        if (!original) {
          original = {
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          };
          originals.current.set(material, original);
        }
        const transparent = opacity.current < 1 || original.transparent;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = original.opacity * opacity.current;
        material.depthWrite = opacity.current === 1 && original.depthWrite;
      }
    });
    if (opacity.current !== target) invalidate();
  });
  return (
    <group ref={ref} visible={initialVisible}>
      {children}
    </group>
  );
}

// All views share stable world coordinates, including database-backed furniture.
export function FloorLayer({ number, floor, children, fade = true }: {
  number: FloorNumber;
  floor: FloorSelection;
  children: ReactNode;
  fade?: boolean;
}) {
  return <group userData={{ inactiveFloor: floor !== "all" && floor !== number }}
    position={[0, floorElevation(number), 0]}>
    {fade ? <ContextLayer detail={floor !== "all" && floor !== number} duration={.2}>{children}</ContextLayer> : children}
  </group>;
}
function Surface({
  outline, holes = NO_HOLES, y, color, invisible = false,
}: {
  outline: ArchitecturalPoint[];
  holes?: ArchitecturalPoint[][];
  y: number;
  color: string;
  invisible?: boolean;
}) {
  const shape = useMemo(() => {
    const result = new Shape();
    function trace(path: Path, points: ArchitecturalPoint[]) {
      points.forEach(([x, z], index) => {
        if (index === 0) path.moveTo(x, -z);
        else path.lineTo(x, -z);
      });
      path.closePath();
    }
    trace(result, outline);
    for (const polygon of holes) {
      const path = new Path();
      trace(path, polygon);
      result.holes.push(path);
    }
    return result;
  }, [outline, holes]);
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      {invisible ? (
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      ) : (
        <meshStandardMaterial color={color} roughness={1} />
      )}
    </mesh>
  );
}
function FloorSlab({ floor }: { floor: ArchitecturalFloor }) {
  return (
    <Surface outline={architecturalFloorSurface(floor)} y={0} color={m.floor} />
  );
}
function RoomEnvelope({ room, selected }: { room: BuildingRoom; selected: boolean }) {
  const enclosed = room.kind === "room" || room.kind === "utility";
  const outlined = enclosed || room.kind === "atrium" || (selected && room.kind !== "reception");
  const edges = useMemo(() => roomWallSegments(room), [room]);
  const edge = useMemo(() => new Float32Array(
    edges.flatMap(pair => pair.flatMap(([x, z]) => [x, enclosed ? 0.705 : 0.195, z])),
  ), [edges, enclosed]);
  return (
    <group>
      {room.kind !== "atrium" && (
        <Surface outline={room.outline} y={room.kind === "reception" ? 0.06 : 0.04}
          color={selected ? m.selected : room.kind === "utility" ? palette.mutedFloor :
            room.kind === "room" ? palette.stone : m.floor} />
      )}
      {room.key === "plan_t2_thong_tang" && (
        <Block at={[0, 0.375, room.depth / 2]} size={[room.width, 0.65, 0.08]}
          color={m.wall} shadow={false} />
      )}
      {outlined && edges.map(([[x, z], [nextX, nextZ]], index) => {
        const length = Math.hypot(nextX - x, nextZ - z);
        const height = enclosed ? 0.65 : 0.14;
        return (
          <group key={index} position={[(x + nextX) / 2, 0, (z + nextZ) / 2]}
            rotation={[0, -Math.atan2(nextZ - z, nextX - x), 0]}>
            <Block at={[0, height / 2 + 0.05, 0]} size={[length, height, 0.08]}
              color={selected ? m.accent : m.wall} shadow={false} />
          </group>
        );
      })}
      {outlined && (
        <lineSegments raycast={ignoreDecorativeRaycast}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edge, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={selected ? m.accent : m.slab} />
        </lineSegments>
      )}
    </group>
  );
}
export function BuildingModel({
  floor,
  selected,
  onSelect,
  detail,
  onEnter,
  onOverview,
  hovered,
  onHover,
}: {
  building: BuildingData;
  floor: FloorSelection;
  selected: string | null;
  onSelect: (key: string) => void;
  detail: boolean;
  point: string | null;
  onPoint: (key: string) => void;
  onFocusPoint: (key: string) => void;
  onEquipment: (key: string, kind: EquipmentKind, focus: boolean, assetId?: number) => void;
  activeEquipment?: EquipmentKind;
  activeAsset?: number;
  onEnter: (key: string) => void;
  hovered: string | null;
  onHover: (key: string | null) => void;
  person: number | null;
  onPerson: (key: string, id: number) => void;
  onOverview: () => void;
}) {
  return (
    <group onClick={event => {
      if (detail && event.button === 0 && event.delta < 5) {
        event.stopPropagation();
        onOverview();
      }
    }}>
      {BUILDING_FLOORS.map((f) => (
        <FloorLayer
          key={f.floor}
          number={f.floor} floor={floor} fade={false}
        >
          {/* Each material has one fade owner; nested fades would capture
              partially faded opacity and dim the model after returning. */}
          <ContextLayer detail={detail || (floor !== "all" && floor !== f.floor)} duration={detail ? .65 : .2}>
            <FloorSlab floor={f.floor} />
          </ContextLayer>
          {BUILDING_ROOMS.filter((r) => r.floor === f.floor && r.placed).map((room) => (
            <group
              key={room.key}
              position={[room.x, 0, room.z]}
              userData={{ objectKey: room.key }}
              onPointerOver={!detail && floor === f.floor ? event => { event.stopPropagation(); onHover(room.key); } : undefined}
              onPointerOut={!detail && floor === f.floor ? () => onHover(null) : undefined}
              onDoubleClick={
                detail || (floor !== "all" && floor !== f.floor)
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      if (event.delta < 5) onEnter(room.key);
                    }
              }
              onClick={
                detail || (floor !== "all" && floor !== f.floor)
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      if (event.delta < 5) onSelect(room.key);
                    }
              }
            >
              {room.key === HCNS_BUILDING_KEY ? (
                <ContextLayer detail={(detail && selected !== room.key) || (floor !== "all" && floor !== f.floor)} duration={.2}>
                  <Surface outline={room.outline} y={0.07}
                    color={!detail && (selected === room.key || hovered === room.key) ? m.selected : m.floor} />
                  <group
                    position={[0, 0.28, 0]}
                    rotation={[0, HCNS_PLACEMENT.rotation, 0]}
                    scale={HCNS_PLACEMENT.scale}
                  >
                    <RoomShell />
                  </group>
                </ContextLayer>
              ) : (
                <ContextLayer detail={(detail && selected !== room.key) || (floor !== "all" && floor !== f.floor)} duration={detail ? .65 : .2}>
                  <RoomEnvelope room={room} selected={!detail && (selected === room.key || hovered === room.key)} />
                  <RoomBackdrop roomKey={room.key} />
                </ContextLayer>
              )}
              {/* Invisible pick surface covers open spaces and the atrium without inventing a floor. */}
              {(!detail || selected === room.key) && <Surface outline={room.outline} y={room.kind === "reception" ? 0.1 : 0.08} color={m.floor} invisible />}
            </group>
          ))}
        </FloorLayer>
      ))}
    </group>
  );
}
