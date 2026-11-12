/**
 * Simplified footprints from 1-1 / 1-2 / 1-3 MB TANG PDFs supplied by SDG.
 * Source grid spans: X 8.20 + 2.16 + 6.80 + 2.16 + 4.12 + 4.08 + 2.10;
 * Z 6.60 + 2.80 + 2.30 + 3.75 + 3.75 + 2.35 + 2.70, front projection 6.90.
 * Relative metre units preserve room proportions; these are not surveyed CAD
 * boundaries. Wall thickness, columns, ceilings and decorative details omitted.
 * Top of the source sheet is -Z, entrance is +Z (not a compass bearing).
 * Region keys identify source geometry, never departments or database records.
 */
export type ArchitecturalPoint = [x: number, z: number];
export type ArchitecturalFloor = 1 | 2 | 3;
export type ArchitecturalKind =
  | "room"
  | "hall"
  | "stairs"
  | "utility"
  | "atrium"
  | "entrance"
  | "roof";
export type ArchitecturalRegion = {
  key: string;
  name: string;
  floor: ArchitecturalFloor;
  kind: ArchitecturalKind;
  points: ArchitecturalPoint[];
  bounds: { x: number; z: number; width: number; depth: number };
  label: ArchitecturalPoint;
  /** Source annotation only; not calculated floor area or business data. */
  sourceAreaM2?: number;
};

const ORIGIN_X = 14.81;
const ORIGIN_Z = 15.575;
function point(x: number, z: number): ArchitecturalPoint {
  return [Number((x - ORIGIN_X).toFixed(3)), Number((z - ORIGIN_Z).toFixed(3))];
}
function rectangle(x1: number, z1: number, x2: number, z2: number): ArchitecturalPoint[] {
  return [[x1, z1], [x2, z1], [x2, z2], [x1, z2]];
}
function region(
  floor: ArchitecturalFloor,
  key: string,
  name: string,
  kind: ArchitecturalKind,
  sourcePoints: ArchitecturalPoint[],
  sourceAreaM2?: number,
  sourceLabel?: ArchitecturalPoint,
): ArchitecturalRegion {
  const points = sourcePoints.map(([x, z]) => point(x, z));
  const xs = points.map(([x]) => x), zs = points.map(([, z]) => z);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const bounds = {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    width: maxX - minX,
    depth: maxZ - minZ,
  };
  return {
    key: `plan_t${floor}_${key}`,
    name,
    floor,
    kind,
    points,
    bounds,
    label: sourceLabel ? point(...sourceLabel) : [bounds.x, bounds.z],
    ...(sourceAreaM2 === undefined ? {} : { sourceAreaM2 }),
  };
}
function serviceCore(floor: ArchitecturalFloor): ArchitecturalRegion[] {
  return [
    region(floor, "wc_nu", "WC nữ", "utility", rectangle(19.32, 0, 23.44, 3.3)),
    region(floor, "wc_nam", "WC nam", "utility", rectangle(19.32, 3.3, 23.44, 6.6)),
    region(floor, "thang", "Cầu thang", "stairs", rectangle(19.32, 6.6, 23.44, 9.4)),
    region(floor, "ky_thuat", "Khu phụ trợ", "utility", rectangle(19.32, 9.4, 23.44, 11.7)),
  ];
}

/** Floor 1 entrance / floor 3 roof reference; floor 2 excludes this projection. */
export const ARCHITECTURAL_FLOOR_OUTLINE: ArchitecturalPoint[] = [
  [0, 0], [29.62, 0], [29.62, 24.25], [17.16, 24.25],
  [17.16, 31.15], [10.36, 31.15], [10.36, 24.25], [0, 24.25],
].map(([x, z]) => point(x, z));

// The user crossed out the front projection on the annotated floor-2 sheet.
const FLOOR_2_OUTLINE = rectangle(0, 0, 29.62, 24.25)
  .map(([x, z]) => point(x, z));
export function architecturalFloorOutline(floor: ArchitecturalFloor) {
  return floor === 2 ? FLOOR_2_OUTLINE : ARCHITECTURAL_FLOOR_OUTLINE;
}

export const ARCHITECTURAL_BOUNDS = {
  x: 0,
  z: 0,
  width: 29.62,
  depth: 31.15,
};

/** Only floor 2 has the labelled open atrium; floor 3 has a hall here. */
export const ARCHITECTURAL_ATRIUM: ArchitecturalPoint[] = rectangle(10.36, 11.7, 17.16, 21.55)
  .map(([x, z]) => point(x, z));

