"use client";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useState } from "react";
import { layoutEquipment } from "@/lib/office-3d/equipment-layout";
import type { LocationAsset } from "@/lib/asset-location";
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

function Scanner() {
  // Open flatbed lid, glass and a document distinguish it from a printer.
  return <group>
    <Block at={[0, .06, 0]} size={[.56, .12, .44]} color={materials.paper} />
    <Block at={[0, .125, 0]} size={[.48, .015, .35]} color={materials.screenLight} />
    <Block at={[.015, .138, .015]} size={[.31, .008, .25]} color={materials.white} shadow={false} />
    <group position={[0, .14, -.19]} rotation={[-.65, 0, 0]}>
      <Block at={[0, .015, .19]} size={[.54, .03, .4]} color={materials.device} />
      <Block at={[0, -.005, .19]} size={[.47, .008, .33]} color={materials.paper} />
    </group>
    <Block at={[.21, .13, .19]} size={[.04, .015, .025]} color={materials.accent} shadow={false} />
  </group>;
}

function Phone() {
  return <group>
    <Block at={[0, .08, 0]} size={[.4, .16, .42]} color={materials.device} rotation={[-.12, 0, 0]} />
    <Block at={[.055, .18, -.1]} size={[.19, .02, .11]} color={materials.screenLight} rotation={[-.12, 0, 0]} />
    <Block at={[-.16, .22, 0]} size={[.07, .065, .29]} color={materials.metal} />
    {[-.14, .14].map(z => <Block key={z} at={[-.16, .2, z]} size={[.12, .1, .1]} color={materials.metal} />)}
    {Array.from({length: 9}, (_, i) => <Block key={i} at={[.015 + i % 3 * .055, .17, .025 + Math.floor(i / 3) * .055]}
      size={[.035, .018, .035]} color={materials.muted} shadow={false} />)}
  </group>;
}

function Tower({ ups = false }: { ups?: boolean }) {
  return <group>
    <Block at={[0, .32, 0]} size={[.34, .64, .44]} color={materials.device} />
    <Block at={[0, .34, .225]} size={[.29, .57, .02]} color={materials.metal} />
    <Block at={[0, .51, .24]} size={[.17, ups ? .13 : .055, .015]} color={materials.screenLight} shadow={false} />
    {Array.from({length: ups ? 4 : 3}, (_, i) => <Block key={i} at={[0, .13 + i * .065, .24]}
      size={[.21, .025, .012]} color={materials.device} shadow={false} />)}
    <Block at={[.09, .4, .24]} size={[.025, .025, .015]} color={materials.accent} shadow={false} />
  </group>;
}

function NetworkDevice({ kind }: { kind: "pbx" | "router" | "switch" }) {
  const ports = kind === "switch" ? 8 : kind === "pbx" ? 6 : 4;
  return <group>
    <Block at={[0, .095, 0]} size={[.7, .19, .36]} color={kind === "pbx" ? materials.paper : materials.metal} />
    <Block at={[0, .1, .185]} size={[.65, .13, .015]} color={materials.device} />
    {Array.from({length: ports}, (_, i) => <group key={i} position={[(i - (ports - 1) / 2) * .065, .1, .2]}>
      <Block at={[0, 0, 0]} size={[.045, .045, .015]} color={materials.muted} shadow={false} />
      <Block at={[0, .04, 0]} size={[.015, .012, .015]} color={materials.screenLight} shadow={false} />
    </group>)}
    {kind === "router" && <Block at={[0, .198, 0]} size={[.25, .015, .1]} color={materials.screenLight} shadow={false} />}
    {kind === "pbx" && <Block at={[0, .198, 0]} size={[.3, .015, .13]} color={materials.device} shadow={false} />}
  </group>;
}

export function EquipmentModel({ kind }: { kind: EquipmentKind }) {
  // Only the requested model is mounted: no hidden library of meshes/textures.
  switch (kind) {
    case "pc": return <Monitor />;
    case "laptop": return <Laptop />;
    case "printer": return <Printer />;
    case "scanner": return <Scanner />;
    case "phone": return <Phone />;
    case "server": return <Tower />;
    case "ups": return <Tower ups />;
    case "pbx": case "router": case "switch": return <NetworkDevice kind={kind} />;
    case "access-point": return <group>
      <Cylinder at={[0, .04, 0]} radius={.16} height={.07} color={materials.paper} />
      <Block at={[0, .078, .06]} size={[.06, .008, .015]} color={materials.screenLight} shadow={false} />
    </group>;
    default: return <Block at={[0, .17, 0]} size={[.4, .34, .32]} color={materials.device} />;
  }
}

export type EquipmentInteraction = {
  activeEquipment?: EquipmentKind;
  activeAsset?: number;
  assets?: LocationAsset[];
  layoutAssets?: LocationAsset[];
  onEquipment?: (kind: EquipmentKind, focus: boolean, assetId?: number) => void;
};
export function EquipmentDisplay({ equipment, assets, layoutAssets, width, depth, height = 0, desk = false, activeEquipment, activeAsset, onEquipment }: {
  equipment: EquipmentKind[]; width: number; depth: number; height?: number; desk?: boolean;
} & EquipmentInteraction) {
  const [hovered, setHovered] = useState<string | null>(null);
  const placements = useMemo(()=>layoutEquipment({equipment,assets:layoutAssets ?? assets,width,depth,height,desk}),[equipment,assets,layoutAssets,width,depth,height,desk]);
  const visible = assets ? new Set(assets.map(a=>a.id)) : null;
  return <>{placements.filter(p=>p.assetId === undefined || !visible || visible.has(p.assetId)).map(({key, kind, assetId, part, position, scale, footprint}) => (
    <group key={`${key}-${part}`} userData={{equipmentKind: kind, assetId}}
      onPointerOver={onEquipment ? e => {e.stopPropagation(); setHovered(key);} : undefined}
      onPointerOut={() => setHovered(null)}
      onClick={onEquipment ? e => {e.stopPropagation(); if(e.button === 0 && e.delta < 5) onEquipment(kind, false, assetId);} : undefined}
      onDoubleClick={onEquipment ? e => {e.stopPropagation(); if(e.button === 0 && e.delta < 5) onEquipment(kind, true, assetId);} : undefined}
      position={position} scale={scale}>
      {part === "pc-tower" ? <Block at={[0,.25,0]} size={[.22,.5,.4]} color={materials.device}/> : <EquipmentModel kind={kind} />}
      {((activeAsset ? activeAsset === assetId : activeEquipment === kind) || hovered === key) && onEquipment && <mesh rotation={[-Math.PI/2,0,0]} position={[(footprint.x-position[0])/scale,.008,(footprint.z-position[2])/scale]} raycast={() => {}}>
        <planeGeometry args={[footprint.width/scale,footprint.depth/scale]}/><meshBasicMaterial color={materials.accent} transparent opacity={.2} depthWrite={false}/>
      </mesh>}

    </group>
  ))}</>;
}
export function Desk({
  width,
  depth,
  equipment,
  selected,
  activeEquipment,
  activeAsset,
  assets,
  layoutAssets,
  onEquipment,
}: {
  width: number;
  depth: number;
  equipment: EquipmentKind[];
  selected: boolean;
} & EquipmentInteraction) {
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
      <EquipmentDisplay equipment={equipment} assets={assets} layoutAssets={layoutAssets} width={width} depth={depth} height={.85} desk
        activeEquipment={activeEquipment} activeAsset={activeAsset} onEquipment={onEquipment} />

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
