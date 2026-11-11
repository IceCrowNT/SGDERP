"use client";
import { HCNS_LAYOUT, type RoomPoint } from "@/lib/office-3d/hcns-layout";
import { Desk, RoomShell, materials } from "./RoomFurniture";

// Shared geometry: embedded in the building and in the detailed room viewer.
export function HcnsRoomModel({
  points,
  selected = null,
  onSelect,
}: {
  points: RoomPoint[];
  selected?: string | null;
  onSelect?: (key: string) => void;
}) {
  return (
    <group>
      <RoomShell />
      {HCNS_LAYOUT.map((slot) => {
        const point = points.find((p) => p.key === slot.key);
        if (!point) return null;
        const chosen = selected === slot.key;
        return (
          <group
            key={slot.key}
            position={[slot.x, 0, slot.z]}
            userData={{ objectKey: slot.key }}
            onClick={(event) => {
              if (onSelect) event.stopPropagation();
              if (onSelect && event.delta < 5) onSelect(slot.key);
            }}
          >
            <group rotation={[0, (slot.facingDegrees * Math.PI) / 180, 0]}>
              <Desk
                width={slot.width}
                depth={slot.depth}
                equipment={point.equipment}
                selected={chosen}
              />
            </group>
            {chosen && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry
                  args={[
                    Math.max(slot.width / 2, 0.85),
                    Math.max(slot.width / 2, 0.85) + 0.045,
                    48,
                  ]}
                />
                <meshBasicMaterial color={materials.accent} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
