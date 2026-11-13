import { z } from "zod";
import { BUILDING_ROOMS, HCNS_BUILDING_KEY } from "./building-layout";
import { HCNS_LAYOUT, HCNS_PARTITION_Z } from "./hcns-layout";

export const PlacementSchema = z.object({
  roomKey: z.string().min(1).max(80),
  roomId: z.number().int().positive(),
  name: z.string().trim().min(1, "Nhập tên vị trí.").max(255),
  kind: z.enum(["BAN", "DIEM"]),
  x: z.number().finite().min(-100).max(100),
  z: z.number().finite().min(-100).max(100),
  angle: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  id: z.number().int().positive().optional(),
  version: z.string().datetime().optional(),
  locationVersion: z.string().datetime().optional(),
}).strict().refine(v => !v.id || (v.version && v.locationVersion), "Cần tải lại thông tin trước khi sửa.");
export type PlacementInput = z.infer<typeof PlacementSchema>;
export type PlacementShape = Pick<PlacementInput, "kind" | "x" | "z" | "angle">;
export type PlacementDraft = Omit<PlacementInput, "x" | "z"> & { point: { x: number; z: number } | null };
export const objectKey = (id: number) => `object-${id}`;
export const isObjectKey = (key: string | null): key is string => Boolean(key && /^object-[1-9]\d*$/.test(key));
export function placementSize(kind: PlacementShape["kind"]) { return kind === "BAN" ? [1.6, 0.8] as const : [0.7, 0.7] as const; }
type Rect = { x: number; z: number; width: number; depth: number };
function rectangle(v: PlacementShape): Rect {
  const [width, depth] = placementSize(v.kind);
  return { x: v.x, z: v.z, width: v.angle % 180 ? depth : width, depth: v.angle % 180 ? width : depth };
}
function inside(x: number, z: number, polygon: readonly (readonly number[])[]) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a, b] = polygon[i], [c, d] = polygon[j];
    if ((b > z) !== (d > z) && x < (c - a) * (z - b) / (d - b) + a) yes = !yes;
  }
  return yes;
}
function overlaps(a: Rect, b: Rect) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 0.1 && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + 0.1;
}
// Check the entire footprint, including concave corners, with a small wall clearance.
export function placementError(roomKey: string, value: PlacementShape, others: PlacementShape[] = []): string | null {
  const room = BUILDING_ROOMS.find(r => r.key === roomKey);
  if (!room?.placed || room.kind !== "room") return "Chỉ thêm vị trí trong phòng đã có mặt bằng.";
  if (![value.x, value.z].every(Number.isFinite)) return "Chọn điểm đặt trên mặt bằng.";
  const rect = rectangle(value);
  const left = rect.x - rect.width / 2 - 0.12, right = rect.x + rect.width / 2 + 0.12;
  const top = rect.z - rect.depth / 2 - 0.12, bottom = rect.z + rect.depth / 2 + 0.12;
  const polygon = room.outline;
  if (![[left, top], [left, bottom], [right, top], [right, bottom]].every(([x,z]) => inside(x,z,polygon)) ||
    polygon.some(([x,z]) => x > left && x < right && z > top && z < bottom))
    return "Đặt vật thể gọn bên trong phòng, cách tường một khoảng nhỏ.";
  if (roomKey === HCNS_BUILDING_KEY) {
    if (top < HCNS_PARTITION_Z + 0.15 && bottom > HCNS_PARTITION_Z - 0.15)
      return "Giữ trống vách ngăn và lối đi giữa hai khu vực HCNS.";
    if (HCNS_LAYOUT.some(s => overlaps(rect, { x:s.x, z:s.z, width:s.facingDegrees % 180 ? s.depth : s.width, depth:s.facingDegrees % 180 ? s.width : s.depth })))
      return "Vị trí này trùng với bàn đã có. Hãy dịch sang chỗ trống.";
  }
  if (others.some(v => overlaps(rect, rectangle(v)))) return "Vị trí này trùng với vật thể đã thêm. Hãy chọn chỗ khác.";
  return null;
}
