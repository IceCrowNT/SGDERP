import {
  BUILDING_ROOMS,
  HCNS_BUILDING_KEY,
  HCNS_PLACEMENT,
  type FloorSelection,
} from "./building-layout";
import { HCNS_LAYOUT } from "./hcns-layout";
import { isObjectKey } from "./placement";

export type BuildingNavigation = {
  floor: FloorSelection;
  room: string | null;
  detail: boolean;
  point: string | null;
};
export function readBuildingNavigation(
  query: Pick<URLSearchParams, "get">,
): BuildingNavigation {
  const room = BUILDING_ROOMS.find((r) => r.key === query.get("room"));
  const floor = query.get("floor");
  const detail =
    room?.key === HCNS_BUILDING_KEY && query.get("mode") === "room";
  return {
    floor:
      room?.floor ??
      (floor === "1" ? 1 : floor === "2" ? 2 : floor === "3" ? 3 : "all"),
    room: room?.key ?? null,
    detail,
    point: room && isObjectKey(query.get("point")) ? query.get("point") : detail
      ? (HCNS_LAYOUT.find((p) => p.key === query.get("point"))?.key ??
        "hcns-01")
      : null,
  };
}
export function buildingUrl(view: BuildingNavigation) {
  const query = new URLSearchParams();
  if (view.floor !== "all") query.set("floor", String(view.floor));
  if (view.room) query.set("room", view.room);
  if (view.room && isObjectKey(view.point)) query.set("point", view.point);
  if (view.detail) {
    query.set("mode", "room");
    if (view.point) query.set("point", view.point);
  }
  return `/office-3d${query.size ? `?${query}` : ""}`;
}
export const HCNS_URL = buildingUrl({
  floor: 2,
  room: HCNS_BUILDING_KEY,
  detail: true,
  point: "hcns-01",
});

// Use the same transform as the embedded model for camera targets and hit labels.
export function hcnsWorldPoint(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const room = BUILDING_ROOMS.find((r) => r.key === HCNS_BUILDING_KEY)!;
  const { scale, rotation } = HCNS_PLACEMENT;
  return [
    room.x + scale * (Math.cos(rotation) * x + Math.sin(rotation) * z),
    0.28 + scale * y,
    room.z + scale * (-Math.sin(rotation) * x + Math.cos(rotation) * z),
  ];
}