export const ARCHITECTURAL_REGIONS: ArchitecturalRegion[] = [
  // Floor 1. Room names intentionally remain neutral until the occupant is confirmed.
  region(1, "trai_sau", "Phòng phía trái · sau", "room", rectangle(0, 0, 8.2, 11.7), 90.5),
  region(1, "giua_sau", "Phòng giữa · phía sau", "room", rectangle(10.36, 0, 17.16, 9.4), 61),
  region(1, "phai_sau", "Phòng phía phải · sau", "room", rectangle(23.44, 0, 29.62, 9.4), 54),
  region(1, "trai_truoc", "Phòng phía trái · trước", "room", rectangle(0, 11.7, 8.2, 24.25), 97),
  region(1, "phai_truoc", "Phòng phía phải · trước", "room", [
    [23.44, 9.4], [27.52, 9.4], [27.52, 15.45], [29.62, 15.45],
    [29.62, 22.55], [27.52, 22.55], [27.52, 24.25], [19.32, 24.25],
    [19.32, 11.7], [23.44, 11.7],
  ], 124, [24.4, 18.5]),
  region(1, "sanh", "Sảnh chính", "hall", rectangle(8.2, 9.4, 19.32, 21.55), 127),
  region(1, "loi_vao", "Lối vào chính", "entrance", rectangle(10.36, 21.55, 17.16, 31.15)),
  region(1, "hanh_lang_trai", "Lối đi bên trái", "hall", rectangle(8.2, 0, 10.36, 9.4)),
  region(1, "hanh_lang_phai", "Lối đi bên phải", "hall", rectangle(17.16, 0, 19.32, 9.4)),
  region(1, "loi_vao_ben", "Lối vào bên hông", "entrance", rectangle(27.52, 9.4, 29.62, 15.45)),
  ...serviceCore(1),

  // Floor 2. The large right rear room wraps around the shared service core.
  region(2, "trai_sau", "Phòng phía trái · sau", "room", rectangle(0, 0, 8.2, 9.4), 73.6),
  region(2, "trai_giua", "Phòng phía trái · giữa", "room", rectangle(0, 9.4, 8.2, 15.45), 45),
  region(2, "trai_truoc", "Phòng phía trái · trước", "room", rectangle(0, 15.45, 8.2, 24.25), 68),
  region(2, "giua_sau", "Phòng giữa · phía sau", "room", rectangle(10.36, 0, 17.16, 9.4), 61),
  region(2, "phai_sau", "Phòng phía phải · sau", "room", [
    [23.44, 0], [29.62, 0], [29.62, 9.4], [27.52, 9.4],
    [27.52, 15.45], [19.32, 15.45], [19.32, 11.7], [23.44, 11.7],
  ], 95.4, [26.5, 5]),
  region(2, "phai_truoc", "Phòng phía phải · trước", "room", [
    [19.32, 15.45], [29.62, 15.45], [29.62, 22.55],
    [27.52, 22.55], [27.52, 24.25], [19.32, 24.25],
  ], 82, [24.2, 19.5]),
  region(2, "thong_tang", "Thông tầng", "atrium", rectangle(10.36, 11.7, 17.16, 21.55)),
  region(2, "hanh_lang_trai", "Hành lang bên trái", "hall", rectangle(8.2, 0, 10.36, 24.25)),
  region(2, "hanh_lang_phai", "Hành lang bên phải", "hall", rectangle(17.16, 0, 19.32, 24.25)),
  region(2, "hanh_lang_sau", "Hành lang phía sau", "hall", rectangle(10.36, 9.4, 17.16, 11.7)),
  region(2, "hanh_lang_truoc", "Hành lang phía trước", "hall", rectangle(10.36, 21.55, 17.16, 24.25)),
  ...serviceCore(2),

  // Floor 3. The source explicitly labels the central space SẢNH, not a garden.
  region(3, "trai_sau", "Phòng phía trái · sau", "room", rectangle(0, 0, 8.2, 6.6), 50),
  region(3, "trai_truoc", "Phòng phía trái · trước", "room", rectangle(0, 6.6, 8.2, 24.25), 140),
  region(3, "giua_sau", "Phòng giữa · phía sau", "room", rectangle(10.36, 0, 17.16, 9.4), 61),
  region(3, "phai", "Khu phòng phía phải", "room", [
    [23.44, 0], [29.62, 0], [29.62, 9.4], [26.4, 9.4],
    [26.4, 15.45], [29.62, 15.45], [29.62, 22.55], [27.52, 22.55],
    [27.52, 24.25], [19.32, 24.25], [19.32, 11.7], [23.44, 11.7],
  ], 179, [24.3, 19.5]),
  region(3, "sanh", "Sảnh tầng 3", "hall", rectangle(8.2, 9.4, 19.32, 17.35), 83),
  region(3, "hanh_lang_trai", "Lối đi bên trái", "hall", rectangle(8.2, 0, 10.36, 9.4)),
  region(3, "hanh_lang_phai", "Lối đi bên phải", "hall", rectangle(17.16, 0, 19.32, 9.4)),
  region(3, "phia_truoc", "Khu phía trước sảnh", "hall", rectangle(8.2, 17.35, 19.32, 21.55)),
  region(3, "mai_sanh", "Mái sảnh phía trước", "roof", rectangle(10.36, 21.55, 17.16, 31.15)),
  ...serviceCore(3),
];
