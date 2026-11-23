import { z } from "zod";
import { BUILDING_ROOMS, isManageableSpace, isDirectWorkPoint } from "./building-layout";
import { resolveBuilding, type BuildingMapping, type BuildingLocation } from "./building-mapping";

export const RoomLinkSchema = z.object({
  roomKey: z.string().min(1).max(80),
  locationId: z.number().int().positive("Chọn vị trí phòng cần liên kết."),
}).strict();
export type RoomLinkInput = z.infer<typeof RoomLinkSchema>;

export class RoomLinkError extends Error {}

export function roomLinkOptions(mapping: BuildingMapping, rows: BuildingLocation[], key: string) {
  const shape = BUILDING_ROOMS.find(r => r.key === key && isManageableSpace(r));
  if (!shape) throw new RoomLinkError("Chỉ liên kết phòng đã có mặt bằng.");
  const resolved = resolveBuilding(mapping, rows);
  const floor = resolved?.floors.find(f => f.floor === shape.floor);
  if (!floor?.row || floor.state !== "active") throw new RoomLinkError("Tầng chưa được liên kết hoặc đã ngừng sử dụng. Cần thiết lập tầng trước.");
  if (mapping.rooms.some(r => r.key === key)) throw new RoomLinkError("Phòng đã có liên kết. Hãy tải lại mô hình.");
  const used = new Set(mapping.rooms.map(r => r.locationId));
  return { floorName: floor.name, rooms: rows.filter(r =>
    r.company_id === mapping.companyId && r.parent_id === floor.row!.id &&
    (["PHONG","KHU_VUC"].includes(r.loai_vi_tri) || (shape.kind === "reception" && isDirectWorkPoint(r.loai_vi_tri))) && r.dang_su_dung && !used.has(r.id),
  ).map(r => ({ id: r.id, name: r.ten_vi_tri })) };
}
