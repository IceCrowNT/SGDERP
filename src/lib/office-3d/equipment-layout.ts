import type { LocationAsset } from "../asset-location";
import { equipmentForAssets, type EquipmentKind } from "./hcns-layout";

type Device = { key: string; kind: EquipmentKind; assetId?: number };
type Rect = { x: number; z: number; width: number; depth: number };
export type EquipmentPlacement = Device & {
  part: "device" | "pc-tower";
  position: [number, number, number];
  scale: number;
  footprint: Rect;
};

// Conservative bounds of the existing models, including trays, keyboard and
// mouse. Scale is fixed, never reduced as more records are added to a desk.
const SCALE = .75, EDGE = .03, GAP = .055;
const SIZE: Record<EquipmentKind, [number, number, number, number]> = {
  pc: [.79, .51, .025, .155], laptop: [.49, .43, 0, -.045],
  printer: [.77, .86, 0, .13], scanner: [.58, .51, 0, .025],
  "access-point": [.34, .34, 0, 0], phone: [.45, .47, -.01, 0],
  pbx: [.72, .43, 0, .01], router: [.72, .43, 0, .01], switch: [.72, .43, 0, .01],
  server: [.36, .5, 0, .015], ups: [.36, .5, 0, .015], generic: [.42, .34, 0, 0],
};
const ORDER: EquipmentKind[] = ["pc", "laptop", "printer", "scanner", "phone", "pbx", "router", "switch", "access-point", "generic", "ups", "server"];
function intersects(a: Rect, b: Rect) {
  return Math.abs(a.x-b.x) < (a.width+b.width)/2+GAP && Math.abs(a.z-b.z) < (a.depth+b.depth)/2+GAP;
}

/** Pure, deterministic display layout. No coordinates or new assignments in DB. */
export function layoutEquipment({ equipment, assets, width, depth, height = .85, desk = true }: {
  equipment: EquipmentKind[]; assets?: LocationAsset[];
  width: number; depth: number; height?: number; desk?: boolean;
}): EquipmentPlacement[] {
  if (!Number.isFinite(width) || !Number.isFinite(depth) || width <= 0 || depth <= 0) return [];
  const devices: Device[] = assets ? assets.map(a => ({key:`asset-${a.id}`,assetId:a.id,kind:equipmentForAssets([a])[0]}))
    : equipment.map((kind,index)=>({key:`${kind}-${index}`,kind}));
  devices.sort((a,b)=>ORDER.indexOf(a.kind)-ORDER.indexOf(b.kind) || (a.assetId ?? 0)-(b.assetId ?? 0) || a.key.localeCompare(b.key));
  const result: EquipmentPlacement[] = [], surface: Rect[] = [], floor: Rect[] = [];
  function place(device: Device, part: EquipmentPlacement["part"], below: boolean) {
    const [w,d,cx,cz] = part === "pc-tower" ? [.24,.42,0,0] : SIZE[device.kind];
    const scale = part === "pc-tower" ? 1 : SCALE;
    const fw=w*scale, fd=d*scale;
    // Keep floor devices inside the legs, away from the modesty panel; leave
    // the central knee space free. Equipment points use their own surface.
    const margin = below ? .19 : EDGE;
    const maxX=(width-fw)/2-margin, maxZ=(depth-fd)/2-(below ? .08 : EDGE);
    if (maxX < 0 || maxZ < 0) return;
    const front = device.kind === "pc" || device.kind === "laptop";
    const primary = front && !result.some(p=>p.part === "device" && (p.kind === "pc" || p.kind === "laptop"));
    const occupied=below ? floor : surface;
    const candidates: Rect[]=[];
    // Include exact edges and center as well as the small packing grid.
    const axis=(max:number)=>Array.from(new Set([-max,0,max,...Array.from({length:Math.floor(max*2/.05)+1},(_,i)=>-max+i*.05)]));
    for (const x of axis(maxX)) for (const z of axis(maxZ)) {
      if (below && Math.abs(x)-fw/2 < .25) continue;
      candidates.push({x,z,width:fw,depth:fd});
    }
    const score=(r:Rect)=> below ? (maxX-Math.abs(r.x))*3+Math.abs(r.z)+ (r.x>0?.01:0)
      : primary ? Math.abs(r.x)*3+(maxZ-r.z)
      : front ? (maxZ-r.z)*3+Math.abs(r.x)
      : (maxX-Math.abs(r.x))*2+(r.z+maxZ)+(r.x>0?.01:0);
    candidates.sort((a,b)=>score(a)-score(b));
    const fit=candidates.find(r=>!occupied.some(o=>intersects(r,o)));
    if (!fit) return;
    occupied.push(fit);
    result.push({...device,part,scale,footprint:fit,position:[fit.x-cx*scale,below ? .04 : height,fit.z-cz*scale]});
  }
  for (const device of devices) {
    place(device,"device",desk && (device.kind==="ups" || device.kind==="server"));
    if (desk && device.kind==="pc" && result.some(p=>p.key===device.key)) place(device,"pc-tower",true);
  }
  return result;
}
