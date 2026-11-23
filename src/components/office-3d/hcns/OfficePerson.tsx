"use client";
import { CapsuleGeometry, SphereGeometry } from "three";
import { materials } from "./RoomFurniture";

// Geometry is immutable and shared. Materials belong to each silhouette:
// room/floor transitions change opacity and must not affect other people.
const head = new SphereGeometry(0.17, 12, 8);
const body = new CapsuleGeometry(0.2, 0.34, 3, 8);
const leg = new CapsuleGeometry(0.075, 0.34, 2, 6);

export function OfficePerson({ selected }: { selected: boolean }) {
  return (
    <group name="office-person">
      <mesh geometry={head} position={[0, 1.28, 0]} castShadow>
        <meshStandardMaterial color="#d7bfa5" roughness={0.9} />
      </mesh>
      <mesh geometry={body} position={[0, 0.86, 0]} castShadow>
        <meshStandardMaterial color={selected ? materials.accent : "#718c94"} roughness={0.9} />
      </mesh>
      <mesh geometry={leg} position={[-0.1, 0.3, 0]} castShadow>
        <meshStandardMaterial color={materials.metal} roughness={0.9} />
      </mesh>
      <mesh geometry={leg} position={[0.1, 0.3, 0]} castShadow>
        <meshStandardMaterial color={materials.metal} roughness={0.9} />
      </mesh>
    </group>
  );
}
