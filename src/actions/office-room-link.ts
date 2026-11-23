"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { readBuildingMapping } from "@/lib/office-3d/building-mapping-server";
import { RoomLinkSchema, RoomLinkError, roomLinkOptions } from "@/lib/office-3d/room-link";

const selection = { id:true, company_id:true, parent_id:true, ten_vi_tri:true,
  loai_vi_tri:true, dang_su_dung:true, mo_ta:true } as const;

export async function getRoomLinkOptions(roomKey: string) {
  const session = await getSession();
  if (!session || !hasPermission(session,"LOCATIONS","MANAGE"))
    return {success:false as const,message:"Bạn không có quyền quản lý vị trí."};
  if (!RoomLinkSchema.shape.roomKey.safeParse(roomKey).success)
    return {success:false as const,message:"Phòng không hợp lệ."};
  try {
    const mapping = await readBuildingMapping(session.companyId,db);
    const rows = await db.vi_tri.findMany({where:{company_id:session.companyId},select:selection});
    return {success:true as const,...roomLinkOptions(mapping,rows,roomKey)};
  } catch(error) {
    return {success:false as const,message:error instanceof RoomLinkError ? error.message : "Chưa tải được danh sách vị trí. Hãy thử lại."};
  }
}

export async function linkOfficeRoom(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session,"LOCATIONS","MANAGE"))
    return {success:false as const,message:"Bạn không có quyền quản lý vị trí."};
  const parsed = RoomLinkSchema.safeParse(input);
  if (!parsed.success) return {success:false as const,message:"Chọn vị trí phòng cần liên kết.",fieldErrors:parsed.error.flatten().fieldErrors};
  const value = parsed.data;
  try {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      await currentActor(tx,session,"LOCATIONS");
      const mapping = await readBuildingMapping(session.companyId,tx);
      const rows = await tx.vi_tri.findMany({where:{company_id:session.companyId},select:selection});
      const choices = roomLinkOptions(mapping,rows,value.roomKey);
      const room = choices.rooms.find(r=>r.id===value.locationId);
      if (!room) throw new RoomLinkError("Vị trí không còn hợp lệ: cần phòng đang dùng, đúng tầng và chưa liên kết. Hãy tải lại danh sách.");
      const link = await tx.lien_ket_phong_3d.create({data:{company_id:session.companyId,khoa_phong:value.roomKey,vi_tri_id:room.id}});
      await tx.nhat_ky_hoat_dong.create({data:{company_id:session.companyId,account_id:session.userId,
        ten_dang_nhap:session.username,ho_ten:session.fullName,phan_he:"LOCATIONS",hanh_dong:"CREATE",
        doi_tuong_id:`lien_ket_phong_3d:${link.id}`,ten_doi_tuong:room.name,mo_ta:"Liên kết phòng trên mô hình 3D với vị trí",
        du_lieu_moi:{khoa_phong:value.roomKey,vi_tri_id:room.id},
      }});
    });
    revalidatePath("/office-3d");
    revalidatePath("/office-3d/hcns");
    return {success:true as const};
  } catch(error) {
    return {success:false as const,message:error instanceof RoomLinkError ? error.message : "Chưa lưu được liên kết. Kiểm tra quyền và tải lại dữ liệu trước khi thử lại."};
  }
}
