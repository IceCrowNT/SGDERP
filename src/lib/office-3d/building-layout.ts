// Illustrative footprint carried forward from the existing building plan.
// Geometry keys are not department codes or database identifiers.
export type FloorNumber = 1 | 2 | 3;
export type FloorSelection = FloorNumber | "all";
export type RoomKind =
  | "office"
  | "meeting"
  | "executive"
  | "lobby"
  | "garden"
  | "dining"
  | "tenant"
  | "stairs"
  | "reception"
  | "utility";
export type BuildingRoom = {
  key: string;
  name: string;
  floor: FloorNumber;
  kind: RoomKind;
  x: number;
  z: number;
  width: number;
  depth: number;
};
export const BUILDING_FLOORS = [
  { floor: 1 as const, name: "Tầng 1", description: "Đón tiếp & kinh doanh" },
  { floor: 2 as const, name: "Tầng 2", description: "Điều hành & nghiệp vụ" },
  {
    floor: 3 as const,
    name: "Tầng 3",
    description: "Không gian chung & tiện ích",
  },
];
export const BUILDING_ROOMS: BuildingRoom[] = [
  {
    key: "t1_kd",
    name: "Phòng Kinh Doanh",
    floor: 1,
    kind: "office",
    x: -14,
    z: -12,
    width: 14,
    depth: 9.5,
  },
  {
    key: "t1_hop1",
    name: "Phòng Họp 1",
    floor: 1,
    kind: "meeting",
    x: -0.5,
    z: -12,
    width: 11,
    depth: 9.5,
  },
  {
    key: "t1_hop2",
    name: "Phòng Họp 2",
    floor: 1,
    kind: "meeting",
    x: 12.5,
    z: -12,
    width: 13,
    depth: 9.5,
  },
  {
    key: "t1_sanh",
    name: "Sảnh",
    floor: 1,
    kind: "lobby",
    x: -7,
    z: 0.5,
    width: 20,
    depth: 13.5,
  },
  {
    key: "t1_letan",
    name: "Lễ Tân",
    floor: 1,
    kind: "reception",
    x: 4.5,
    z: -1.5,
    width: 2.2,
    depth: 7,
  },
  {
    key: "t1_khach",
    name: "Phòng Khách",
    floor: 1,
    kind: "executive",
    x: 14.5,
    z: 0.5,
    width: 9.5,
    depth: 13.5,
  },
  {
    key: "t1_bank",
    name: "Ngân Hàng Cho Thuê",
    floor: 1,
    kind: "tenant",
    x: -9.5,
    z: 12.5,
    width: 23,
    depth: 8.5,
  },
  {
    key: "t1_thang",
    name: "Thang Tầng 2",
    floor: 1,
    kind: "stairs",
    x: 4.5,
    z: 12.5,
    width: 4.8,
    depth: 8.5,
  },
  {
    key: "t1_wc",
    name: "Khu Vệ Sinh",
    floor: 1,
    kind: "utility",
    x: 14.5,
    z: 12.5,
    width: 9.5,
    depth: 8.5,
  },
  {
    key: "t2_atrium",
    name: "Thông tầng",
    floor: 2,
    kind: "lobby",
    x: -3,
    z: 0.5,
    width: 17,
    depth: 12,
  },
  {
    key: "t2_chutich",
    name: "Phòng Chủ Tịch",
    floor: 2,
    kind: "executive",
    x: -14,
    z: -12,
    width: 14,
    depth: 9.5,
  },
  {
    key: "t2_ptda",
    name: "Phát Triển Dự Án",
    floor: 2,
    kind: "office",
    x: -0.5,
    z: -12,
    width: 11,
    depth: 9.5,
  },
  {
    key: "t2_tckt",
    name: "Tài Chính Kế Toán",
    floor: 2,
    kind: "office",
    x: 12.5,
    z: -12,
    width: 13,
    depth: 9.5,
  },
  {
    key: "t2_tonggd",
    name: "Phòng Tổng Giám Đốc",
    floor: 2,
    kind: "executive",
    x: 14.5,
    z: 0.5,
    width: 9.5,
    depth: 13.5,
  },
  {
    key: "t2_khdt",
    name: "Kế Hoạch - Đầu Tư",
    floor: 2,
    kind: "office",
    x: -14,
    z: 12.5,
    width: 14,
    depth: 8.5,
  },
  {
    key: "t2_hcns_pc",
    name: "Phòng HCNS & Pháp Chế",
    floor: 2,
    kind: "office",
    x: -0.5,
    z: 12.5,
    width: 11,
    depth: 8.5,
  },
  {
    key: "t2_thang",
    name: "Thang Tầng 3",
    floor: 2,
    kind: "stairs",
    x: 7,
    z: 12.5,
    width: 3.4,
    depth: 8.5,
  },
  {
    key: "t2_wc",
    name: "Khu Vệ Sinh",
    floor: 2,
    kind: "utility",
    x: 14.5,
    z: 12.5,
    width: 9.5,
    depth: 8.5,
  },
  {
    key: "t3_cayxanh",
    name: "Vườn cây",
    floor: 3,
    kind: "garden",
    x: -2,
    z: 0.5,
    width: 17,
    depth: 13,
  },
  {
    key: "t3_xaydung_bac",
    name: "Công ty xây dựng · khu Bắc",
    floor: 3,
    kind: "office",
    x: -6,
    z: -12,
    width: 29.5,
    depth: 9.5,
  },
  {
    key: "t3_xaydung_nam",
    name: "Công ty xây dựng · khu Nam",
    floor: 3,
    kind: "office",
    x: -6,
    z: 12.5,
    width: 29.5,
    depth: 8.5,
  },
  {
    key: "t3_phongan",
    name: "Phòng Ăn",
    floor: 3,
    kind: "dining",
    x: 14.5,
    z: 0.5,
    width: 9.5,
    depth: 21,
  },
];
export const HCNS_BUILDING_KEY = "t2_hcns_pc";
// Rotate the room as a whole; uniform scale preserves desk angles and proportions.
export const HCNS_PLACEMENT = { scale: 0.71, rotation: Math.PI / 2 };
export function floorElevation(floor: FloorNumber, selection: FloorSelection) {
  return selection === "all" ? (floor - 1) * 11 : 0;
}
