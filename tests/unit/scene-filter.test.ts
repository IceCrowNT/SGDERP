import test from "node:test";
import assert from "node:assert/strict";
import { filterScene, personDestination, assetDestination, scopedRooms, sceneSuggestions, DEFAULT_SCENE_LAYERS } from "../../src/lib/office-3d/scene-filter";
import type { BuildingData } from "../../src/lib/office-3d/building-mapping";
import type { LocationAsset } from "../../src/lib/asset-location";
import { HCNS_BUILDING_KEY } from "../../src/lib/office-3d/building-layout";
import {layoutEquipment} from "../../src/lib/office-3d/equipment-layout";

function fixture(): BuildingData {
  const asset = (id:number, categoryCode:string):LocationAsset => ({id,name:categoryCode,code:`TS-${id}`,category:categoryCode,categoryCode,condition:"BINH_THUONG",locationId:100,version:"v1"});
  const point = {key:"hcns-01",number:1,name:"Bàn 1",state:"active" as const,description:null,locationId:100,equipment:["generic" as const],
    assets:[asset(1,"PHONE"),asset(2,"UPS"),asset(3,"PHONE")],occupants:[{id:1,name:"Nguyễn Văn A",position:null,department:"HCNS"}]};
  return {name:"Test",canManage:false,canViewAssets:true,canViewEmployees:true,floors:[{floor:2,name:"Tầng 2",state:"active"}],
    rooms:[{key:HCNS_BUILDING_KEY,name:"HCNS",state:"active",path:null,description:null},
      {key:"plan_t2_phai_truoc",name:"KHĐT",state:"active",path:null,description:null}],
    hcns:{name:"HCNS",path:"HCNS",canManage:false,canViewAssets:true,canViewEmployees:true,canManageAssets:false,canManageEmployees:false,points:[point]},
    objects:[{id:1,roomKey:"plan_t2_phai_truoc",roomId:20,kind:"BAN",x:1,z:2,angle:90,version:"v1",locationVersion:"v1",point:{...point,key:"object-1",locationId:200}}],
    searchPeople:[{id:1,name:"Nguyễn Văn A",department:"HCNS",location:"Bàn 1",roomKey:HCNS_BUILDING_KEY,pointKey:"hcns-01"},
      {id:2,name:"Nguyễn Văn A",department:"KHĐT",location:"Bàn mới",roomKey:"plan_t2_phai_truoc",pointKey:"object-1"},
      {id:3,name:"B",department:"HCNS",location:null,roomKey:null,pointKey:null}]};
}
test("filter actual category records before choosing geometry; keep desks and original assignments",()=>{
  const b=fixture(), before=structuredClone(b);
  const filtered=filterScene(b,{people:true,assets:true,category:{code:"PHONE",name:"Điện thoại"}},"all",null);
  assert.deepEqual(filtered.hcns!.points[0].assets!.map(a=>a.id),[1,3]);
  assert.deepEqual(filtered.hcns!.points[0].equipment,["phone"]);
  const originalPlacement=layoutEquipment({equipment:[],assets:b.hcns!.points[0].assets,width:1.6,depth:.8});
  const afterPlacement=layoutEquipment({equipment:[],assets:filtered.hcns!.points[0].layoutAssets,width:1.6,depth:.8});
  assert.deepEqual(afterPlacement,originalPlacement);
  assert.equal(filtered.hcns!.points[0].occupants!.length,1);
  assert.equal(filtered.objects!.length,b.objects!.length);
  assert.deepEqual(filtered.objects!.map(({kind,x,z,angle})=>({kind,x,z,angle})),b.objects!.map(({kind,x,z,angle})=>({kind,x,z,angle})));
  assert.equal(filtered.rooms,b.rooms);
  assert.deepEqual(b,before);
  assert.equal(filterScene(b,DEFAULT_SCENE_LAYERS,2,null),b);
});
test("category scope limits assets; layer toggles never hide the other layer outside the selected room",()=>{
  const b=fixture();
  const room=filterScene(b,{people:true,assets:false,category:null},2,HCNS_BUILDING_KEY);
  assert.equal(room.hcns!.points[0].occupants!.length,1);
  assert.equal(room.objects!.length,1);
  assert.equal(room.objects![0].point.occupants!.length,1);
  assert.equal(room.hcns!.points[0].equipment.length,0);
  const floor=filterScene(b,{people:false,assets:true,category:{code:"PHONE",name:"Phone"}},1,null);
  assert.equal(floor.hcns!.points[0].assets!.length,0);
  assert.equal(scopedRooms(b,1,null).length,0);
  assert.equal(filterScene(b,{people:false,assets:true,category:{code:"MISSING",name:"Missing"}},"all",null).hcns!.points[0].equipment.length,0);
  const category = filterScene(b, {people:true,assets:true,category:{code:"PHONE",name:"Phone"}},2,HCNS_BUILDING_KEY);
  assert.equal(category.objects![0].point.assets!.length,0);
  assert.equal(category.objects![0].point.occupants!.length,1);
  assert.equal(filterScene(b,{people:false,assets:true,category:null},2,HCNS_BUILDING_KEY).objects![0].point.assets!.length,3);
});
test("IDs distinguish duplicate names; unassigned, missing and stale anchors never invent a desk",()=>{
  const b=fixture();
  assert.equal(personDestination(b,1)!.navigation!.point,"hcns-01");
  assert.equal(personDestination(b,2)!.navigation!.point,"object-1");
  assert.equal(personDestination(b,2)!.navigation!.detail,false);
  assert.equal(personDestination(b,3)!.navigation,null);
  b.objects=[];
  assert.equal(personDestination(b,2)!.navigation!.point,null);
  b.rooms[1].state="unlinked";
  assert.equal(personDestination(b,2)!.navigation,null);
});
test("no HR or ASSETS visibility means no corresponding search destination or filtered objects",()=>{
  const b=fixture();b.canViewEmployees=false;b.canViewAssets=false;
  assert.equal(personDestination(b,1),null);
  assert.equal(filterScene(b,{people:true,assets:false,category:null},"all",null).hcns!.points[0].occupants!.length,0);
  assert.equal(filterScene(b,{people:false,assets:true,category:{code:"PHONE",name:"Phone"}},"all",null).hcns!.points[0].assets!.length,0);
  assert.deepEqual(filterScene(b,{people:false,assets:true,category:null},"all",null).hcns!.points[0].layoutAssets,[]);
});

