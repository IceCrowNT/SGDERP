import test from "node:test";
import assert from "node:assert/strict";
import { PlacementSchema, placementError } from "../../src/lib/office-3d/placement";
import { BUILDING_ROOMS, HCNS_BUILDING_KEY } from "../../src/lib/office-3d/building-layout";
import { HCNS_LAYOUT, HCNS_PARTITION_Z } from "../../src/lib/office-3d/hcns-layout";
import { buildingUrl, readBuildingNavigation } from "../../src/lib/office-3d/building-navigation";
const room=BUILDING_ROOMS.find(r=>r.kind==="room"&&r.key!==HCNS_BUILDING_KEY)!;
const point={kind:"BAN" as const,x:0,z:0,angle:0 as const};
test("strict placement input rejects incomplete, invalid angles and non-finite coordinates",()=>{
  const value={...point,roomKey:room.key,roomId:1,name:"Bàn mới"};
  assert.equal(PlacementSchema.safeParse(value).success,true);
  for(const extra of [{x:NaN},{x:Infinity},{angle:45},{name:" "},{companyId:2},{id:1}])
    assert.equal(PlacementSchema.safeParse({...value,...extra}).success,false);
});
test("footprints must fit rooms; obstacles, rotation and HCNS partition are checked",()=>{
  assert.equal(placementError(room.key,point),null);
  assert.ok(placementError(room.key,{...point,x:room.width/2}));
  assert.ok(placementError(room.key,point,[{...point,x:.2}]));
  assert.equal(placementError(room.key,point,[{...point,x:2}]),null);
  const desk=HCNS_LAYOUT[0];
  assert.ok(placementError(HCNS_BUILDING_KEY,{...point,x:desk.x,z:desk.z}));
  assert.ok(placementError(HCNS_BUILDING_KEY,{...point,x:0,z:HCNS_PARTITION_Z}));
  assert.ok(placementError(BUILDING_ROOMS.find(r=>r.kind==="atrium")!.key,point));
  assert.ok(placementError("missing",point));
  const nearWall={...point,x:room.width/2-.65};
  assert.ok(placementError(room.key,nearWall));
  assert.equal(placementError(room.key,{...nearWall,angle:90}),null);
});
test("dynamic selection survives URL reload for ordinary rooms and HCNS",()=>{
  for(const key of [room.key,HCNS_BUILDING_KEY]) {
    const shape=BUILDING_ROOMS.find(r=>r.key===key)!;
    const state={floor:shape.floor,room:key,detail:key===HCNS_BUILDING_KEY,point:"object-123"};
    assert.deepEqual(readBuildingNavigation(new URL(buildingUrl(state),"http://local").searchParams),state);
  }
  assert.equal(readBuildingNavigation(new URLSearchParams("room=missing&point=object-123")).point,null);
});
