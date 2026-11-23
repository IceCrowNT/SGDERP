"use client";
import { KHDT_ROOM_KEY } from "@/lib/office-3d/khdt-layout";
import { Shape } from "three";
import { Block, materials as m } from "../hcns/RoomFurniture";

const ignorePicking = () => {};
// Approximate the surveyed curved bed, in the hall's local X/Z footprint.
// Shared static shape; no grass strands, textures or animation loop.
const lawnOutline = new Shape();
lawnOutline.moveTo(-2.4, -.95);
lawnOutline.bezierCurveTo(-2.9, .1, -1.5, .2, -1.9, 1.15);
lawnOutline.bezierCurveTo(-2.2, 2.1, -.75, 1.35, 0, 1.55);
lawnOutline.bezierCurveTo(1.1, 1.9, 2.7, 1.85, 2.35, .75);
lawnOutline.bezierCurveTo(1.9, -.15, 2.85, -1.45, 1.75, -1.55);
lawnOutline.bezierCurveTo(.65, -1.65, .3, -.9, -.65, -1.15);
lawnOutline.bezierCurveTo(-1.35, -1.4, -2.1, -1.65, -2.4, -.95);
lawnOutline.closePath();

/** Survey context only: no ID, record, label or interaction. */
export function RoomBackdrop({roomKey}:{roomKey:string}) {
  if (roomKey === "plan_t3_sanh") return <HallGarden />;
  if (roomKey !== KHDT_ROOM_KEY) return null;
  return <group>
    <group position={[-1.8,0,-2.5]}>
      <mesh position={[0,.8,0]} scale={[1.9,1,.7]} raycast={ignorePicking} castShadow receiveShadow>
        <cylinderGeometry args={[1,1,.12,24]}/><meshStandardMaterial color={m.wood}/>
      </mesh>
      <Block at={[-1,.4,0]} size={[.14,.7,.6]} color={m.metal}/>
      <Block at={[1,.4,0]} size={[.14,.7,.6]} color={m.metal}/>
    </group>
    {/* Rear wall → long sofa → round table → two facing armchairs. */}
    <group position={[3.6,0,-3.85]}>
      <GuestSeat width={2.4}/>
      <group position={[0,0,1.3]}>
        <mesh position={[0,.46,0]} raycast={ignorePicking} castShadow receiveShadow>
          <cylinderGeometry args={[.48,.48,.1,24]}/>
          <meshStandardMaterial color={m.wood} roughness={.85}/>
        </mesh>
        <mesh position={[0,.23,0]} raycast={ignorePicking} castShadow>
          <cylinderGeometry args={[.12,.2,.4,12]}/>
          <meshStandardMaterial color={m.metal} roughness={.85}/>
        </mesh>
      </group>
      {[-.65,.65].map(x => <group key={x} position={[x,0,2.55]} rotation={[0,Math.PI,0]}>
        <GuestSeat width={.85}/>
      </group>)}
    </group>
  </group>;
}

/** Floor 3: curved grass bed in the centre, one round table toward the facade. */
function HallGarden() {
  return <group name="floor-3-hall-backdrop">
    <group position={[0,0,-.45]}>
      <mesh position={[0,.06,0]} rotation={[-Math.PI/2,0,0]} raycast={ignorePicking} receiveShadow>
        <extrudeGeometry args={[lawnOutline,{depth:.22,bevelEnabled:false,curveSegments:6}]}/>
        <meshStandardMaterial color={m.wall} roughness={1}/>
      </mesh>
      <mesh position={[0,.285,0]} rotation={[-Math.PI/2,0,0]} scale={[.91,.89,1]}
        raycast={ignorePicking} receiveShadow>
        <shapeGeometry args={[lawnOutline,6]}/>
        <meshStandardMaterial color="#819766" roughness={1}/>
      </mesh>
    </group>
    <group position={[0,0,2.55]}>
      <mesh position={[0,.72,0]} raycast={ignorePicking} receiveShadow>
        <cylinderGeometry args={[.68,.68,.09,24]}/>
        <meshStandardMaterial color={m.wood} roughness={.85}/>
      </mesh>
      <mesh position={[0,.38,0]} raycast={ignorePicking} receiveShadow>
        <cylinderGeometry args={[.13,.29,.64,12]}/>
        <meshStandardMaterial color={m.metal} roughness={.85}/>
      </mesh>
    </group>
  </group>;
}

/** The same simple upholstery geometry for the long sofa and individual seats. */
function GuestSeat({width}:{width:number}) {
  return <group>
    <Block at={[0,.25,0]} size={[width,.35,.8]} color="#a5b5b5"/>
    <Block at={[0,.65,-.32]} size={[width,.65,.18]} color="#93a5a5"/>
    <Block at={[-width/2+.08,.5,0]} size={[.16,.5,.85]} color="#93a5a5"/>
    <Block at={[width/2-.08,.5,0]} size={[.16,.5,.85]} color="#93a5a5"/>
  </group>;
}
