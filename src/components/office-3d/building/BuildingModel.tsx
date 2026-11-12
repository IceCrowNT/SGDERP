"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Line, Mesh, Path, Shape, type Material } from "three";
import {
  BUILDING_ROOMS,
  BUILDING_FLOORS,
  HCNS_BUILDING_KEY,
  HCNS_PLACEMENT,
  floorElevation,
  type BuildingRoom,
  type FloorSelection,
} from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { HcnsRoomModel } from "../hcns/HcnsRoomModel";
import { Block, materials as m } from "../hcns/RoomFurniture";

import {
  architecturalFloorOutline,
  ARCHITECTURAL_ATRIUM,
  type ArchitecturalFloor,
  type ArchitecturalPoint,
} from "@/lib/office-3d/architectural-layout";

const palette = { stone: "#e2dbd0", mutedFloor: "#dedbd5" };
const NO_HOLES: ArchitecturalPoint[][] = [];
function ContextLayer({
  detail,
  children,
}: {
  detail: boolean;
  children: ReactNode;
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
              ((detail ? -1 : 1) * Math.min(delta, 1 / 30)) / 0.65,
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
const ATRIUM_HOLE = [ARCHITECTURAL_ATRIUM];
function FloorSlab({ floor }: { floor: ArchitecturalFloor }) {
  return (
    <Surface outline={architecturalFloorOutline(floor)}
      holes={floor === 2 ? ATRIUM_HOLE : NO_HOLES} y={0} color={m.floor} />
  );
}
function RoomEnvelope({ room, selected }: { room: BuildingRoom; selected: boolean }) {
  const enclosed = room.kind === "room" || room.kind === "utility";
  const outlined = enclosed || room.kind === "atrium" || selected;
  const edge = useMemo(() => new Float32Array(
    room.outline.flatMap(([x, z]) => [x, enclosed ? 0.705 : 0.195, z]),
  ), [room.outline, enclosed]);
  return (
    <group>
      {room.kind !== "atrium" && (
        <Surface outline={room.outline} y={0.04}
          color={selected ? m.selected : room.kind === "utility" ? palette.mutedFloor :
            room.kind === "room" ? palette.stone : m.floor} />
      )}
      {outlined && room.outline.map(([x, z], index) => {
        const [nextX, nextZ] = room.outline[(index + 1) % room.outline.length];
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
        <lineLoop>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edge, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={selected ? m.accent : m.slab} />
        </lineLoop>
      )}
    </group>
  );
}
export function BuildingModel({
  building,
  floor,
  selected,
  onSelect,
  detail,
  point,
  onPoint,
  onEnter,
  hovered,
  onHover,
  person,
  onPerson,
}: {
  building: BuildingData;
  floor: FloorSelection;
  selected: string | null;
  onSelect: (key: string) => void;
  detail: boolean;
  point: string | null;
  onPoint: (key: string) => void;
  onEnter: (key: string) => void;
  hovered: string | null;
  onHover: (key: string | null) => void;
  person: number | null;
  onPerson: (key: string, id: number) => void;
}) {
  return (
    <group>
      {BUILDING_FLOORS.map((f) => (
        <group
          key={f.floor}
          visible={floor === "all" || floor === f.floor}
          position={[0, floorElevation(f.floor, floor), 0]}
        >
          <ContextLayer detail={detail}>
            <FloorSlab floor={f.floor} />
          </ContextLayer>
          {BUILDING_ROOMS.filter((r) => r.floor === f.floor && r.placed).map((room) => (
            <group
              key={room.key}
              position={[room.x, 0, room.z]}
              userData={{ objectKey: room.key }}
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
              {room.key === HCNS_BUILDING_KEY && building.hcns ? (
                <>
                  <Surface outline={room.outline} y={0.07}
                    color={!detail && selected === room.key ? m.selected : m.floor} />
                  <group
                    position={[0, 0.28, 0]}
                    rotation={[0, HCNS_PLACEMENT.rotation, 0]}
                    scale={HCNS_PLACEMENT.scale}
                  >
                    <HcnsRoomModel
                      points={building.hcns.points}
                      selected={detail ? point : null}
                      onSelect={detail ? onPoint : undefined}
                      hovered={hovered}
                      onHover={detail ? onHover : undefined}
                      person={person}
                      onPerson={detail ? onPerson : undefined}
                      canViewEmployees={building.hcns.canViewEmployees}
                    />
                  </group>
                </>
              ) : (
                <ContextLayer detail={detail}>
                  <RoomEnvelope room={room} selected={selected === room.key} />
                </ContextLayer>
              )}
              {/* Invisible pick surface covers open spaces and the atrium without inventing a floor. */}
              <Surface outline={room.outline} y={0.08} color={m.floor} invisible />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
