"use server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { locationPath } from "@/lib/location-tree";
import {
  RoomMappingSchema,
  mappedRoomPoints,
} from "@/lib/office-3d/room-mapping";

export async function getHcnsRoom() {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS"))
    return {
      success: false as const,
      message: "Bạn chưa được cấp quyền xem vị trí & không gian.",
    };
  let source: unknown;
  try {
    source = JSON.parse(
      await readFile(
        path.join(process.cwd(), "var/office-3d/hcns.json"),
        "utf8",
      ),
    );
  } catch {
    return {
      success: false as const,
      message: "Chưa thiết lập mô hình phòng HCNS cho công ty của bạn.",
    };
  }
  const parsed = RoomMappingSchema.safeParse(source);
  if (!parsed.success || parsed.data.companyId !== session.companyId)
    return {
      success: false as const,
      message: "Chưa thiết lập mô hình phòng HCNS cho công ty của bạn.",
    };
  const mapping = parsed.data;
  const rows = await db.vi_tri.findMany({
    where: { company_id: session.companyId },
    select: {
      id: true,
      company_id: true,
      parent_id: true,
      ten_vi_tri: true,
      loai_vi_tri: true,
      mo_ta: true,
      dang_su_dung: true,
    },
  });
  const room = rows.find(
    (r) => r.id === mapping.roomId && r.loai_vi_tri === "PHONG",
  );
  if (!room)
    return {
      success: false as const,
      message:
        "Phòng đã được xóa hoặc thay đổi loại vị trí. Cần kiểm tra lại liên kết mô hình.",
    };
  const seen = new Set<number>();
  let ancestor: typeof room | undefined = room;
  while (ancestor) {
    if (!ancestor.dang_su_dung || seen.has(ancestor.id))
      return {
        success: false as const,
        message: "Phòng hoặc vị trí cấp trên đã ngừng sử dụng.",
      };
    seen.add(ancestor.id);
    if (ancestor.parent_id === null) break;
    ancestor = rows.find((r) => r.id === ancestor?.parent_id);
    if (!ancestor)
      return {
        success: false as const,
        message: "Cây vị trí của phòng cần được kiểm tra lại.",
      };
  }
  const canViewEmployees = hasPermission(session, "HR");
  const points = mappedRoomPoints(mapping, rows);
  const people = canViewEmployees
    ? await db.nhan_su.findMany({
        where: {
          company_id: session.companyId,
          tinh_trang_lam_viec: "ACTIVE",
          vi_tri_lam_viec_id: {
            in: mapping.points.map((point) => point.locationId),
          },
        },
        select: {
          id: true,
          ho_ten: true,
          chuc_vu: true,
          vi_tri_lam_viec_id: true,
          phong_ban: { select: { ten_phong_ban: true } },
        },
        orderBy: { ho_ten: "asc" },
      })
    : [];
  return {
    success: true as const,
    room: {
      name: room.ten_vi_tri,
      path: locationPath(room.id, rows),
      points: points.map((point) => ({
        ...point,
        ...(canViewEmployees
          ? {
              occupants:
                point.state === "active"
                  ? people
                      .filter(
                        (person) =>
                          person.vi_tri_lam_viec_id ===
                          mapping.points.find((link) => link.key === point.key)
                            ?.locationId,
                      )
                      .map((person) => ({
                        id: person.id,
                        name: person.ho_ten,
                        position: person.chuc_vu,
                        department: person.phong_ban?.ten_phong_ban ?? null,
                      }))
                  : [],
            }
          : {}),
      })),
      canManage: hasPermission(session, "LOCATIONS", "MANAGE"),
      canViewEmployees,
      canManageEmployees: hasPermission(session, "HR", "MANAGE"),
    },
  };
}
