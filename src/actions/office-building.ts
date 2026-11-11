"use server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { locationPath } from "@/lib/location-tree";
import {
  BuildingMappingSchema,
  resolveBuilding,
  type BuildingData,
} from "@/lib/office-3d/building-mapping";
import { HCNS_BUILDING_KEY } from "@/lib/office-3d/building-layout";
import { RoomMappingSchema } from "@/lib/office-3d/room-mapping";
import { getHcnsRoom } from "./office-room";

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
  const ids = [...new Set(resolved.rooms.flatMap((r) => [...r.locationIds]))];
  const people = canViewEmployees
    ? await db.nhan_su.findMany({
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
    : [];
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
  const building: BuildingData = {
    name: resolved.name,
    floors: resolved.floors.map(({ floor, name, state }) => ({
      floor,
      name,
      state,
    })),
    rooms: resolved.rooms.map((r) => ({
      key: r.key,
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
                location: locationPath(p.vi_tri_lam_viec_id!, rows),
              })),
          }
        : {}),
    })),
    hcns,
    canViewEmployees,
    canManage: hasPermission(session, "LOCATIONS", "MANAGE"),
  };
  return { success: true as const, building };
}
