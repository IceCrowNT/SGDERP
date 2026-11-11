"use client";
import { CapsuleGeometry, SphereGeometry, MeshStandardMaterial } from "three";
import { materials } from "./RoomFurniture";

// Shared, static silhouettes. No skinning, textures or continuous animation.
const head = new SphereGeometry(0.17, 12, 8);
const body = new CapsuleGeometry(0.2, 0.34, 3, 8);
const leg = new CapsuleGeometry(0.075, 0.34, 2, 6);
const skin = new MeshStandardMaterial({ color: "#d7bfa5", roughness: 0.9 });
const shirt = new MeshStandardMaterial({ color: "#718c94", roughness: 0.9 });
const trousers = new MeshStandardMaterial({
  color: materials.metal,
  roughness: 0.9,
});
const highlight = new MeshStandardMaterial({
  color: materials.accent,
  roughness: 0.9,
});

export function OfficePerson({ selected }: { selected: boolean }) {
  return (
    <group dispose={null}>
      <mesh
        geometry={head}
        material={skin}
        position={[0, 1.28, 0]}
        castShadow
      />
      <mesh
        geometry={body}
        material={selected ? highlight : shirt}
        position={[0, 0.86, 0]}
        castShadow
      />
      <mesh
        geometry={leg}
        material={trousers}
        position={[-0.1, 0.3, 0]}
        castShadow
      />
      <mesh
        geometry={leg}
        material={trousers}
        position={[0.1, 0.3, 0]}
        castShadow
      />
    </group>
  );
}
