import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RoomMappingSchema,
  mappedRoomPoints,
  type MappedLocation,
} from "../../src/lib/office-3d/room-mapping";
import {
  HCNS_LAYOUT,
  equipmentForAssets,
} from "../../src/lib/office-3d/hcns-layout";
const mapping = {
  version: 1 as const,
  companyId: 4,
  roomId: 9,
  points: HCNS_LAYOUT.map((s, i) => ({ key: s.key, locationId: i + 20 })),
};
const row: MappedLocation = {
  id: 20,
  company_id: 4,
  parent_id: 9,
  ten_vi_tri: "Chỗ cạnh cửa",
  mo_ta: "Thiết bị theo sơ đồ: 1 PC, 1 laptop.",
  dang_su_dung: true,
};

test("mapping requires ten distinct stable objects and locations, not a room as a seat", () => {
  assert.equal(RoomMappingSchema.safeParse(mapping).success, true);
  for (const invalid of [
    { ...mapping, points: mapping.points.slice(1) },
    {
      ...mapping,
      points: mapping.points.map((p, i) => (i === 9 ? mapping.points[0] : p)),
    },
    {
      ...mapping,
      points: mapping.points.map((p, i) =>
        i === 0 ? { ...p, key: "unknown" } : p,
      ),
    },
    {
      ...mapping,
      points: mapping.points.map((p, i) =>
        i === 0 ? { ...p, locationId: 9 } : p,
      ),
    },
    {
      ...mapping,
      points: mapping.points.map((p, i) =>
        i === 0 ? { ...p, locationId: 0 } : p,
      ),
    },
  ])
    assert.equal(RoomMappingSchema.safeParse(invalid).success, false);
});
test("renaming a location preserves its binding and the notes come from current data", () => {
  const point = mappedRoomPoints(mapping, [row])[0];
  assert.equal(point.name, "Chỗ cạnh cửa");
  assert.equal(point.locationId, row.id);
  assert.deepEqual(point.equipment, []);
  assert.equal(point.description, row.mo_ta);
  const updated = mappedRoomPoints(mapping, [
    { ...row, ten_vi_tri: "Bàn mới", mo_ta: "Máy in" },
  ])[0];
  assert.equal(updated.key, point.key);
  assert.equal(updated.name, "Bàn mới");
  assert.deepEqual(updated.equipment, []);
  assert.equal(updated.description, "Máy in");
});
test("missing, moved and foreign locations never expose their notes or equipment", () => {
  for (const rows of [
    [],
    [{ ...row, parent_id: 10 }],
    [{ ...row, company_id: 5 }],
    [{ ...row, id: 777 }],
  ]) {
    const point = mappedRoomPoints(mapping, rows)[0];
    assert.equal(point.state, "unlinked");
    assert.equal(point.locationId, undefined);
    assert.equal(point.description, null);
    assert.deepEqual(point.equipment, []);
  }
});
test("inactive positions remain identified but do not display active equipment", () => {
  const point = mappedRoomPoints(mapping, [{ ...row, dang_su_dung: false }])[0];
  assert.equal(point.state, "inactive");
  assert.equal(point.name, row.ten_vi_tri);
  assert.deepEqual(point.equipment, []);
});
test("device representatives use real asset categories; unknown types remain visible and duplicate types do not imply quantities", () => {
  assert.deepEqual(equipmentForAssets([]), []);
  assert.deepEqual(equipmentForAssets([
    { categoryCode: "PC", category: "Máy tính để bàn" },
    { categoryCode: "PC", category: "Máy tính để bàn" },
    { categoryCode: "OTHER", category: "Thiết bị khác" },
    { categoryCode: "LAPTOP", category: "Máy tính xách tay" },
  ]), ["pc", "generic", "laptop"]);
  const point = mappedRoomPoints(mapping, [{ ...row, mo_ta: null }])[0];
  assert.equal(point.state, "active");
  assert.equal(point.description, null);
});
