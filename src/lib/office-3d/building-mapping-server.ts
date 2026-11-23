import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { BuildingMappingSchema } from "./building-mapping";

/** Existing building/floor bindings stay in the local configuration.
 * New room bindings are transactional DB data; neither source overwrites the other. */
export async function readBuildingMapping(companyId: number, client: Pick<Prisma.TransactionClient, "lien_ket_phong_3d">) {
  const mapping = BuildingMappingSchema.parse(JSON.parse(await readFile(
    path.join(process.cwd(), "var/office-3d/building.json"), "utf8",
  )));
  if (mapping.companyId !== companyId) throw new Error("Mô hình không thuộc công ty.");
  const links = await client.lien_ket_phong_3d.findMany({
    where: { company_id: companyId }, select: { khoa_phong: true, vi_tri_id: true },
  });
  return BuildingMappingSchema.parse({ ...mapping, rooms: [
    ...mapping.rooms, ...links.map(link => ({ key: link.khoa_phong, locationId: link.vi_tri_id })),
  ] });
}
