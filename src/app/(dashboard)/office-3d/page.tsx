import type { Metadata } from "next";
import { getOfficeBuilding } from "@/actions/office-building";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { BuildingExplorer } from "@/components/office-3d/building/BuildingExplorer";
import {
  BUILDING_ROOMS,
  type FloorSelection,
} from "@/lib/office-3d/building-layout";

export const metadata: Metadata = {
  title: "Bản đồ 3D tòa nhà Sao Đỏ | SDG ERP",
  description: "Khám phá ba tầng và không gian HCNS theo vị trí đã xác nhận.",
};
export default async function Office3DPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string; room?: string }>;
}) {
  const result = await getOfficeBuilding();
  if (!result.success)
    return (
      <EmptyPanel
        title="Chưa thể mở mô hình tòa nhà"
        description={result.message}
      />
    );
  const query = await searchParams;
  const room = BUILDING_ROOMS.find((r) => r.key === query.room);
  const floor: FloorSelection =
    room?.floor ??
    (query.floor === "1"
      ? 1
      : query.floor === "2"
        ? 2
        : query.floor === "3"
          ? 3
          : "all");
  return (
    <BuildingExplorer
      building={result.building}
      initialFloor={floor}
      initialRoom={room?.key ?? null}
    />
  );
}
