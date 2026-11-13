"use server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import {
  BuildingMappingSchema,
  resolveBuilding,
  relativeRoomLocation,
  type BuildingData,
} from "@/lib/office-3d/building-mapping";
import { HCNS_BUILDING_KEY } from "@/lib/office-3d/building-layout";
import { RoomMappingSchema } from "@/lib/office-3d/room-mapping";
import { getHcnsRoom } from "./office-room";
import { objectKey } from "@/lib/office-3d/placement";
import { equipmentForAssets } from "@/lib/office-3d/hcns-layout";

export async function getOfficeBuilding() {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS"))
    return {
      success: false as const,
      message: "Bạn chưa được cấp quyền xem vị trí & không gian.",
    };
  let raw: unknown;
  try {
    raw = JSON.parse(
      await readFile(
        path.join(process.cwd(), "var/office-3d/building.json"),
        "utf8",
      ),
    );
  } catch {
    return {
      success: false as const,
      message: "Chưa thiết lập mô hình tòa nhà cho công ty của bạn.",
    };
  }
  const parsed = BuildingMappingSchema.safeParse(raw);
  if (!parsed.success || parsed.data.companyId !== session.companyId)
    return {
      success: false as const,
      message: "Chưa thiết lập mô hình tòa nhà cho công ty của bạn.",
    };
  const rows = await db.vi_tri.findMany({
    where: { company_id: session.companyId },
    select: {
      id: true,
      company_id: true,
      parent_id: true,
      ten_vi_tri: true,
      loai_vi_tri: true,
      dang_su_dung: true,
      mo_ta: true,
    },
  });
  const resolved = resolveBuilding(parsed.data, rows);
  if (!resolved)
    return {
      success: false as const,
      message:
        "Tòa nhà đã thay đổi hoặc ngừng sử dụng. Cần kiểm tra lại liên kết mô hình.",
    };
  const canViewEmployees = hasPermission(session, "HR");
  const canViewAssets = hasPermission(session, "ASSETS");
  const ids = [...new Set(resolved.rooms.flatMap((r) => [...r.locationIds]))];
  const [people, assets, placements] = await Promise.all([
    canViewEmployees ? db.nhan_su.findMany({
        where: {
          company_id: session.companyId,
          tinh_trang_lam_viec: "ACTIVE",
          vi_tri_lam_viec_id: { in: ids },
        },
        select: {
          id: true,
          ho_ten: true,
          chuc_vu: true,
          vi_tri_lam_viec_id: true,
          phong_ban: { select: { ten_phong_ban: true } },
        },
        orderBy: [{ ho_ten: "asc" }, { id: "asc" }],
      })
    : Promise.resolve([]),
    canViewAssets ? db.tai_san.findMany({
      where: { company_id: session.companyId, vi_tri_id: { in: ids } },
      select: { id: true, ten_tai_san: true, ma_tai_san: true, tinh_trang: true, vi_tri_id: true, updated_at: true,
        loai_tai_san: { select: { ma_loai: true, ten_loai: true } } },
      orderBy: [{ ten_tai_san: "asc" }, { id: "asc" }],
    }) : Promise.resolve([]),
    db.vat_the_3d.findMany({where:{company_id:session.companyId},include:{vi_tri:true},orderBy:{id:"asc"}}),
  ]);
  let hcns: BuildingData["hcns"] = null;
  const room = resolved.rooms.find((r) => r.key === HCNS_BUILDING_KEY);
  if (room?.state === "active") {
    try {
      const mapping = RoomMappingSchema.parse(
        JSON.parse(
          await readFile(
            path.join(process.cwd(), "var/office-3d/hcns.json"),
            "utf8",
          ),
        ),
      );
      if (
        mapping.companyId === session.companyId &&
        mapping.roomId === room.row?.id
      ) {
        const result = await getHcnsRoom();
        if (result.success) hcns = result.room;
      }
    } catch {
      /* Missing detail model does not prevent browsing the building. */
    }
  }
  const objects: NonNullable<BuildingData["objects"]> = placements.flatMap(o => {
    const r = resolved.rooms.find(r => r.row?.id === o.phong_id && r.state === "active");
    if (!r || o.vi_tri.parent_id !== o.phong_id || !o.vi_tri.dang_su_dung ||
      o.vi_tri.loai_vi_tri !== (o.loai_vat_the === "BAN" ? "CHO_NGOI" : "DIEM_DAT_THIET_BI")) return [];
    const pointAssets = assets.filter(a => a.vi_tri_id === o.vi_tri_id).map(a => ({id:a.id,name:a.ten_tai_san,code:a.ma_tai_san,
      category:a.loai_tai_san.ten_loai,categoryCode:a.loai_tai_san.ma_loai,condition:a.tinh_trang,locationId:a.vi_tri_id,version:a.updated_at.toISOString()}));
    return [{id:o.id,roomKey:r.key,roomId:o.phong_id,kind:o.loai_vat_the as "BAN"|"DIEM",x:o.toa_do_x,z:o.toa_do_z,angle:o.goc_xoay as 0|90|180|270,
      version:o.updated_at.toISOString(),locationVersion:o.vi_tri.updated_at.toISOString(),
      point:{key:objectKey(o.id),number:0,locationId:o.vi_tri_id,name:o.vi_tri.ten_vi_tri,description:o.vi_tri.mo_ta,state:"active" as const,
        equipment:equipmentForAssets(pointAssets),...(canViewAssets ? {assets:pointAssets} : {}),
        ...(canViewEmployees ? {occupants:people.filter(p => p.vi_tri_lam_viec_id === o.vi_tri_id).map(p => ({id:p.id,name:p.ho_ten,position:p.chuc_vu,department:p.phong_ban?.ten_phong_ban ?? null}))} : {})}}];
  });
  const pointForLocation = (id:number) => objects.find(o => o.point.locationId === id)?.point.key ??
    hcns?.points.find(p => p.state === "active" && p.locationId === id)?.key ?? null;
  const building: BuildingData = {
    objects,
    canManageEmployees:hasPermission(session,"HR","MANAGE"),
    canManageAssets:hasPermission(session,"ASSETS","MANAGE"),
    name: resolved.name,
    floors: resolved.floors.map(({ floor, name, state }) => ({
      floor,
      name,
      state,
    })),
    rooms: resolved.rooms.map((r) => ({
      key: r.key,
      locationId: r.row?.id,
      name: r.name,
      state: r.state,
      path: r.path,
      description: r.description,
      ...(canViewEmployees
        ? {
            occupants: people
              .filter(
                (p) =>
                  p.vi_tri_lam_viec_id !== null &&
                  r.locationIds.has(p.vi_tri_lam_viec_id),
              )
              .map((p) => ({
                id: p.id,
                name: p.ho_ten,
                position: p.chuc_vu,
                department: p.phong_ban?.ten_phong_ban ?? null,
                location: relativeRoomLocation(p.vi_tri_lam_viec_id!, r.row!.id, rows),
                pointKey: pointForLocation(p.vi_tri_lam_viec_id!),
              })),
          }
        : {}),
      ...(canViewAssets ? {
        assets: assets.filter(a => a.vi_tri_id !== null && r.locationIds.has(a.vi_tri_id)).map(a => ({
          id: a.id, name: a.ten_tai_san, code: a.ma_tai_san,
          category: a.loai_tai_san.ten_loai, categoryCode: a.loai_tai_san.ma_loai,
          condition: a.tinh_trang,
          location: relativeRoomLocation(a.vi_tri_id!, r.row!.id, rows),
          pointKey: pointForLocation(a.vi_tri_id!),
        })),
      } : {}),
    })),
    hcns,
    canViewEmployees,
    canViewAssets,
    canManage: hasPermission(session, "LOCATIONS", "MANAGE"),
  };
  return { success: true as const, building };
}
