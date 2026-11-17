import { ARCHITECTURAL_REGIONS } from "./architectural-layout";
import type { LocationAsset } from "../asset-location";

// User-confirmed: HCNS occupies the room labelled 95.4 m² on floor 2.
// Furniture follows the annotated floor-2 sheet; sizes remain schematic.
const hcnsRegion = ARCHITECTURAL_REGIONS.find(
  (region) => region.key === "plan_t2_phai_sau",
)!;
export const HCNS_ROOM_OUTLINE = hcnsRegion.points.map(
  ([x, z]): [number, number] => [
    Number((x - hcnsRegion.bounds.x).toFixed(3)),
    Number((z - hcnsRegion.bounds.z).toFixed(3)),
  ],
);
export const HCNS_ROOM_BOUNDS = {
  width: hcnsRegion.bounds.width,
  depth: hcnsRegion.bounds.depth,
  minX: -hcnsRegion.bounds.width / 2,
  maxX: hcnsRegion.bounds.width / 2,
  minZ: -hcnsRegion.bounds.depth / 2,
  maxZ: hcnsRegion.bounds.depth / 2,
};

// Corridor entry is on the lower-left edge of the architectural plan (+Z).
// Desk 01 is alone in the entry zone. The annotated partition aligns with the
// lower edge of the stairwell, with a left-hand doorway to desks 02–10.
export const HCNS_PARTITION_Z = 1.675;
export const HCNS_CONNECTING_DOOR = { minX: -0.85, maxX: 0.75 };

// Facing uses degrees. A shared model is translated into the building without
// rotating or squeezing individual desks; stable keys retain location bindings.
export const HCNS_LAYOUT = [
  {
    key: "hcns-01",
    number: 1,
    x: 0.9,
    z: 6.5,
    width: 2.5,
    depth: 1.2,
    facingDegrees: 0,
  },
  {
    key: "hcns-02",
    number: 2,
    x: 3.2,
    z: 0.4,
    width: 2.3,
    depth: 1.0,
    facingDegrees: 0,
  },
  {
    key: "hcns-03",
    number: 3,
    x: 4.0,
    z: -2.3,
    width: 1.6,
    depth: 0.8,
    facingDegrees: 0,
  },
  {
    key: "hcns-04",
    number: 4,
    x: 2.3,
    z: -2.3,
    width: 1.6,
    depth: 0.8,
    facingDegrees: 0,
  },
  {
    key: "hcns-05",
    number: 5,
    x: 4.0,
    z: -5.25,
    width: 1.6,
    depth: 0.7,
    facingDegrees: 0,
  },
  {
    key: "hcns-06",
    number: 6,
    x: 2.3,
    z: -5.25,
    width: 1.6,
    depth: 0.7,
    facingDegrees: 0,
  },
  {
    key: "hcns-07",
    number: 7,
    x: 4.0,
    z: -6.0,
    width: 1.6,
    depth: 0.7,
    facingDegrees: 180,
  },
  {
    key: "hcns-08",
    number: 8,
    x: 2.3,
    z: -6.0,
    width: 1.6,
    depth: 0.7,
    facingDegrees: 180,
  },
  {
    key: "hcns-09",
    number: 9,
    x: 0.05,
    z: -2.3,
    width: 1.45,
    depth: 1,
    facingDegrees: 270,
  },
  {
    key: "hcns-10",
    number: 10,
    x: 0.05,
    z: -5.65,
    width: 1.5,
    depth: 1.1,
    facingDegrees: 270,
  },
] as const;

export const EQUIPMENT_KINDS = ["pc", "laptop", "printer", "scanner", "access-point",
  "phone", "pbx", "server", "ups", "router", "switch", "generic"] as const;
export type EquipmentKind = typeof EQUIPMENT_KINDS[number];
export function assetsForEquipment(assets: LocationAsset[], kind: EquipmentKind) {
  return assets.filter(asset => equipmentForAssets([asset])[0] === kind);
}
export type RoomPoint = {
  key: string;
  locationId?: number;
  number: number;
  name: string;
  description: string | null;
  state: "active" | "inactive" | "unlinked";
  equipment: EquipmentKind[];
  assets?: LocationAsset[];
  // Rendering-only snapshot: retain packing positions while layers are filtered.
  layoutAssets?: LocationAsset[];
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
  canViewAssets: boolean;
  canManageAssets: boolean;
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
    slot.depth / 2 + 0.2,
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

// Type catalog for filtering/legacy group selection. Rendering uses asset IDs.
export function equipmentForAssets(assets: Pick<LocationAsset, "category" | "categoryCode">[]): EquipmentKind[] {
  return [...new Set(assets.map((asset): EquipmentKind => {
    // Stable category codes take priority over descriptive names. Unknown codes
    // can still use familiar Vietnamese/English names; no database IDs are baked in.
    const codes: Record<string, EquipmentKind> = {
      PC: "pc", LAPTOP: "laptop", PRN: "printer", SCN: "scanner", AP: "access-point",
      TEL: "phone", PHONE: "phone", PBX: "pbx", SRV: "server", UPS: "ups", LB: "router", SW: "switch",
    };
    const known = codes[asset.categoryCode.trim().toUpperCase()];
    if (known) return known;
    const text = `${asset.categoryCode} ${asset.category}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[_-]/g, " ")
    .toLowerCase();
    if (/\blaptop\b|may tinh xach tay/.test(text)) return "laptop";
    if (/\bpc\b|desktop|may tinh/.test(text)) return "pc";
    if (/\bprinter\b|may in/.test(text)) return "printer";
    if (/\bscan(?:ner|er)?\b|may quet/.test(text)) return "scanner";
    if (/\bpbx\b|tong dai/.test(text)) return "pbx";
    if (/\btel\b|\bphone\b|telephone|dien thoai/.test(text)) return "phone";
    if (/\bsrv\b|\bserver\b|may chu/.test(text)) return "server";
    if (/\bups\b|luu dien/.test(text)) return "ups";
    if (/\bswitch\b|chuyen mach/.test(text)) return "switch";
    if (/\brouter\b|can bang tai|dinh tuyen|load balanc/.test(text)) return "router";
    if (/\bap\b|access\s*point|bo phat|wifi|wi fi/.test(text)) return "access-point";
    return "generic";
  }))];
}
