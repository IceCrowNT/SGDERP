"use client";
import { RoundedBox } from "@react-three/drei";
import type { EquipmentKind } from "@/lib/office-3d/hcns-layout";

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
      {equipment.includes("pc") && (
        <>
          <group
            position={[equipment.includes("laptop") ? -0.45 : 0, 0.85, -0.12]}
          >
            <Monitor />
          </group>
          <Block
            at={[-width / 2 + 0.3, 0.29, 0]}
            size={[0.22, 0.5, 0.4]}
            color={materials.device}
          />
        </>
      )}
      {equipment.includes("laptop") && (
        <group position={[equipment.includes("pc") ? 0.6 : 0, 0.85, 0.05]}>
          <Laptop />
        </group>
      )}
      {equipment.includes("printer") && (
        <group position={[0, 0.85, 0]}>
          <Printer />
        </group>
      )}
      {equipment.includes("scanner") && (
        <>
          <Block
            at={[width / 2 - 0.35, 0.9, 0.04]}
            size={[0.5, 0.1, 0.38]}
            color={materials.paper}
          />
          <Block
            at={[width / 2 - 0.35, 0.96, 0.04]}
            size={[0.45, 0.025, 0.32]}
            color={materials.metal}
          />
        </>
      )}
      {equipment.includes("access-point") && (
        <Cylinder
          at={[-width / 2 + 0.3, 0.9, -0.16]}
          radius={0.16}
          height={0.07}
          color={materials.paper}
        />
      )}
    </group>
  );
}

export function RoomShell() {
  return (
    <group>
      <RoundedBox
        args={[9.6, 0.3, 14.8]}
        radius={0.1}
        smoothness={2}
        position={[0, -0.2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={materials.slab} roughness={1} />
      </RoundedBox>
      <Block
        at={[0, -0.035, 0]}
        size={[9.2, 0.08, 14.4]}
        color={materials.floor}
        shadow={false}
      />
      {Array.from({ length: 11 }, (_, i) => (
        <Block
          key={`z${i}`}
          at={[0, 0.009, -6 + i * 1.2]}
          size={[9.15, 0.006, 0.014]}
          color={materials.grout}
          shadow={false}
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Block
          key={`x${i}`}
          at={[-3.6 + i * 1.2, 0.009, 0]}
          size={[0.014, 0.006, 14.35]}
          color={materials.grout}
          shadow={false}
        />
      ))}
      <Block
        at={[0, 1.25, -7.2]}
        size={[9.4, 2.5, 0.15]}
        color={materials.wall}
      />
      <Block
        at={[-4.6, 0.36, 0]}
        size={[0.15, 0.72, 14.4]}
        color={materials.wall}
      />
      {/* Right wall with the entrance shown on the supplied sketch. */}
      <Block
        at={[4.6, 0.48, -5.9]}
        size={[0.15, 0.96, 2.6]}
        color={materials.wall}
      />
      <Block
        at={[4.6, 0.48, 1.85]}
        size={[0.15, 0.96, 10.7]}
        color={materials.wall}
      />
      <group position={[4.6, 0, -4.6]} rotation={[0, -Math.PI / 2, 0]}>
        <Door width={1.1} />
      </group>
      {/* Partition: confirmed doorway; exact opening position awaits measurement. */}
      <Block
        at={[-1.85, 0.38, 0.3]}
        size={[5.5, 0.76, 0.14]}
        color={materials.wall}
      />
      <Block
        at={[3.35, 0.38, 0.3]}
        size={[2.5, 0.76, 0.14]}
        color={materials.wall}
      />
      <group position={[0.9, 0, 0.3]}>
        <Door width={1.2} />
      </group>
      {/* Store occupies the upper-right corner of the partition. */}
      <Block
        at={[3.35, 0.75, -2.4]}
        size={[2.5, 1.5, 0.12]}
        color={materials.wall}
      />
      <Block
        at={[2.1, 0.75, -2.12]}
        size={[0.12, 1.5, 0.55]}
        color={materials.wall}
      />
      <Block
        at={[2.1, 0.75, -0.3]}
        size={[0.12, 1.5, 1.2]}
        color={materials.wall}
      />
      <group position={[2.1, 0, -1.85]} rotation={[0, -Math.PI / 2, 0]}>
        <Door width={0.95} />
      </group>
      <Block
        at={[3.35, 0.015, -1.05]}
        size={[2.35, 0.025, 2.55]}
        color={materials.grout}
        shadow={false}
      />
      <Block
        at={[0, 0.08, -7.1]}
        size={[9.15, 0.16, 0.035]}
        color={materials.woodEdge}
        shadow={false}
      />
    </group>
  );
}
function Door({ width }: { width: number }) {
  return (
    <group>
      {[0, width].map((x) => (
        <Block
          key={x}
          at={[x, 1.05, 0]}
          size={[0.075, 2.1, 0.13]}
          color={materials.woodEdge}
        />
      ))}
      <Block
        at={[width / 2, 2.1, 0]}
        size={[width + 0.075, 0.075, 0.13]}
        color={materials.woodEdge}
      />
      <group rotation={[0, -Math.PI / 3, 0]}>
        <Block
          at={[width / 2, 1.02, 0]}
          size={[width - 0.04, 2, 0.045]}
          color={materials.wood}
        />
        <Block
          at={[width - 0.18, 1, 0.055]}
          size={[0.1, 0.035, 0.04]}
          color={materials.metal}
        />
      </group>
    </group>
  );
}
