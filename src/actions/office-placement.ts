"use server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { BuildingMappingSchema, resolveBuilding } from "@/lib/office-3d/building-mapping";
import { PlacementSchema, placementError, objectKey } from "@/lib/office-3d/placement";

class PlacementError extends Error {}
export async function saveOfficePlacement(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS", "MANAGE"))
    return { success: false as const, message: "Bạn không có quyền quản lý vị trí." };
  const parsed = PlacementSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  try {
    const mapping = BuildingMappingSchema.parse(JSON.parse(await readFile(path.join(process.cwd(), "var/office-3d/building.json"), "utf8")));
    if (mapping.companyId !== session.companyId) throw new PlacementError("Phòng không thuộc công ty của bạn.");
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      await currentActor(tx, session, "LOCATIONS");
      const rows = await tx.vi_tri.findMany({ where: { company_id: session.companyId } });
      const room = resolveBuilding(mapping, rows)?.rooms.find(r => r.key === v.roomKey);
      if (room?.state !== "active" || room.row?.id !== v.roomId) throw new PlacementError("Phòng đã thay đổi hoặc ngừng sử dụng. Hãy tải lại mô hình.");
      const before = v.id ? await tx.vat_the_3d.findFirst({ where: { id:v.id, company_id:session.companyId }, include: { vi_tri:true } }) : null;
      if (v.id && (!before || before.phong_id !== v.roomId || before.vi_tri.parent_id !== v.roomId || !before.vi_tri.dang_su_dung))
        throw new PlacementError("Vị trí đã chuyển phòng hoặc không còn hoạt động.");
      if (before && (before.updated_at.toISOString() !== v.version || before.vi_tri.updated_at.toISOString() !== v.locationVersion))
        throw new PlacementError("Vị trí đã được cập nhật. Tải lại dữ liệu trước khi sửa.");
      if (before && before.loai_vat_the !== v.kind) throw new PlacementError("Bản thử nghiệm giữ nguyên loại vật thể sau khi tạo.");
      const others = await tx.vat_the_3d.findMany({ where: { company_id:session.companyId, phong_id:v.roomId,
        ...(v.id ? { id:{ not:v.id } } : {}), vi_tri:{ parent_id:v.roomId, dang_su_dung:true } } });
      const error = placementError(v.roomKey, v, others.map(o => ({ kind:o.loai_vat_the as "BAN"|"DIEM",x:o.toa_do_x,z:o.toa_do_z,angle:o.goc_xoay as 0|90|180|270 })));
      if (error) throw new PlacementError(error);
      if (rows.some(r => r.parent_id === v.roomId && r.id !== before?.vi_tri_id && r.ten_vi_tri.trim().toLocaleLowerCase("vi") === v.name.toLocaleLowerCase("vi")))
        throw new PlacementError("Trong phòng đã có vị trí mang tên này. Hãy chọn tên khác.");
      const location = before ? await tx.vi_tri.update({ where:{id:before.vi_tri_id}, data:{ ten_vi_tri:v.name } })
        : await tx.vi_tri.create({ data:{ company_id:session.companyId, parent_id:v.roomId, ten_vi_tri:v.name,
          loai_vi_tri:v.kind === "BAN" ? "CHO_NGOI" : "DIEM_DAT_THIET_BI" } });
      const data = { loai_vat_the:v.kind,toa_do_x:v.x,toa_do_z:v.z,goc_xoay:v.angle };
      const object = before ? await tx.vat_the_3d.update({ where:{id:before.id}, data })
        : await tx.vat_the_3d.create({ data:{...data,company_id:session.companyId,phong_id:v.roomId,vi_tri_id:location.id} });
      await tx.nhat_ky_hoat_dong.create({ data:{ company_id:session.companyId, account_id:session.userId,
        ten_dang_nhap:session.username, ho_ten:session.fullName, phan_he:"LOCATIONS", doi_tuong_id:`vi_tri:${location.id}`,
        ten_doi_tuong:location.ten_vi_tri, hanh_dong:before ? "UPDATE" : "CREATE", mo_ta:before ? "Chỉnh bố trí vị trí trên mô hình 3D" : "Tạo vị trí từ mô hình 3D",
        ...(before ? {du_lieu_cu:{ten_vi_tri:before.vi_tri.ten_vi_tri,loai_vat_the:before.loai_vat_the,toa_do_x:before.toa_do_x,toa_do_z:before.toa_do_z,goc_xoay:before.goc_xoay}} : {}),
        du_lieu_moi:{vi_tri_id:location.id,ten_vi_tri:location.ten_vi_tri,phong_id:v.roomId,...data},
      } });
      return { pointKey:objectKey(object.id), locationId:location.id };
    });
    for (const route of ["/locations","/office-3d","/office-3d/hcns"]) revalidatePath(route);
    return { success:true as const, ...result };
  } catch (error) {
    return { success:false as const, message:error instanceof PlacementError ? error.message : "Chưa lưu được vị trí. Hãy cập nhật dữ liệu, kiểm tra quyền và thử lại." };
  }
}
