"use client";
import { RoundedBox } from "@react-three/drei";
import { Shape } from "three";
import {
  HCNS_ROOM_OUTLINE,
  HCNS_PARTITION_Z,
  HCNS_CONNECTING_DOOR,
  type EquipmentKind,
} from "@/lib/office-3d/hcns-layout";

// Physical materials are independent of the HTML application theme.
export const materials = {
  floor: "#e6e1d8",
  grout: "#d7d0c5",
  slab: "#c6beb0",
  wall: "#f3f0e8",
  wood: "#c49a70",
  woodEdge: "#ae8059",
  metal: "#444c50",
  screen: "#273c50",
  screenLight: "#789cae",
  device: "#363e45",
  paper: "#faf9f6",
  accent: "#c44c37",
  selected: "#f0b9a5",
  muted: "#b8bdb9",
  white: "#ffffff",
};
type Vec3 = [number, number, number];
export function Block({
  at,
  size,
  color,
  rotation,
  shadow = true,
}: {
  at: Vec3;
  size: Vec3;
  color: string;
  rotation?: Vec3;
  shadow?: boolean;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Cylinder({
  at,
  radius,
  height,
  color,
}: {
  at: Vec3;
  radius: number;
  height: number;
  color: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 12]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}
function Monitor() {
  return (
    <group>
      <Block
        at={[0, 0.025, 0]}
        size={[0.24, 0.05, 0.18]}
        color={materials.device}
      />
      <Block
        at={[0, 0.18, -0.03]}
        size={[0.055, 0.3, 0.055]}
        color={materials.metal}
      />
      <Block
        at={[0, 0.44, -0.04]}
        size={[0.72, 0.45, 0.055]}
        color={materials.device}
      />
      <Block
        at={[0, 0.44, -0.006]}
        size={[0.66, 0.39, 0.01]}
        color={materials.screen}
        shadow={false}
      />
      <Block
        at={[-0.13, 0.44, 0.002]}
        size={[0.32, 0.24, 0.005]}
        color={materials.screenLight}
        shadow={false}
      />
      <Block
        at={[0, 0.025, 0.31]}
        size={[0.5, 0.035, 0.17]}
        color={materials.device}
      />
      <Block
        at={[0.37, 0.025, 0.31]}
        size={[0.075, 0.04, 0.12]}
        color={materials.device}
      />
    </group>
  );
}
function Laptop() {
  return (
    <group>
      <Block
        at={[0, 0.025, 0]}
        size={[0.47, 0.04, 0.32]}
        color={materials.metal}
      />
      <Block
        at={[0, 0.23, -0.17]}
        size={[0.47, 0.4, 0.025]}
        color={materials.device}
        rotation={[-0.18, 0, 0]}
      />
      <Block
        at={[0, 0.23, -0.15]}
        size={[0.42, 0.34, 0.008]}
        color={materials.screenLight}
        rotation={[-0.18, 0, 0]}
        shadow={false}
      />
    </group>
  );
}
function Printer() {
  return (
    <group>
      <RoundedBox
        args={[0.75, 0.39, 0.58]}
        radius={0.04}
        smoothness={2}
        position={[0, 0.2, 0]}
        castShadow
      >
        <meshStandardMaterial color={materials.paper} roughness={0.8} />
      </RoundedBox>
      <Block
        at={[0, 0.36, 0]}
        size={[0.65, 0.06, 0.48]}
        color={materials.device}
      />
      <Block
        at={[0, 0.16, 0.3]}
        size={[0.46, 0.09, 0.025]}
        color={materials.device}
      />
      <Block
        at={[0, 0.12, 0.4]}
        size={[0.34, 0.015, 0.3]}
        color={materials.paper}
      />
    </group>
  );
}
export function Desk({
  width,
  depth,
  equipment,
  selected,
}: {
  width: number;
  depth: number;
  equipment: EquipmentKind[];
  selected: boolean;
}) {
  return (
    <group>
      <RoundedBox
        args={[width, 0.09, depth]}
        radius={0.035}
        smoothness={2}
        position={[0, 0.8, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={selected ? materials.selected : materials.wood}
          roughness={0.72}
        />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            at={[side * (width / 2 - 0.12), 0.4, -depth / 2 + 0.12]}
            size={[0.065, 0.76, 0.065]}
            color={materials.metal}
          />
          <Block
            at={[side * (width / 2 - 0.12), 0.4, depth / 2 - 0.12]}
            size={[0.065, 0.76, 0.065]}
            color={materials.metal}
          />
          <Block
            at={[side * (width / 2 - 0.12), 0.08, 0]}
            size={[0.065, 0.06, depth - 0.15]}
            color={materials.metal}
          />
        </group>
      ))}
      <Block
        at={[0, 0.62, -depth / 2 + 0.1]}
        size={[width - 0.2, 0.22, 0.04]}
        color={materials.woodEdge}
      />
      {equipment.slice(0, 3).map((kind, index, visible) => (
        <group key={kind}
          position={[(index - (visible.length - 1) / 2) * width / visible.length, 0.85, -0.05]}
          scale={Math.min(0.85, width / (visible.length * 1.1), depth / 0.8)}>
          {kind === "pc" && <Monitor />}
          {kind === "laptop" && <Laptop />}
          {kind === "printer" && <Printer />}
          {kind === "scanner" && <>
            <Block at={[0, 0.05, 0]} size={[0.5, 0.1, 0.38]} color={materials.paper} />
            <Block at={[0, 0.11, 0]} size={[0.45, 0.025, 0.32]} color={materials.metal} />
          </>}
          {kind === "access-point" && <Cylinder at={[0, 0.04, 0]} radius={0.16} height={0.07} color={materials.paper} />}
          {kind === "generic" && <Block at={[0, 0.17, 0]} size={[0.4, 0.34, 0.32]} color={materials.device} />}
        </group>
      ))}
      {equipment.includes("pc") && <Block
        at={[-width / 2 + 0.3, 0.29, 0]} size={[0.22, 0.5, 0.4]} color={materials.device} />}

    </group>
  );
}

const roomFloor = new Shape();
HCNS_ROOM_OUTLINE.forEach(([x, z], index) => {
  if (index === 0) roomFloor.moveTo(x, -z);
  else roomFloor.lineTo(x, -z);
});
roomFloor.closePath();

type Point = [number, number];
function WallLine({ from, to }: { from: Point; to: Point }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  return (
    <Block
      at={[(from[0] + to[0]) / 2, 0.32, (from[1] + to[1]) / 2]}
      size={[Math.hypot(dx, dz), 0.64, 0.12]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
      color={materials.wall}
    />
  );
}

export function RoomShell() {
  return (
    <group>
      <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[roomFloor]} />
        <meshStandardMaterial color={materials.floor} roughness={1} />
      </mesh>
      {HCNS_ROOM_OUTLINE.map((from, index) => {
        const to = HCNS_ROOM_OUTLINE[(index + 1) % HCNS_ROOM_OUTLINE.length];
        // The plan's doorway is in the lower-left edge. Keep an open passage,
        // rather than placing a second wall across it or modelling door hardware.
        if (index === 5)
          return (
            <group key={index}>
              <WallLine from={from} to={[-5.15, 6.1]} />
              <WallLine from={[-5.15, 4.65]} to={to} />
            </group>
          );
        return <WallLine key={index} from={from} to={to} />;
      })}
      {/* Updated annotated plan: desk 01 outside; left-hand connecting door.
          The earlier inferred store is not present in this drawing. */}
      <WallLine
        from={[-1.03, HCNS_PARTITION_Z]}
        to={[HCNS_CONNECTING_DOOR.minX, HCNS_PARTITION_Z]}
      />
      <WallLine
        from={[HCNS_CONNECTING_DOOR.maxX, HCNS_PARTITION_Z]}
        to={[5.15, HCNS_PARTITION_Z]}
      />
    </group>
  );
}
