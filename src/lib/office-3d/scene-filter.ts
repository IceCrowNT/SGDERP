import { BUILDING_ROOMS, HCNS_BUILDING_KEY, type FloorSelection } from "./building-layout";
import type { BuildingData } from "./building-mapping";
import { equipmentForAssets, type RoomPoint } from "./hcns-layout";
import { matchesSearchText } from "@/lib/search-text";

export type AssetSceneCategory = { code: string; name: string };
export type SceneLayers = { people: boolean; assets: boolean; category: AssetSceneCategory | null };
export const DEFAULT_SCENE_LAYERS: SceneLayers = { people: true, assets: true, category: null };
export type SceneSuggestion = { kind: "person" | "asset"; id: number; name: string; description: string };

export function sceneSuggestions(building: BuildingData, query: string) {
  if (!query.trim()) return { items: [] as SceneSuggestion[], more: false };
  const people: SceneSuggestion[] = building.canViewEmployees ? (building.searchPeople ?? []).map(p => ({
    kind: "person", id: p.id, name: p.name,
    description: [p.department, p.location ?? "Chưa gán vị trí"].filter(Boolean).join(" · "),
  })) : [];
  const assets: SceneSuggestion[] = building.canViewAssets ? building.rooms.filter(r => r.state === "active").flatMap(r => (r.assets ?? []).map(a => ({
    kind: "asset", id: a.id, name: a.name, description: `${a.code} · ${r.name} · ${a.location}`,
  }))) : [];
  const matches = [...people, ...assets].filter(item => matchesSearchText(`${item.name} ${item.description}`, query));
  return { items: matches.slice(0, 6), more: matches.length > 6 };
}

export function scopedRooms(building: BuildingData, floor: FloorSelection, room: string | null) {
  return building.rooms.filter(r => r.state === "active" && (room ? r.key === room
    : floor === "all" || BUILDING_ROOMS.find(s => s.key === r.key)?.floor === floor));
}

/** Only the rendering copy changes. Geometry, assignments and camera data stay intact. */
export function filterScene(building: BuildingData, layers: SceneLayers, floor: FloorSelection, room: string | null): BuildingData {
  if (layers.people && layers.assets && !layers.category) return building;
  const roomKeys = new Set(scopedRooms(building, floor, room).map(r => r.key));
  function point(p: RoomPoint, key: string): RoomPoint {
    const assets = building.canViewAssets && layers.assets && (!layers.category || roomKeys.has(key))
      ? p.assets?.filter(a => !layers.category || a.categoryCode === layers.category.code) ?? [] : [];
    const occupants = building.canViewEmployees && layers.people
      ? p.occupants ?? [] : [];
    return { ...p, layoutAssets: building.canViewAssets ? p.assets : [], assets, occupants, equipment: equipmentForAssets(assets) };
  }
  return { ...building,
    hcns: building.hcns ? { ...building.hcns, points: building.hcns.points.map(p => point(p, HCNS_BUILDING_KEY)) } : null,
    objects: building.objects?.map(o => ({ ...o, point: point(o.point, o.roomKey) })),
  };
}

export function personDestination(building: BuildingData, id: number) {
  if (!building.canViewEmployees) return null;
  const person = building.searchPeople?.find(p => p.id === id);
  if (!person) return null;
  const room = building.rooms.find(r => r.key === person.roomKey && r.state === "active");
  const shape = BUILDING_ROOMS.find(r => r.key === room?.key && r.placed);
  if (!room || !shape) return { person, navigation: null };
  // Recheck the anchor against current data, never guess by department/name.
  const anchor = building.objects?.find(o => o.roomKey === room.key && o.point.state === "active" && o.point.key === person.pointKey)
    ?? (room.key === HCNS_BUILDING_KEY && building.hcns?.points.find(p => p.key === person.pointKey && p.state === "active"));
  return { person, navigation: { floor: shape.floor, room: room.key,
    detail: room.key === HCNS_BUILDING_KEY && Boolean(building.hcns), point: anchor ? person.pointKey : null } };
}

export function assetDestination(building: BuildingData, id: number) {
  if (!building.canViewAssets) return null;
  const room = building.rooms.find(r => r.state === "active" && r.assets?.some(a => a.id === id));
  const asset = room?.assets?.find(a => a.id === id);
  const shape = BUILDING_ROOMS.find(r => r.key === room?.key && r.placed);
  if (!room || !asset) return null;
  if (!shape) return { asset, navigation: null };
  const anchor = building.objects?.find(o => o.roomKey === room.key && o.point.state === "active" && o.point.key === asset.pointKey)
    ?? (room.key === HCNS_BUILDING_KEY && building.hcns?.points.find(p => p.key === asset.pointKey && p.state === "active"));
  return { asset, navigation: { floor: shape.floor, room: room.key,
    detail: room.key === HCNS_BUILDING_KEY && Boolean(building.hcns), point: anchor ? asset.pointKey : null } };
}
