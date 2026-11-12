import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARCHITECTURAL_ATRIUM,
  ARCHITECTURAL_BOUNDS,
  architecturalFloorOutline,
  ARCHITECTURAL_REGIONS,
  type ArchitecturalPoint,
} from "../../src/lib/office-3d/architectural-layout";

// Independent ray-casting checks exercise concave room footprints as well as boxes.
function inside([x, z]: ArchitecturalPoint, polygon: ArchitecturalPoint[]) {
  let contained = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) {
      contained = !contained;
    }
  }
  return contained;
}

test("architectural footprints have unique identities and valid interior label anchors", () => {
  assert.equal(new Set(ARCHITECTURAL_REGIONS.map((region) => region.key)).size, ARCHITECTURAL_REGIONS.length);
  for (const region of ARCHITECTURAL_REGIONS) {
    assert.ok(region.bounds.width > 0 && region.bounds.depth > 0, region.key);
    assert.ok(inside(region.label, region.points), `${region.key}: label outside its room`);
    for (let i = 0; i < region.points.length; i++) {
      const a = region.points[i], b = region.points[(i + 1) % region.points.length];
      assert.ok(a.every(Number.isFinite));
      assert.ok((a[0] === b[0]) !== (a[1] === b[1]), `${region.key}: invalid edge`);
      assert.ok(Math.abs(a[0]) <= ARCHITECTURAL_BOUNDS.width / 2 + 1e-8);
      assert.ok(Math.abs(a[1]) <= ARCHITECTURAL_BOUNDS.depth / 2 + 1e-8);
    }
  }
});

test("source spaces do not overlap or spill outside their floor outline", () => {
  for (const floor of [1, 2, 3] as const) {
    const outline = architecturalFloorOutline(floor);
    const regions = ARCHITECTURAL_REGIONS.filter((region) => region.floor === floor);
    const points = [...outline, ...regions.flatMap((region) => region.points)];
    const xs = [...new Set(points.map(([x]) => x))].sort((a, b) => a - b);
    const zs = [...new Set(points.map(([, z]) => z))].sort((a, b) => a - b);
    // Every polygon is axis-aligned: these grid cells cover all possible overlaps.
    for (let i = 1; i < xs.length; i++) for (let j = 1; j < zs.length; j++) {
      const sample: ArchitecturalPoint = [(xs[i - 1] + xs[i]) / 2, (zs[j - 1] + zs[j]) / 2];
      const hits = regions.filter((region) => inside(sample, region.points));
      assert.ok(hits.length <= 1, `floor ${floor}: ${hits.map((hit) => hit.key).join(", ")} overlap`);
      if (hits.length) assert.ok(inside(sample, outline), `${hits[0].key} outside footprint`);
    }
  }
});

test("the crossed-out front projection is removed only from floor 2", () => {
  const projection: ArchitecturalPoint = [-1, 12];
  assert.ok(inside(projection, architecturalFloorOutline(1)));
  assert.equal(inside(projection, architecturalFloorOutline(2)), false);
  assert.ok(inside(projection, architecturalFloorOutline(3)));
  // The corridor in front of the atrium remains connected to both wings.
  assert.ok(inside([-1, 7], architecturalFloorOutline(2)));
});

test("floor 2 keeps its open atrium; floor 3 has a hall in the same area", () => {
  const atrium = ARCHITECTURAL_REGIONS.filter((region) => region.kind === "atrium");
  assert.equal(atrium.length, 1);
  assert.equal(atrium[0].floor, 2);
  assert.deepEqual(atrium[0].points, ARCHITECTURAL_ATRIUM);
  const floor3Hall = ARCHITECTURAL_REGIONS.find((region) => region.key === "plan_t3_sanh")!;
  assert.equal(floor3Hall.kind, "hall");
  assert.ok(inside(floor3Hall.label, ARCHITECTURAL_ATRIUM));
  assert.equal(ARCHITECTURAL_REGIONS.filter((region) => region.floor === 2 && region.kind === "room").length, 6);
});

test("relative room proportions use the shared source axes, not the old equal room grid", () => {
  const room = ARCHITECTURAL_REGIONS.find((region) => region.key === "plan_t2_trai_sau")!;
  assert.ok(Math.abs(room.bounds.width / room.bounds.depth - 8.2 / 9.4) < 1e-9);
  assert.equal(room.sourceAreaM2, 73.6);
  const sharedStairs = ARCHITECTURAL_REGIONS.filter((region) => region.kind === "stairs");
  assert.equal(sharedStairs.length, 3);
  assert.deepEqual(sharedStairs[0].points, sharedStairs[1].points);
  assert.deepEqual(sharedStairs[1].points, sharedStairs[2].points);
});
