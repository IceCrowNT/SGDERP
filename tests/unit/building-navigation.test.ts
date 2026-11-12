import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildingUrl,
  readBuildingNavigation,
  hcnsWorldPoint,
  HCNS_URL,
} from "../../src/lib/office-3d/building-navigation";
import {
  HCNS_LAYOUT,
  HCNS_PARTITION_Z,
  HCNS_CONNECTING_DOOR,
  personRoomPosition,
} from "../../src/lib/office-3d/hcns-layout";
import {
  BUILDING_ROOMS,
  HCNS_BUILDING_KEY,
  HCNS_PLACEMENT,
} from "../../src/lib/office-3d/building-layout";

test("deep links round trip the room and selected point; room determines its floor", () => {
  const query = new URLSearchParams(
    "floor=1&room=t2_hcns_pc&mode=room&point=hcns-07",
  );
  const view = readBuildingNavigation(query);
  assert.deepEqual(view, {
    floor: 2,
    room: HCNS_BUILDING_KEY,
    detail: true,
    point: "hcns-07",
  });
  assert.deepEqual(
    readBuildingNavigation(
      new URL(buildingUrl(view), "http://localhost").searchParams,
    ),
    view,
  );
  assert.equal(
    readBuildingNavigation(new URL(HCNS_URL, "http://localhost").searchParams)
      .point,
    "hcns-01",
  );
});
test("unknown rooms, invalid points and unsupported detail modes cannot create phantom selections", () => {
  assert.deepEqual(
    readBuildingNavigation(
      new URLSearchParams("floor=99&room=unknown&mode=room&point=hcns-99"),
    ),
    { floor: "all", room: null, detail: false, point: null },
  );
  assert.equal(
    readBuildingNavigation(new URLSearchParams("room=t1_kd&mode=room")).detail,
    false,
  );
  assert.equal(
    readBuildingNavigation(
      new URLSearchParams("room=t2_hcns_pc&mode=room&point=missing"),
    ).point,
    "hcns-01",
  );
});
test("all transformed desk anchors stay inside HCNS and preserve relative distances", () => {
  const room = BUILDING_ROOMS.find((r) => r.key === HCNS_BUILDING_KEY)!;
  for (const slot of HCNS_LAYOUT) {
    const [x, y, z] = hcnsWorldPoint(slot.x, 1.4, slot.z);
    assert.ok(Math.abs(x - room.x) < room.width / 2);
    assert.ok(Math.abs(z - room.z) < room.depth / 2);
    assert.ok(y > 0.28);
  }
  const a = hcnsWorldPoint(0, 0, 0),
    b = hcnsWorldPoint(3, 0, 4);
  assert.ok(
    Math.abs(Math.hypot(b[0] - a[0], b[2] - a[2]) - 5 * HCNS_PLACEMENT.scale) <
      1e-9,
  );
});

test("desk corners and occupant footprints stay inside HCNS, clear of the service-core notch", () => {
  const room = BUILDING_ROOMS.find((r) => r.key === HCNS_BUILDING_KEY)!;
  const polygon = room.outline.map(([x, z]) => [x + room.x, z + room.z]);
  function inside(x: number, z: number) {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[i], [bx, bz] = polygon[j];
      if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax)
        result = !result;
    }
    return result;
  }
  assert.equal(HCNS_LAYOUT.length, 10);
  for (const slot of HCNS_LAYOUT) {
    const angle = slot.facingDegrees * Math.PI / 180;
    for (const x of [-slot.width / 2, slot.width / 2])
      for (const z of [-slot.depth / 2, slot.depth / 2]) {
        const [worldX, , worldZ] = hcnsWorldPoint(
          slot.x + Math.cos(angle) * x + Math.sin(angle) * z, 0,
          slot.z - Math.sin(angle) * x + Math.cos(angle) * z,
        );
        assert.ok(inside(worldX, worldZ), `${slot.key}: desk outside room`);
      }
    for (let index = 0; index < 3; index++) {
      const [x, y, z] = personRoomPosition(slot, index, 3);
      for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) {
        const [worldX, , worldZ] = hcnsWorldPoint(x + dx, y, z + dz);
        assert.ok(inside(worldX, worldZ), `${slot.key}: person outside room`);
      }
    }
  }
});

test("corridor entrance zone contains only desk 01; all other desks are beyond the connecting door", () => {
  assert.deepEqual(
    HCNS_LAYOUT.filter((desk) => desk.z > HCNS_PARTITION_Z).map((desk) => desk.key),
    ["hcns-01"],
  );
  for (const desk of HCNS_LAYOUT) {
    const angle = desk.facingDegrees * Math.PI / 180;
    const halfX = Math.abs(Math.cos(angle)) * desk.width / 2
      + Math.abs(Math.sin(angle)) * desk.depth / 2;
    const halfZ = Math.abs(Math.sin(angle)) * desk.width / 2
      + Math.abs(Math.cos(angle)) * desk.depth / 2;
    assert.ok(desk.key === "hcns-01"
      ? desk.z - halfZ > HCNS_PARTITION_Z
      : desk.z + halfZ < HCNS_PARTITION_Z, `${desk.key} straddles the partition`);
    const blocksDoorApproach = desk.x + halfX > HCNS_CONNECTING_DOOR.minX
      && desk.x - halfX < HCNS_CONNECTING_DOOR.maxX
      && desk.z + halfZ > HCNS_PARTITION_Z - 0.6
      && desk.z - halfZ < HCNS_PARTITION_Z + 0.6;
    assert.equal(blocksDoorApproach, false, `${desk.key} blocks the connecting door`);
  }
});
