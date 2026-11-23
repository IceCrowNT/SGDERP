"use server";
import { getOfficeBuilding } from "./office-building";
import { roomDetailData } from "@/lib/office-3d/room-detail";
import { HCNS_BUILDING_KEY } from "@/lib/office-3d/building-layout";
// Compatibility entry point; same data and permissions as every other room.
export async function getHcnsRoom() {
  const result = await getOfficeBuilding();
  if (!result.success) return result;
  const room = roomDetailData(result.building, HCNS_BUILDING_KEY);
  return room ? {success:true as const,room} : {success:false as const,message:"Phòng chưa được liên kết hoặc đã ngừng sử dụng."};
}
