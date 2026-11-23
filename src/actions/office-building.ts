"use server";
import { db } from "@/lib/db";
import { readBuildingMapping } from "@/lib/office-3d/building-mapping-server";
import { getSession, hasPermission } from "@/lib/auth";
import {
  resolveBuilding,
  relativeRoomLocation,
  type BuildingData,
} from "@/lib/office-3d/building-mapping";
import { isDirectWorkPoint } from "@/lib/office-3d/building-layout";
import { objectKey, type PlacementModel } from "@/lib/office-3d/placement";
import { equipmentForAssets } from "@/lib/office-3d/hcns-layout";

export async function getOfficeBuilding() {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS"))
    return {
      success: false as const,
      message: "Bạn chưa được cấp quyền xem vị trí & không gian.",
    };
  let mapping;
  try { mapping = await readBuildingMapping(session.companyId, db); }
  catch { return { success: false as const, message: "Chưa tải được liên kết mô hình tòa nhà. Vui lòng thử lại hoặc kiểm tra cấu hình." }; }
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
      updated_at: true,
    },
  });
  const resolved = resolveBuilding(mapping, rows);
  if (!resolved)
    return {
      success: false as const,
      message:
        "Tòa nhà đã thay đổi hoặc ngừng sử dụng. Cần kiểm tra lại liên kết mô hình.",
    };
  const canViewEmployees = hasPermission(session, "HR");
  const canViewAssets = hasPermission(session, "ASSETS");
  const ids = [...new Set(resolved.rooms.flatMap((r) => [...r.locationIds]))];
  const [people, assets, placements, categories] = await Promise.all([
    canViewEmployees ? db.nhan_su.findMany({
        where: {
          company_id: session.companyId,
          tinh_trang_lam_viec: "ACTIVE",
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
    canViewAssets ? db.loai_tai_san.findMany({
      where: { company_id: session.companyId },
      select: { ma_loai: true, ten_loai: true }, orderBy: { ten_loai: "asc" },
    }) : Promise.resolve([]),
  ]);
  const objects: NonNullable<BuildingData["objects"]> = placements.flatMap(o => {
    const r = resolved.rooms.find(r => r.state === "active" && (isDirectWorkPoint(r.row?.loai_vi_tri) ? r.row?.id === o.vi_tri_id && r.row.parent_id === o.phong_id : r.row?.id === o.phong_id));
    if (!r || o.vi_tri.parent_id !== o.phong_id || !o.vi_tri.dang_su_dung ||
      !["CHO_NGOI","DIEM_DAT_THIET_BI"].includes(o.vi_tri.loai_vi_tri)) return [];
    const pointAssets = assets.filter(a => a.vi_tri_id === o.vi_tri_id).map(a => ({id:a.id,name:a.ten_tai_san,code:a.ma_tai_san,
      category:a.loai_tai_san.ten_loai,categoryCode:a.loai_tai_san.ma_loai,condition:a.tinh_trang,locationId:a.vi_tri_id,version:a.updated_at.toISOString()}));
    return [{id:o.id,roomKey:r.key,roomId:r.row!.id,model:o.mau_hien_thi as PlacementModel,kind:o.loai_vat_the as "BAN"|"DIEM",x:o.toa_do_x,z:o.toa_do_z,angle:o.goc_xoay as 0|90|180|270,
      width:o.chieu_rong,depth:o.chieu_sau,version:o.updated_at.toISOString(),locationVersion:o.vi_tri.updated_at.toISOString(),
      point:{key:o.khoa_cu ?? objectKey(o.id),number:0,locationId:o.vi_tri_id,name:o.vi_tri.ten_vi_tri,description:o.vi_tri.mo_ta,state:"active" as const,
        equipment:equipmentForAssets(pointAssets),...(canViewAssets ? {assets:pointAssets} : {}),
        ...(canViewEmployees ? {occupants:people.filter(p => p.vi_tri_lam_viec_id === o.vi_tri_id).map(p => ({id:p.id,name:p.ho_ten,position:p.chuc_vu,department:p.phong_ban?.ten_phong_ban ?? null}))} : {})}}];
  });
  const pointForLocation = (id:number) => objects.find(o => o.point.locationId === id)?.point.key ?? null;
  const building: BuildingData = {
    ...(canViewEmployees ? { searchPeople: people.map(p => {
      const location = rows.find(row => row.id === p.vi_tri_lam_viec_id);
      const room = resolved.rooms.find(r => r.state === "active" && location && r.locationIds.has(location.id));
      return { id: p.id, name: p.ho_ten, department: p.phong_ban?.ten_phong_ban ?? null,
        location: location?.ten_vi_tri ?? null, roomKey: room?.key ?? null,
        pointKey: room && location ? pointForLocation(location.id) : null };
    }) } : {}),
    ...(canViewAssets ? { assetCategories: categories.map(c => ({ code: c.ma_loai, name: c.ten_loai })) } : {}),
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
      ...(hasPermission(session, "LOCATIONS", "MANAGE") && r.state === "active" ? {
        ...(isDirectWorkPoint(r.row?.loai_vi_tri) ? { directPoint: {
          id:r.row!.id, name:r.row!.ten_vi_tri, kind:(r.row!.loai_vi_tri === "CHO_NGOI" ? "BAN" : "DIEM") as "BAN"|"DIEM",
          version:rows.find(row=>row.id===r.row!.id)!.updated_at.toISOString(),
        }} : {}),
        availablePoints: rows.filter(row=>row.parent_id===r.row?.id && row.dang_su_dung && isDirectWorkPoint(row.loai_vi_tri) && !placements.some(o=>o.vi_tri_id===row.id))
          .map(row=>({id:row.id,name:row.ten_vi_tri,kind:(row.loai_vi_tri === "CHO_NGOI" ? "BAN" : "DIEM") as "BAN"|"DIEM",version:row.updated_at.toISOString()})),
      } : {}),
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
    hcns:null,
    canViewEmployees,
    canViewAssets,
    canManage: hasPermission(session, "LOCATIONS", "MANAGE"),
  };
  return { success: true as const, building };
}
