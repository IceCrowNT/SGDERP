import {
  ARCHITECTURAL_REGIONS,
  type ArchitecturalFloor,
  type ArchitecturalKind,
  type ArchitecturalPoint,
} from "./architectural-layout";

export type FloorNumber = ArchitecturalFloor;
export type FloorSelection = FloorNumber | "all";
export type RoomKind = ArchitecturalKind | "reception";
export type BuildingRoom = {
  key: string;
  name: string;
  floor: FloorNumber;
  kind: RoomKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Local footprint; room group origin is the bounding-box centre. */
  outline: ArchitecturalPoint[];
  label: ArchitecturalPoint;
  showLabel: boolean;
  placed: boolean;
  sourceKey?: string;
};
export const BUILDING_FLOORS = [
  { floor: 1 as const, name: "Tầng 1" },
  { floor: 2 as const, name: "Tầng 2" },
  { floor: 3 as const, name: "Tầng 3" },
];
export const HCNS_BUILDING_KEY = "t2_hcns_pc";
// Confirmed floor-2 room uses follow the user's annotated I–VI plan.
// Keep geometry/binding keys stable; room names do not assign HR records.
const confirmed: Record<string, { key: string; name: string }> = {
  plan_t2_trai_sau: { key: "plan_t2_trai_sau", name: "Phòng Kế toán" },
  plan_t2_giua_sau: { key: "plan_t2_giua_sau", name: "Phòng Tổng Giám đốc" },
  plan_t2_phai_sau: { key: HCNS_BUILDING_KEY, name: "Phòng HCNS & Pháp Chế" },
  plan_t2_trai_giua: { key: "plan_t2_trai_giua", name: "Phòng Phát triển dự án" },
  plan_t2_trai_truoc: { key: "plan_t2_trai_truoc", name: "Phòng Chủ tịch" },
  plan_t2_phai_truoc: { key: "plan_t2_phai_truoc", name: "Phòng Kế hoạch Đầu tư" },
  plan_t1_trai_truoc: { key: "t1_kd", name: "Phòng Kinh Doanh" },
};
export const BUILDING_ROOMS: BuildingRoom[] = [
  ...ARCHITECTURAL_REGIONS.map((region): BuildingRoom => ({
    key: confirmed[region.key]?.key ?? region.key,
    name: confirmed[region.key]?.name ?? region.name,
    floor: region.floor,
    kind: region.kind,
    ...region.bounds,
    outline: region.points.map(([x, z]) => [x - region.bounds.x, z - region.bounds.z]),
    label: region.label,
    showLabel:
      region.kind === "room" || region.kind === "atrium" ||
      region.kind === "stairs" || (region.kind === "hall" && region.key.endsWith("_sanh")) || region.key === "plan_t1_loi_vao",
    placed: true,
    sourceKey: region.key,
  })),
  // The existing reception record remains readable. Its new physical placement
  // has not been confirmed, so do not silently attach it to the entire lobby.
  {
    key: "t1_letan", name: "Lễ Tân", floor: 1, kind: "reception",
    x: 0, z: 0, width: 0, depth: 0, outline: [], label: [0, 0],
    showLabel: false, placed: false,
  },
];
// Room-local HCNS geometry uses the same scale and axes as the floor plan.
export const HCNS_PLACEMENT = { scale: 1, rotation: 0 };
export function floorElevation(floor: FloorNumber, selection: FloorSelection) {
  // Exploded spacing is for readability, not a building-height measurement.
  return selection === "all" ? (floor - 1) * 11 : 0;
}
