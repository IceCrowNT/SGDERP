"use client";
import {
  HCNS_LAYOUT,
  personOffset,
  type RoomPoint,
} from "@/lib/office-3d/hcns-layout";
import { Desk, RoomShell, materials } from "./RoomFurniture";
import { OfficePerson } from "./OfficePerson";

// Shared geometry: embedded in the building and in the detailed room viewer.
export function HcnsRoomModel({
  points,
  selected = null,
  onSelect,
  hovered,
  onHover,
  person,
  onPerson,
  canViewEmployees = false,
}: {
  points: RoomPoint[];
  selected?: string | null;
  onSelect?: (key: string) => void;
  hovered?: string | null;
  onHover?: (key: string | null) => void;
  person?: number | null;
  onPerson?: (key: string, id: number) => void;
  canViewEmployees?: boolean;
}) {
  return (
    <group>
      <RoomShell />
      {HCNS_LAYOUT.map((slot) => {
        const point = points.find((p) => p.key === slot.key);
        if (!point) return null;
        const chosen = selected === slot.key;
        const highlighted = chosen || hovered === slot.key;
        const people =
          canViewEmployees && point.state === "active"
            ? (point.occupants ?? [])
            : [];
        return (
          <group
            key={slot.key}
            position={[slot.x, 0, slot.z]}
            userData={{ objectKey: slot.key }}
            onPointerOver={
              onSelect
                ? (event) => {
                    event.stopPropagation();
                    onHover?.(slot.key);
                  }
                : undefined
            }
            onPointerOut={onSelect ? () => onHover?.(null) : undefined}
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
                selected={highlighted}
              />
              {people.slice(0, 3).map((p, index) => (
                <group
                  key={p.id}
                  position={personOffset(slot, index, people.length)}
                  userData={{ personId: p.id }}
                  onClick={
                    onPerson
                      ? (event) => {
                          event.stopPropagation();
                          if (event.delta < 5) onPerson(slot.key, p.id);
                        }
                      : undefined
                  }
                >
                  <OfficePerson selected={chosen && person === p.id} />
                </group>
              ))}
            </group>
            {onSelect && (
              <group rotation={[0, (slot.facingDegrees * Math.PI) / 180, 0]}>
                {/* Subtle static edge makes empty desks discoverable without numbered pins. */}
                <mesh position={[0, 0.83, slot.depth / 2]}>
                  <boxGeometry args={[slot.width * 0.8, 0.025, 0.035]} />
                  <meshBasicMaterial
                    color={highlighted ? materials.accent : materials.woodEdge}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