test("independent layer combinations retain desk geometry and do not mutate business records", () => {
  for (const people of [true, false]) for (const assets of [true, false]) {
    const b = fixture();
    const result = filterScene(b, {people,assets,category:null}, "all", null);
    assert.equal(result.hcns!.points[0].occupants!.length, people ? 1 : 0);
    assert.equal(result.hcns!.points[0].assets!.length, assets ? 3 : 0);
    assert.equal(result.objects![0].point.occupants!.length, people ? 1 : 0);
    assert.equal(result.objects![0].point.assets!.length, assets ? 3 : 0);
    assert.equal(result.objects![0].kind, "BAN");
    assert.deepEqual(result.objects!.map(o => [o.x,o.z,o.angle]), [[1,2,90]]);
    assert.equal(b.hcns!.points[0].assets!.length, 3);
  }
});
test("suggestions require input, match accents/codes, cap results and omit commands", () => {
  const b = fixture();
  b.rooms[0].assets = [{id:10,name:"Điện thoại bàn",code:"TS-000010",category:"Điện thoại",categoryCode:"PHONE",condition:"BINH_THUONG",location:"Bàn 1",pointKey:"hcns-01"}];
  assert.deepEqual(sceneSuggestions(b, "  "), {items:[],more:false});
  assert.deepEqual(sceneSuggestions(b, "nguyen van").items.map(p => p.id), [1,2]);
  assert.equal(sceneSuggestions(b, "dien thoai").items[0].kind, "asset");
  assert.equal(sceneSuggestions(b, "TS-000010").items[0].id, 10);
  assert.equal(sceneSuggestions(b, "Tất cả đối tượng").items.length, 0);
  b.searchPeople = Array.from({length:9}, (_,i) => ({...b.searchPeople![0],id:i+1}));
  assert.equal(sceneSuggestions(b, "nguyen").items.length, 6);
  assert.equal(sceneSuggestions(b, "nguyen").more, true);
  b.canViewEmployees=false; b.canViewAssets=false;
  assert.equal(sceneSuggestions(b, "nguyen").items.length,0);
  assert.equal(sceneSuggestions(b, "dien thoai").items.length,0);
});
test("asset lookup respects permissions and stale anchors, keeps unmapped rooms out", () => {
  const b = fixture();
  b.rooms[0].assets = [{id:10,name:"PC",code:"TS-10",category:"PC",categoryCode:"PC",condition:"BINH_THUONG",location:"Bàn 1",pointKey:"hcns-01"}];
  assert.equal(assetDestination(b,10)!.navigation!.point,"hcns-01");
  b.hcns!.points=[];
  assert.equal(assetDestination(b,10)!.navigation!.point,null);
  b.rooms[0].key="t1_letan";
  assert.equal(assetDestination(b,10)!.navigation,null);
  b.rooms[0].state="inactive";
  assert.equal(assetDestination(b,10),null);
  assert.equal(sceneSuggestions(b,"PC").items.length,0);
  b.rooms[0].state="active"; b.canViewAssets=false;
  assert.equal(assetDestination(b,10),null);
});
