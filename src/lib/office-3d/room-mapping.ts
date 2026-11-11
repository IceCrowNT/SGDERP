import { z } from "zod";
import { HCNS_LAYOUT, equipmentFromNote, type RoomPoint } from "./hcns-layout";

export const RoomMappingSchema = z
  .object({
    version: z.literal(1),
    companyId: z.number().int().positive(),
    roomId: z.number().int().positive(),
    points: z
      .array(
        z
          .object({ key: z.string(), locationId: z.number().int().positive() })
          .strict(),
      )
      .length(10),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.points.map((p) => p.key)).size !== 10 ||
      new Set(value.points.map((p) => p.locationId)).size !== 10 ||
      value.points.some(
        (p) =>
          !HCNS_LAYOUT.some((s) => s.key === p.key) ||
          p.locationId === value.roomId,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ánh xạ vị trí không hợp lệ.",
      });
    }
  });
export type RoomMapping = z.infer<typeof RoomMappingSchema>;
export type MappedLocation = {
  id: number;
  company_id: number;
  parent_id: number | null;
  ten_vi_tri: string;
  mo_ta: string | null;
  dang_su_dung: boolean;
};
export function mappedRoomPoints(
  mapping: RoomMapping,
  rows: MappedLocation[],
): RoomPoint[] {
  return HCNS_LAYOUT.map((slot) => {
    const id = mapping.points.find((p) => p.key === slot.key)?.locationId;
    const row = rows.find(
      (r) =>
        r.id === id &&
        r.company_id === mapping.companyId &&
        r.parent_id === mapping.roomId,
    );
    if (!row)
      return {
        key: slot.key,
        number: slot.number,
        name: `Vị trí ${String(slot.number).padStart(2, "0")}`,
        description: null,
        state: "unlinked",
        equipment: [],
      };
    return {
      key: slot.key,
      locationId: row.id,
      number: slot.number,
      name: row.ten_vi_tri,
      description: row.mo_ta,
      state: row.dang_su_dung ? "active" : "inactive",
      equipment: row.dang_su_dung ? equipmentFromNote(row.mo_ta) : [],
    };
  });
}
