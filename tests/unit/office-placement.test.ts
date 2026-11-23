import { HCNS_LAYOUT } from "../../prisma/data/hcns-survey";
import test from "node:test";
import assert from "node:assert/strict";
import { PlacementSchema, placementError, placementSize } from "../../src/lib/office-3d/placement";
import { BUILDING_ROOMS, HCNS_BUILDING_KEY } from "../../src/lib/office-3d/building-layout";
import {  HCNS_PARTITION_Z } from "../../src/lib/office-3d/hcns-layout";
import { buildingUrl, readBuildingNavigation } from "../../src/lib/office-3d/building-navigation";
const room=BUILDING_ROOMS.find(r=>r.kind==="room"&&r.key!==HCNS_BUILDING_KEY)!;
const point={kind:"BAN" as const,x:0,z:0,angle:0 as const};
test("executive desk uses a larger footprint, rotates and rejects use as an equipment point",()=>{
  const desk={...point,roomKey:room.key,roomId:1,name:"Bàn Tổng giám đốc",model:"BAN_TONG_GIAM_DOC" as const};
  assert.equal(PlacementSchema.safeParse(desk).success,true);
  assert.equal(PlacementSchema.safeParse({...desk,kind:"DIEM"}).success,false);
  assert.deepEqual(placementSize(desk),[2.4,1.2]);
  assert.deepEqual(placementSize({...desk,width:2.6,depth:1.4}),[2.6,1.4]);
  const nearWall={...desk,x:room.width/2-.8};
  assert.ok(placementError(room.key,nearWall));
  assert.equal(placementError(room.key,{...nearWall,angle:90}),null);
  assert.equal(placementError(room.key,point,[{...point,x:1.9}]),null);
  assert.ok(placementError(room.key,desk,[{...point,x:1.9}]));
  assert.deepEqual(placementSize(point),[1.6,.8]);
});
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
  assert.ok(placementError(HCNS_BUILDING_KEY,{...point,x:desk.x,z:desk.z},[{...point,x:desk.x,z:desk.z,width:desk.width,depth:desk.depth}]));
  assert.equal(placementError(HCNS_BUILDING_KEY,{...point,x:desk.x,z:desk.z}),null); // No invisible hardcoded obstacle.
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

test("all migrated HCNS dimensions validate, including close desk pairs",()=>{
  const shapes=HCNS_LAYOUT.map(s=>({kind:"BAN" as const,x:s.x,z:s.z,angle:s.facingDegrees,width:s.width,depth:s.depth}));
  for(const shape of shapes) assert.equal(placementError(HCNS_BUILDING_KEY,shape,shapes.filter(s=>s!==shape)),null);
  const full={...point,roomKey:room.key,roomId:1,name:"Bàn"};
  for(const dimensions of [{width:0},{depth:NaN},{width:11}]) assert.equal(PlacementSchema.safeParse({...full,...dimensions}).success,false);
});

test("open reception supports a counter but no arbitrary oversized footprint",()=>{
  const reception={...point,roomKey:"t1_letan",roomId:64,name:"Lễ Tân",model:"QUAY_LE_TAN" as const,angle:180 as const,locationId:64,locationVersion:new Date().toISOString()};
  assert.equal(PlacementSchema.safeParse(reception).success,true);
  assert.equal(placementError(reception.roomKey,reception),null);
  assert.ok(placementError(reception.roomKey,{...reception,width:8}));
  assert.equal(PlacementSchema.safeParse({...reception,kind:"DIEM"}).success,false);
  assert.equal(PlacementSchema.safeParse({...reception,locationVersion:undefined}).success,false);
  const nav={floor:1 as const,room:"t1_letan",detail:true,point:"object-123"};
  assert.deepEqual(readBuildingNavigation(new URLSearchParams(buildingUrl(nav).split('?')[1])),nav);
});
