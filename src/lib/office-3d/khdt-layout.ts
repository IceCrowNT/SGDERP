import type { PlacementShape } from "./placement";

export const KHDT_ROOM_KEY = "plan_t2_phai_truoc";
/** Survey sketch: two islands (1–5, 6–11), separate desk 12.
 * Room-local metres are approximate; these are import defaults, not render overrides.
 * After import vat_the_3d owns positions, so editing never snaps back to this layout.
 */
export const KHDT_DESKS: (PlacementShape & { number: number })[] = [
  {number:1,kind:"BAN",x:-3.6,z:.2,angle:270},
  {number:2,kind:"BAN",x:-2.65,z:.2,angle:90},
  {number:3,kind:"BAN",x:-3.6,z:1.95,angle:270},
  {number:4,kind:"BAN",x:-2.65,z:1.95,angle:90},
  {number:5,kind:"BAN",x:-3.125,z:3.3,angle:0},
  {number:6,kind:"BAN",x:-.7,z:.2,angle:270},
  {number:7,kind:"BAN",x:.25,z:.2,angle:90},
  {number:8,kind:"BAN",x:-.7,z:1.95,angle:270},
  {number:9,kind:"BAN",x:.25,z:1.95,angle:90},
  {number:10,kind:"BAN",x:-.9,z:3.3,angle:0},
  {number:11,kind:"BAN",x:.85,z:3.3,angle:0},
  {number:12,kind:"BAN",x:3.75,z:1,angle:90},
];
