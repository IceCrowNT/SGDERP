"use client";
import type { EquipmentKind } from "@/lib/office-3d/hcns-layout";
import { useMemo, useState } from "react";
import { useCursor } from "@react-three/drei";
import { Shape } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BUILDING_ROOMS, floorElevation, HCNS_BUILDING_KEY, type FloorSelection } from "@/lib/office-3d/building-layout";
import { placementSize, placementError, type PlacementDraft } from "@/lib/office-3d/placement";
import type { PlacedObject } from "@/lib/office-3d/building-mapping";
import { OfficePerson } from "../hcns/OfficePerson";
import { Desk, EquipmentDisplay } from "../hcns/RoomFurniture";

export function PlacedObjects({ objects,floor,detail,selected,person,onPerson,onSelect,onFocusPoint,onEquipment,activeEquipment,draft,onPlace }: {
  objects:PlacedObject[];floor:FloorSelection;detail:boolean;selected:string|null;
  person:number|null;onPerson:(key:string,id:number)=>void;
  onSelect:(key:string)=>void;
  onFocusPoint:(key:string)=>void;
  onEquipment:(key:string,kind:EquipmentKind,focus:boolean)=>void; activeEquipment?:EquipmentKind;draft:PlacementDraft|null;onPlace:(x:number,z:number)=>void;
}) {
  const room = BUILDING_ROOMS.find(r=>r.key===draft?.roomKey);
  const [hovered,setHovered]=useState<string|null>(null);
  useCursor(Boolean(hovered)&&!draft);
  const surface = useMemo(()=>{
    const s=new Shape();room?.outline.forEach(([x,z],i)=>i ? s.lineTo(x,-z):s.moveTo(x,-z));if(room?.outline.length)s.closePath();return s;
  },[room]);
  function place(e:ThreeEvent<MouseEvent>) {
    e.stopPropagation();if(!room)return;
    onPlace(Number((e.point.x-room.x).toFixed(2)),Number((e.point.z-room.z).toFixed(2)));
  }
  const invalid=draft?.point ? placementError(draft.roomKey,{...draft,...draft.point},objects.filter(o=>o.roomKey===draft.roomKey&&o.id!==draft.id)) : null;
  return <>
    {objects.map(o=>{
      const r=BUILDING_ROOMS.find(r=>r.key===o.roomKey);
      if (!r || (floor!=="all"&&floor!==r.floor) || (detail&&o.roomKey!==HCNS_BUILDING_KEY) || draft?.id===o.id) return null;
      const active=selected===o.point.key||hovered===o.point.key;
      return <group key={o.id} position={[r.x+o.x,floorElevation(r.floor,floor)+.28,r.z+o.z]} rotation={[0,o.angle*Math.PI/180,0]}
        userData={{objectKey:o.point.key}}
        onPointerOver={e=>{if(!draft){e.stopPropagation();setHovered(o.point.key);}}} onPointerOut={()=>setHovered(null)}
        onDoubleClick={e=>{e.stopPropagation();if(!draft && e.button===0 && e.delta<5)onFocusPoint(o.point.key);}}
        onClick={e=>{e.stopPropagation();if(!draft && e.button===0 && e.delta<5)onSelect(o.point.key);}}>
        {o.kind === "BAN" ? <Desk width={1.6} depth={.8} equipment={o.point.equipment} selected={active} activeEquipment={selected===o.point.key ? activeEquipment : undefined} onEquipment={!draft ? (kind,focus)=>onEquipment(o.point.key,kind,focus) : undefined}/> : <>
          <mesh position={[0,.06,0]}><cylinderGeometry args={[.35,.35,.12,20]}/><meshStandardMaterial color={active ? "#c44c37":"#789cae"}/></mesh>
          <EquipmentDisplay equipment={o.point.equipment} width={.7} depth={.7} height={.12} activeEquipment={selected===o.point.key ? activeEquipment : undefined} onEquipment={!draft ? (kind,focus)=>onEquipment(o.point.key,kind,focus) : undefined} />
        </>}
        {(o.point.occupants ?? []).slice().sort((a,b)=>Number(b.id===person)-Number(a.id===person)).slice(0,3).map((p,index,people)=><group key={p.id}
          position={[(index-(people.length-1)/2)*.5,0,o.kind==="BAN" ? .85:.6]} userData={{personId:p.id}}
          onClick={e=>{e.stopPropagation();if(!draft && e.button===0 && e.delta<5)onPerson(o.point.key,p.id);}}>
          <OfficePerson selected={selected===o.point.key&&person===p.id}/>
        </group>)}
        {active && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><planeGeometry args={[1.9,1.1]}/><meshBasicMaterial color="#c44c37" transparent opacity={.25}/></mesh>}
      </group>;
    })}
    {draft && room && <group position={[room.x,floorElevation(room.floor,floor)+.28,room.z]}>
      <mesh position={[0,3,0]} rotation={[-Math.PI/2,0,0]} onClick={place}>
        <shapeGeometry args={[surface]}/><meshBasicMaterial transparent opacity={.03} color="#789cae" depthWrite={false}/>
      </mesh>
      {draft.point && <group position={[draft.point.x,0,draft.point.z]} rotation={[0,draft.angle*Math.PI/180,0]}>
        <mesh position={[0,draft.kind==="BAN" ? .76:.12,0]}>
          <boxGeometry args={[placementSize(draft.kind)[0],draft.kind==="BAN"?.12:.24,placementSize(draft.kind)[1]]}/>
          <meshStandardMaterial color={invalid ? "#dc2626":"#15803d"} transparent opacity={.7}/>
        </mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]}><planeGeometry args={[placementSize(draft.kind)[0]+.2,placementSize(draft.kind)[1]+.2]}/><meshBasicMaterial color={invalid?"#dc2626":"#15803d"} transparent opacity={.3}/></mesh>
      </group>}
    </group>}
  </>;
}
