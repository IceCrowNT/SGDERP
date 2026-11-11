import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildingUrl,
  readBuildingNavigation,
  hcnsWorldPoint,
  HCNS_URL,
} from "../../src/lib/office-3d/building-navigation";
import { HCNS_LAYOUT } from "../../src/lib/office-3d/hcns-layout";
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
