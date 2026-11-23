import { BUILDING_ROOMS, isManageableSpace, HCNS_BUILDING_KEY, compactRoomName } from "./building-layout";
import type { BuildingData } from "./building-mapping";
import type { RoomDetailData } from "./hcns-layout";

/** Room capability depends on the physical link, never on its department/name. */
export function canEnterRoom(building: BuildingData, key: string | null | undefined) {
  const shape = BUILDING_ROOMS.find(r => r.key === key);
  return Boolean(isManageableSpace(shape) &&
    building.rooms.some(r => r.key === key && r.state === "active" && r.locationId));
}
export function roomDetailData(building: BuildingData, key: string | null): RoomDetailData | null {
  if (!canEnterRoom(building, key)) return null;
  const room = building.rooms.find(r => r.key === key)!;
  return { name: room.name, path: room.path ?? room.name,
    points: (building.objects ?? []).filter(o => o.roomKey === key).map(o => o.point),
    canManage: building.canManage, canViewEmployees: building.canViewEmployees,
    canManageEmployees: Boolean(building.canManageEmployees), canViewAssets: building.canViewAssets,
    canManageAssets: Boolean(building.canManageAssets) };
}
export function roomShortName(key: string | null, name?: string) {
  return key === HCNS_BUILDING_KEY ? "HCNS" : compactRoomName(name ?? BUILDING_ROOMS.find(r => r.key === key)?.name ?? "Phòng");
}
export const roomCameraScope = (key: string | null) => `room:${key}`;
