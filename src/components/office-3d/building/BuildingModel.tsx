"use client";
import { RoundedBox } from "@react-three/drei";
import { useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, type Material } from "three";
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

const palette = {
  grass: "#a8b4a0",
  foliage: "#6e8d6b",
  stem: "#9a8165",
  selection: "#d68a71",
  stone: "#e2dbd0",
  mutedFloor: "#dedbd5",
  railing: "#a49a8c",
};
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
      if (!(node instanceof Mesh)) return;
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
function FloorSlab({ atrium }: { atrium: boolean }) {
  const pieces = atrium
    ? [
        { x: 0, z: -11.25, w: 45, d: 11.5 },
        { x: 0, z: 11.75, w: 45, d: 10.5 },
        { x: -17, z: 0.5, w: 11, d: 12 },
        { x: 14, z: 0.5, w: 17, d: 12 },
      ]
    : [{ x: 0, z: 0, w: 45, d: 34 }];
  return (
    <group>
      {pieces.map((s, i) => (
        <group key={i}>
          <Block
            at={[s.x, -0.24, s.z]}
            size={[s.w, 0.46, s.d]}
            color={m.slab}
          />
          <Block
            at={[s.x, 0.005, s.z]}
            size={[s.w, 0.035, s.d]}
            color={m.floor}
            shadow={false}
          />
        </group>
      ))}
    </group>
  );
}
function Plant({
  x,
  z,
  tall = false,
}: {
  x: number;
  z: number;
  tall?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.4, 0.7, 10]} />
        <meshStandardMaterial color={m.paper} roughness={0.9} />
      </mesh>
      <Block
        at={[0, tall ? 1.3 : 0.8, 0]}
        size={[0.12, tall ? 2 : 1, 0.12]}
        color={palette.stem}
      />
      <mesh position={[0, tall ? 2.25 : 1.3, 0]} castShadow>
        <icosahedronGeometry args={[tall ? 1.3 : 0.8, 1]} />
        <meshStandardMaterial color={palette.foliage} roughness={1} />
      </mesh>
    </group>
  );
}
function RoomEnvelope({
  room,
  selected,
}: {
  room: BuildingRoom;
  selected: boolean;
}) {
  const { width: w, depth: d, kind } = room;
  const open = ["lobby", "garden", "stairs", "reception"].includes(kind);
  return (
    <group>
      {room.key !== "t2_atrium" && (
        <Block
          at={[0, 0.07, 0]}
          size={[w - 0.16, 0.09, d - 0.16]}
          color={
            selected
              ? m.selected
              : kind === "garden"
                ? palette.grass
                : kind === "utility"
                  ? palette.mutedFloor
                  : palette.stone
          }
          shadow={false}
        />
      )}
      {!open && (
        <>
          <Block
            at={[0, 1.25, -d / 2 + 0.12]}
            size={[w, 2.5, 0.24]}
            color={m.wall}
          />
          <Block
            at={[-w / 2 + 0.12, 0.58, 0]}
            size={[0.24, 1.16, d]}
            color={m.wall}
          />
          <Block
            at={[w / 2 - 0.12, 0.58, 0]}
            size={[0.24, 1.16, d]}
            color={m.wall}
          />
          <Block
            at={[0, 0.24, d / 2 - 0.12]}
            size={[w, 0.48, 0.24]}
            color={m.wall}
          />
          <Block
            at={[0, 2.53, -d / 2 + 0.12]}
            size={[w + 0.04, 0.08, 0.28]}
            color={m.woodEdge}
            shadow={false}
          />
          <Block
            at={[0, 0.22, -d / 2 + 0.28]}
            size={[w - 0.5, 0.15, 0.045]}
            color={m.woodEdge}
            shadow={false}
          />
        </>
      )}
      {kind === "stairs" &&
        Array.from({ length: 10 }, (_, i) => (
          <Block
            key={i}
            at={[0, (i + 1) * 0.14, -d / 2 + 0.65 + i * 0.65]}
            size={[w - 0.8, (i + 1) * 0.28, 0.65]}
            color={m.wall}
          />
        ))}
      {kind === "reception" && (
        <>
          <RoundedBox
            args={[w - 0.3, 1.2, d - 1]}
            position={[0, 0.65, 0]}
            radius={0.15}
            smoothness={2}
            castShadow
          >
            <meshStandardMaterial color={m.wood} roughness={0.8} />
          </RoundedBox>
          <Block
            at={[0, 1.28, 0]}
            size={[w - 0.15, 0.12, d - 0.8]}
            color={m.paper}
          />
        </>
      )}
      {kind === "garden" && (
        <>
          <Block
            at={[0, 0.13, 0]}
            size={[2, 0.08, d - 0.4]}
            color={m.floor}
            shadow={false}
          />
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <Plant key={`${x}-${z}`} x={x * 4.8} z={z * 3.4} tall />
            )),
          )}
        </>
      )}
      {room.key === "t2_atrium" && (
        <>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                at={[(s * w) / 2, 0.45, 0]}
                size={[0.12, 0.9, d]}
                color={m.wall}
              />
              <Block
                at={[(s * w) / 2, 0.93, 0]}
                size={[0.18, 0.06, d]}
                color={palette.railing}
              />
              <Block
                at={[0, 0.45, (s * d) / 2]}
                size={[w, 0.9, 0.12]}
                color={m.wall}
              />
              <Block
                at={[0, 0.93, (s * d) / 2]}
                size={[w, 0.06, 0.18]}
                color={palette.railing}
              />
            </group>
          ))}
        </>
      )}
      {selected && (
        <group position={[0, 0.13, 0]}>
          {[-1, 1].map((s) => (
            <group key={s}>
              <Block
                at={[s * (w / 2 - 0.25), 0, 0]}
                size={[0.13, 0.04, d - 0.5]}
                color={m.accent}
                shadow={false}
              />
              <Block
                at={[0, 0, s * (d / 2 - 0.25)]}
                size={[w - 0.5, 0.04, 0.13]}
                color={m.accent}
                shadow={false}
              />
            </group>
          ))}
        </group>
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
            <FloorSlab atrium={f.floor === 2} />
          </ContextLayer>
          {BUILDING_ROOMS.filter((r) => r.floor === f.floor).map((room) => (
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
                  <Block
                    at={[0, 0.07, 0]}
                    size={[room.width, 0.08, room.depth]}
                    color={
                      !detail && selected === room.key ? m.selected : m.floor
                    }
                    shadow={false}
                  />
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
              <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[room.width, room.depth]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
