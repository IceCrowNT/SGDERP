import { z } from "zod";
import {
  BUILDING_ROOMS,
  BUILDING_FLOORS,
  type FloorNumber,
} from "./building-layout";
import type { HcnsRoomData } from "./hcns-layout";
import { locationPath } from "@/lib/location-tree";

export const BuildingMappingSchema = z
  .object({
    version: z.literal(1),
    companyId: z.number().int().positive(),
    buildingId: z.number().int().positive(),
    floors: z
      .array(
        z
          .object({
            floor: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            locationId: z.number().int().positive(),
          })
          .strict(),
      )
      .max(3),
    rooms: z
      .array(
        z
          .object({ key: z.string(), locationId: z.number().int().positive() })
          .strict(),
      )
      .max(BUILDING_ROOMS.length),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = [
      v.buildingId,
      ...v.floors.map((f) => f.locationId),
      ...v.rooms.map((r) => r.locationId),
    ];
    if (
      new Set(ids).size !== ids.length ||
      new Set(v.floors.map((f) => f.floor)).size !== v.floors.length ||
      new Set(v.rooms.map((r) => r.key)).size !== v.rooms.length ||
      v.rooms.some((r) => !BUILDING_ROOMS.some((s) => s.key === r.key))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ánh xạ tòa nhà không hợp lệ.",
      });
  });
export type BuildingMapping = z.infer<typeof BuildingMappingSchema>;
export type BuildingLocation = {
  id: number;
  company_id: number;
  parent_id: number | null;
  ten_vi_tri: string;
  loai_vi_tri: string;
  dang_su_dung: boolean;
  mo_ta: string | null;
};
export type BuildingPerson = {
  id: number;
  name: string;
  position: string | null;
  department: string | null;
  location: string;
  pointKey: string | null;
};
export type BuildingAsset = {
  id: number;
  name: string;
  code: string;
  category: string;
  categoryCode: string;
  condition: import("@/lib/asset-location").LocationAsset["condition"];
  location: string;
  pointKey: string | null;
};
export type BuildingRoomData = {
  locationId?: number;
  key: string;
  name: string;
  state: "active" | "inactive" | "unlinked";
  description: string | null;
  path: string | null;
  occupants?: BuildingPerson[];
  assets?: BuildingAsset[];
};
export type BuildingData = {
  objects?: PlacedObject[];
  canManageEmployees?: boolean;
  canManageAssets?: boolean;
  name: string;
  floors: {
    floor: FloorNumber;
    name: string;
    state: "active" | "inactive" | "unlinked";
  }[];
  rooms: BuildingRoomData[];
  hcns: HcnsRoomData | null;
  canManage: boolean;
  canViewEmployees: boolean;
  canViewAssets: boolean;
};
export type PlacedObject = import("./placement").PlacementShape & {
  id: number;
  roomKey: string;
  roomId: number;
  version: string;
  locationVersion: string;
  point: import("./hcns-layout").RoomPoint;
};

// Show only the path inside the selected room, retaining nested-area context.
export function relativeRoomLocation(id: number, roomId: number, rows: BuildingLocation[]) {
  const parts: string[] = [], seen = new Set<number>();
  const byId = new Map(rows.map(row => [row.id, row]));
  let current: number | null = id;
  while (current !== null && !seen.has(current)) {
    if (current === roomId) return parts.reverse().join(" / ") || "Trong phòng";
    seen.add(current);
    const row = byId.get(current);
    if (!row) break;
    parts.push(row.ten_vi_tri);
    current = row.parent_id;
  }
  return "Chưa rõ vị trí";
}

// Only exact IDs and a valid physical hierarchy can attach business data.
export function resolveBuilding(
  mapping: BuildingMapping,
  rows: BuildingLocation[],
) {
  const own = rows.filter((r) => r.company_id === mapping.companyId);
  const building = own.find(
    (r) =>
      r.id === mapping.buildingId &&
      r.loai_vi_tri === "TOA_NHA" &&
      r.parent_id === null &&
      r.dang_su_dung,
  );
  if (!building) return null;
  const floors = BUILDING_FLOORS.map((f) => {
    const row = own.find(
      (r) =>
        r.id === mapping.floors.find((m) => m.floor === f.floor)?.locationId &&
        r.parent_id === building.id &&
        r.loai_vi_tri === "TANG",
    );
    return {
      floor: f.floor,
      name: row?.ten_vi_tri ?? f.name,
      state: !row
        ? ("unlinked" as const)
        : row.dang_su_dung
          ? ("active" as const)
          : ("inactive" as const),
      row,
    };
  });
  const rooms = BUILDING_ROOMS.map((shape) => {
    const floor = floors.find((f) => f.floor === shape.floor)!;
    const row = own.find(
      (r) =>
        r.id === mapping.rooms.find((m) => m.key === shape.key)?.locationId &&
        floor.row &&
        r.parent_id === floor.row.id &&
        ["PHONG", "KHU_VUC"].includes(r.loai_vi_tri),
    );
    const state = !row
      ? ("unlinked" as const)
      : row.dang_su_dung && floor.state === "active"
        ? ("active" as const)
        : ("inactive" as const);
    const locationIds = new Set<number>();
    if (row && state === "active") {
      locationIds.add(row.id);
      for (const id of locationIds)
        for (const child of own)
          if (child.parent_id === id && child.dang_su_dung)
            locationIds.add(child.id);
    }
    return {
      key: shape.key,
      name: row?.ten_vi_tri ?? shape.name,
      state,
      description: row?.mo_ta ?? null,
      path: row ? locationPath(row.id, own) : null,
      row,
      locationIds,
    };
  });
  return { name: building.ten_vi_tri, floors, rooms };
}
