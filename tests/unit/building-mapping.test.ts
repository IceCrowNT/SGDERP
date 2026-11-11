import test from "node:test";
import assert from "node:assert/strict";
import {
  BuildingMappingSchema,
  resolveBuilding,
  type BuildingLocation,
} from "../../src/lib/office-3d/building-mapping";
import {
  BUILDING_ROOMS,
  HCNS_BUILDING_KEY,
  HCNS_PLACEMENT,
} from "../../src/lib/office-3d/building-layout";
const mapping = {
  version: 1 as const,
  companyId: 1,
  buildingId: 10,
  floors: [{ floor: 2 as const, locationId: 20 }],
  rooms: [{ key: HCNS_BUILDING_KEY, locationId: 30 }],
};
const row = (
  id: number,
  parent_id: number | null,
  loai_vi_tri: string,
  changes: Partial<BuildingLocation> = {},
): BuildingLocation => ({
  id,
  parent_id,
  loai_vi_tri,
  company_id: 1,
  ten_vi_tri: `Location ${id}`,
  dang_su_dung: true,
  mo_ta: null,
  ...changes,
});
const rows = [
  row(10, null, "TOA_NHA"),
  row(20, 10, "TANG"),
  row(30, 20, "PHONG"),
  row(40, 30, "CHO_NGOI"),
];
test("building resolves exact IDs and active descendants, while unmapped geometry has no business data", () => {
  const result = resolveBuilding(mapping, [
    ...rows,
    row(41, 40, "CHO_NGOI"),
    row(42, 30, "KHU_VUC", { dang_su_dung: false }),
    row(43, 42, "CHO_NGOI"),
  ])!;
  assert.equal(result.rooms.length, 22);
  const room = result.rooms.find((r) => r.key === HCNS_BUILDING_KEY)!;
  assert.deepEqual([...room.locationIds].sort(), [30, 40, 41]);
  assert.equal(room.name, "Location 30");
  assert.equal(
    result.rooms.find((r) => r.key === "t2_chutich")?.row,
    undefined,
  );
});
test("renaming is reflected, but moving a room to a different floor removes its business binding", () => {
  const renamed = rows.map((r) =>
    r.id === 30 ? { ...r, ten_vi_tri: "Tên mới" } : r,
  );
  assert.equal(
    resolveBuilding(mapping, renamed)?.rooms.find(
      (r) => r.key === HCNS_BUILDING_KEY,
    )?.name,
    "Tên mới",
  );
  const moved = rows.map((r) => (r.id === 30 ? { ...r, parent_id: 21 } : r));
  const room = resolveBuilding(mapping, moved)?.rooms.find(
    (r) => r.key === HCNS_BUILDING_KEY,
  );
  assert.equal(room?.state, "unlinked");
  assert.equal(room?.description, null);
  assert.equal(room?.locationIds.size, 0);
});
test("foreign rows, inactive ancestry, changed types and deleted building never disclose occupants", () => {
  assert.equal(resolveBuilding({ ...mapping, companyId: 2 }, rows), null);
  assert.equal(
    resolveBuilding(
      mapping,
      rows.filter((r) => r.id !== 10),
    ),
    null,
  );
  const inactive = rows.map((r) =>
    r.id === 20 ? { ...r, dang_su_dung: false } : r,
  );
  const room = resolveBuilding(mapping, inactive)?.rooms.find(
    (r) => r.key === HCNS_BUILDING_KEY,
  );
  assert.equal(room?.state, "inactive");
  assert.equal(room?.locationIds.size, 0);
  const foreignRoom = rows.map((r) =>
    r.id === 30 ? { ...r, company_id: 2 } : r,
  );
  assert.equal(
    resolveBuilding(mapping, foreignRoom)?.rooms.find(
      (r) => r.key === HCNS_BUILDING_KEY,
    )?.state,
    "unlinked",
  );
  const invalidFloor = rows.map((r) =>
    r.id === 20 ? { ...r, loai_vi_tri: "PHONG" } : r,
  );
  assert.equal(
    resolveBuilding(mapping, invalidFloor)?.rooms.find(
      (r) => r.key === HCNS_BUILDING_KEY,
    )?.locationIds.size,
    0,
  );
});
test("mapping rejects ambiguous IDs, duplicated geometry and unknown keys", () => {
  assert.equal(BuildingMappingSchema.safeParse(mapping).success, true);
  assert.equal(
    BuildingMappingSchema.safeParse({
      ...mapping,
      rooms: [...mapping.rooms, ...mapping.rooms],
    }).success,
    false,
  );
  assert.equal(
    BuildingMappingSchema.safeParse({
      ...mapping,
      rooms: [{ key: "unknown", locationId: 30 }],
    }).success,
    false,
  );
  assert.equal(
    BuildingMappingSchema.safeParse({
      ...mapping,
      rooms: [{ key: HCNS_BUILDING_KEY, locationId: 20 }],
    }).success,
    false,
  );
});
test("HCNS uniform rotation fits its footprint without intersecting the adjacent stairwell", () => {
  const room = BUILDING_ROOMS.find((r) => r.key === HCNS_BUILDING_KEY)!;
  const stairs = BUILDING_ROOMS.find((r) => r.key === "t2_thang")!;
  assert.equal(HCNS_PLACEMENT.rotation, Math.PI / 2);
  assert.ok(14.8 * HCNS_PLACEMENT.scale <= room.width);
  assert.ok(9.6 * HCNS_PLACEMENT.scale <= room.depth);
  assert.ok(room.x + room.width / 2 < stairs.x - stairs.width / 2);
});
