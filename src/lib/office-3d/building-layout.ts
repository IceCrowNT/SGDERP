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
  /** Reference areas remain selectable without overlay text, even on hover. */
  suppressLabel?: boolean;
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
    suppressLabel: region.kind === "atrium" || /_wc_(nam|nu)$/.test(region.key) || region.key === "plan_t1_sanh",
    placed: true,
    sourceKey: region.key,
  })),
  // Reception is an open work area in front of Khánh Tiết, not an enclosed room.
  // Its existing floor-level location keeps its ID and business associations.
  {
    key: "t1_letan", name: "Lễ Tân", floor: 1, kind: "reception",
    x: -1.05, z: -4.175, width: 5.8, depth: 3.6,
    outline: [[-2.9,-1.8],[2.9,-1.8],[2.9,1.8],[-2.9,1.8]], label: [-1.05,-4.175],
    showLabel: true, placed: true,
  },
];
/** Spaces with a placement footprint; reception stays open, without artificial walls. */
export function isManageableSpace(shape: BuildingRoom | undefined) {
  return Boolean(shape?.placed && (shape.kind === "room" || shape.kind === "reception"));
}
export function isDirectWorkPoint(type: string | undefined) {
  return type === "CHO_NGOI" || type === "DIEM_DAT_THIET_BI";
}
// Room-local HCNS geometry uses the same scale and axes as the floor plan.
export const HCNS_PLACEMENT = { scale: 1, rotation: 0 };
export function floorElevation(floor: FloorNumber) {
  // Stable world elevation in every view; camera navigation never moves floors.
  // Exploded spacing is for readability, not a building-height measurement.
  return (floor - 1) * 11;
}

/** Display aliases only; never rename records or infer department membership. */
export function compactRoomName(name: string) {
  const short = name.replace(/^phòng\s+/iu, "").trim();
  if (/^kế hoạch\s*[-–]?\s*đầu tư$/iu.test(short)) return "KHĐT";
  if (/^hành chính tổng hợp$/iu.test(short)) return "Hành chính";
  return name.trim();
}

/** Visible walls follow the room footprint; the atrium front has its own low wall. */
export function roomWallSegments(room: BuildingRoom): [ArchitecturalPoint, ArchitecturalPoint][] {
  return room.outline.flatMap((start, index): [ArchitecturalPoint, ArchitecturalPoint][] => {
    const end = room.outline[(index + 1) % room.outline.length];
    if (room.kind === "atrium" && Math.abs(start[1] - room.depth / 2) < 1e-6 && Math.abs(end[1] - room.depth / 2) < 1e-6) return [];
    return [[start, end]];
  });
}
