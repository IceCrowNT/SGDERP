import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canEnterRoom,roomDetailData,roomCameraScope,roomShortName} from '../../src/lib/office-3d/room-detail';
import {BUILDING_ROOMS} from '../../src/lib/office-3d/building-layout';
import {readBuildingNavigation,buildingUrl,parentBuildingNavigation} from '../../src/lib/office-3d/building-navigation';
import {KHDT_DESKS,KHDT_ROOM_KEY} from '../../src/lib/office-3d/khdt-layout';
import {placementError} from '../../src/lib/office-3d/placement';
import type {BuildingData} from '../../src/lib/office-3d/building-mapping';
const building:BuildingData={name:'Test',floors:[],rooms:[{key:KHDT_ROOM_KEY,locationId:76,name:'KHĐT',state:'active',description:null,path:'Tầng 2 / KHĐT'}],hcns:null,canManage:true,canViewEmployees:false,canViewAssets:true,canManageAssets:false,objects:[{id:2,roomKey:KHDT_ROOM_KEY,roomId:76,kind:'BAN',x:0,z:0,angle:0,version:'',locationVersion:'',point:{key:'object-2',name:'Bàn cũ',number:0,locationId:78,state:'active',description:null,equipment:[],assets:[]}}]};
test('room detail works without HCNS; permissions and linked object IDs stay intact',()=>{
 assert.equal(canEnterRoom(building,KHDT_ROOM_KEY),true);
 assert.equal(canEnterRoom(building,'plan_t2_trai_truoc'),false);
 const data=roomDetailData(building,KHDT_ROOM_KEY)!;
 assert.equal(data.points[0].locationId,78);assert.equal(data.canManageAssets,false);assert.equal(data.canViewEmployees,false);
 assert.equal(roomDetailData({...building,rooms:building.rooms.map(r=>({...r,state:'inactive'}))},KHDT_ROOM_KEY),null);
 assert.notEqual(roomCameraScope(KHDT_ROOM_KEY),roomCameraScope('t2_hcns_pc'));
});
test('room and asset URLs roundtrip; Escape walks asset, point, room, floor, building',()=>{
 let nav=readBuildingNavigation(new URLSearchParams(`room=${KHDT_ROOM_KEY}&mode=room&point=object-2&asset=7`));
 assert.equal(nav.detail,true);assert.equal(nav.floor,2);assert.equal(nav.asset,7);
 assert.deepEqual(readBuildingNavigation(new URLSearchParams(buildingUrl(nav).split('?')[1])),nav);
 nav=parentBuildingNavigation(nav);assert.equal(nav.asset,undefined);assert.equal(nav.point,'object-2');
 nav=parentBuildingNavigation(nav);assert.equal(nav.point,null);assert.equal(nav.detail,true);
 nav=parentBuildingNavigation(nav);assert.equal(nav.room,null);assert.equal(nav.floor,2);
 nav=parentBuildingNavigation(nav);assert.equal(nav.floor,'all');
 assert.equal(readBuildingNavigation(new URLSearchParams(`room=${KHDT_ROOM_KEY}&mode=room&point=hcns-01`)).point,null);
});
test('12 survey desks fit inside KHDT without overlap and keep stable numbering',()=>{
 assert.deepEqual(KHDT_DESKS.map(d=>d.number),Array.from({length:12},(_,i)=>i+1));
 for(const desk of KHDT_DESKS)assert.equal(placementError(KHDT_ROOM_KEY,desk,KHDT_DESKS.filter(o=>o!==desk)),null,`desk ${desk.number}`);
});
test('every physical room shares empty-room detail, object isolation and navigation',()=>{
 for (const shape of BUILDING_ROOMS.filter(r=>r.placed && r.kind==='room')) {
  const data:BuildingData={...building,rooms:[{key:shape.key,locationId:100,name:shape.name,state:'active',description:null,path:shape.name}],objects:[]};
  assert.equal(canEnterRoom(data,shape.key),true,shape.key);
  assert.deepEqual(roomDetailData(data,shape.key)?.points,[]);
  const object={...building.objects![0],roomKey:shape.key,roomId:100};
  const foreign={...object,id:3,roomKey:'unrelated-room',point:{...object.point,key:'object-3',locationId:999}};
  assert.deepEqual(roomDetailData({...data,objects:[object,foreign]},shape.key)?.points.map(p=>p.locationId),[78]);
  const nav={floor:shape.floor,room:shape.key,detail:true,point:null};
  assert.deepEqual(readBuildingNavigation(new URLSearchParams(buildingUrl(nav).split('?')[1])),nav);
  assert.deepEqual(parentBuildingNavigation(nav),{floor:shape.floor,room:null,detail:false,point:null});
  for(const state of ['unlinked','inactive'] as const) {
   assert.equal(canEnterRoom({...data,rooms:data.rooms.map(r=>({...r,state}))},shape.key),false);
  }
 }
});
test('room navigation uses compact titles across departments without changing stored names',()=>{
 assert.equal(roomShortName('plan_t2_giua_sau','Phòng Tổng Giám Đốc'),'Phòng Tổng Giám Đốc');
 assert.equal(roomShortName('t1_kd','Phòng Kinh Doanh'),'Phòng Kinh Doanh');
 assert.equal(roomShortName('plan_t1_trai_sau','Phòng Họp'),'Phòng Họp');
 assert.equal(roomShortName('plan_t1_giua_sau','Phòng Khánh Tiết'),'Phòng Khánh Tiết');
 assert.equal(roomShortName(KHDT_ROOM_KEY,'Phòng Kế hoạch Đầu tư'),'KHĐT');
 assert.equal(roomShortName('t2_hcns_pc','Phòng Hành Chính Tổng Hợp'),'HCNS');
});

test('old rear-bank URL resolves to the unified room',()=>{
 const nav=readBuildingNavigation(new URLSearchParams('floor=1&room=plan_t1_phai_sau&mode=room'));
 assert.deepEqual(nav,{floor:1,room:'plan_t1_phai_truoc',detail:true,point:null});
 assert.equal(buildingUrl(nav),'/office-3d?floor=1&room=plan_t1_phai_truoc&mode=room');
});
