// Model coordinates are illustrative. facingDegrees uses degrees (0/90/180/270).
export const HCNS_LAYOUT = [
  {
    key: "hcns-01",
    number: 1,
    x: -2.1,
    z: -4.8,
    width: 2.5,
    depth: 1.2,
    facingDegrees: 180,
  },
  {
    key: "hcns-02",
    number: 2,
    x: -2.1,
    z: 1.7,
    width: 2.5,
    depth: 1.0,
    facingDegrees: 180,
  },
  {
    key: "hcns-03",
    number: 3,
    x: -2.75,
    z: 3.5,
    width: 1.8,
    depth: 1,
    facingDegrees: 180,
  },
  {
    key: "hcns-04",
    number: 4,
    x: -0.85,
    z: 3.5,
    width: 1.8,
    depth: 1,
    facingDegrees: 180,
  },
  {
    key: "hcns-05",
    number: 5,
    x: -2.75,
    z: 5.0,
    width: 1.8,
    depth: 0.85,
    facingDegrees: 180,
  },
  {
    key: "hcns-06",
    number: 6,
    x: -0.85,
    z: 5.0,
    width: 1.8,
    depth: 0.85,
    facingDegrees: 180,
  },
  {
    key: "hcns-07",
    number: 7,
    x: -2.75,
    z: 5.9,
    width: 1.8,
    depth: 0.85,
    facingDegrees: 0,
  },
  {
    key: "hcns-08",
    number: 8,
    x: -0.85,
    z: 5.9,
    width: 1.8,
    depth: 0.85,
    facingDegrees: 0,
  },
  {
    key: "hcns-09",
    number: 9,
    x: 3.05,
    z: 3.5,
    width: 1.45,
    depth: 1,
    facingDegrees: 90,
  },
  {
    key: "hcns-10",
    number: 10,
    x: 3.05,
    z: 5.8,
    width: 1.6,
    depth: 1.1,
    facingDegrees: 90,
  },
] as const;

export type EquipmentKind =
  "pc" | "laptop" | "printer" | "scanner" | "access-point";
export type RoomPoint = {
  key: string;
  locationId?: number;
  number: number;
  name: string;
  description: string | null;
  state: "active" | "inactive" | "unlinked";
  equipment: EquipmentKind[];
  occupants?: {
    id: number;
    name: string;
    position: string | null;
    department: string | null;
  }[];
};
export type HcnsRoomData = {
  name: string;
  path: string;
  points: RoomPoint[];
  canManage: boolean;
  canViewEmployees: boolean;
  canManageEmployees: boolean;
};

// A visual offset from the desk, not another HR/location assignment.
export function personOffset(
  slot: (typeof HCNS_LAYOUT)[number],
  index: number,
  count: number,
): [number, number, number] {
  return [
    (index - (Math.min(count, 3) - 1) / 2) * 0.48,
    0,
    slot.depth / 2 + 0.3,
  ];
}
export function personRoomPosition(
  slot: (typeof HCNS_LAYOUT)[number],
  index: number,
  count: number,
): [number, number, number] {
  const [x, , z] = personOffset(slot, index, count);
  const angle = (slot.facingDegrees * Math.PI) / 180;
  return [
    slot.x + Math.cos(angle) * x + Math.sin(angle) * z,
    1.65,
    slot.z - Math.sin(angle) * x + Math.cos(angle) * z,
  ];
}

// A temporary illustration from location notes, never an asset inventory/count.
export function equipmentFromNote(note: string | null): EquipmentKind[] {
  const text = (note ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const result: EquipmentKind[] = [];
  if (/\bpc\b|may tinh de ban/.test(text)) result.push("pc");
  if (/\blaptop\b|\blap\b/.test(text)) result.push("laptop");
  if (/\bprinter\b|may in/.test(text)) result.push("printer");
  if (/\bscanner\b|\bscaner\b|may quet/.test(text)) result.push("scanner");
  if (/\bap\b|access\s*point|bo phat/.test(text)) result.push("access-point");
  return result;
}
