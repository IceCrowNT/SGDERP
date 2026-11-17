import {test} from "node:test";
import assert from "node:assert/strict";
import {layoutEquipment, type EquipmentPlacement} from "../../src/lib/office-3d/equipment-layout";
import type {LocationAsset} from "../../src/lib/asset-location";

function asset(id:number,categoryCode:string):LocationAsset {
  return {id,categoryCode,category:categoryCode,name:`Device ${id}`,code:`TS-${id}`,condition:"BINH_THUONG",locationId:1,version:"1"};
}
function checkSurface(items:EquipmentPlacement[],width:number,depth:number) {
  const surface=items.filter(p=>p.position[1]>.5);
  for(const p of surface) {
    assert.ok(Math.abs(p.footprint.x)+p.footprint.width/2<=width/2);
    assert.ok(Math.abs(p.footprint.z)+p.footprint.depth/2<=depth/2);
    for(const other of surface.filter(o=>o!==p)) {
      const a=p.footprint,b=other.footprint;
      assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2 || Math.abs(a.z-b.z)>=(a.depth+b.depth)/2);
    }
  }
}
test("four different devices fit Minh's desk, PC faces the person, scan/AP remain visible",()=>{
  const assets=[asset(1,"PC"),asset(2,"PHONE"),asset(3,"AP"),asset(4,"SCN")];
  const placed=layoutEquipment({equipment:[],assets,width:2.3,depth:1});
  assert.equal(placed.filter(p=>p.part==="device").length,4);
  const pc=placed.find(p=>p.kind==="pc"&&p.part==="device")!;
  assert.ok(Math.abs(pc.footprint.x)<.05);
  assert.ok(pc.footprint.z>0);
  assert.ok(placed.some(p=>p.part==="pc-tower"&&p.position[1]<.1));
  checkSurface(placed,2.3,1);
});
test("5–6 small devices can fit; same types keep individual record identities",()=>{
  const assets=[asset(1,"PC"),asset(2,"LAPTOP"),asset(3,"AP"),asset(4,"PHONE"),asset(5,"AP"),asset(6,"UPS")];
  const placed=layoutEquipment({equipment:[],assets,width:2.3,depth:1});
  assert.deepEqual(placed.filter(p=>p.part==="device").map(p=>p.assetId).sort(),[1,2,3,4,5,6]);
  assert.equal(new Set(placed.map(p=>`${p.key}-${p.part}`)).size,placed.length);
  const ups=placed.find(p=>p.kind==="ups")!;
  assert.ok(ups.position[1]<.1 && Math.abs(ups.footprint.x)-ups.footprint.width/2>=.25);
  checkSurface(placed,2.3,1);
});
test("full tabletop does not shrink, overlap, or invent furniture; record order does not change packing",()=>{
  const assets=Array.from({length:6},(_,i)=>asset(i+1,"PRN"));
  const placed=layoutEquipment({equipment:[],assets,width:1.6,depth:.8});
  assert.equal(placed.length,2);
  assert.ok(placed.every(p=>p.scale===.75));
  assert.deepEqual(placed,layoutEquipment({equipment:[],assets:[...assets].reverse(),width:1.6,depth:.8}));
  assert.equal(assets.length,6);
  checkSurface(placed,1.6,.8);
});
test("equipment points keep UPS on their surface and empty/invalid dimensions create no devices",()=>{
  const placed=layoutEquipment({equipment:["ups"],width:.7,depth:.7,height:.12,desk:false});
  assert.equal(placed[0].position[1],.12);
  assert.deepEqual(layoutEquipment({equipment:["pc"],assets:[],width:1.6,depth:.8}),[]);
  assert.deepEqual(layoutEquipment({equipment:["pc"],width:NaN,depth:.8}),[]);
});
