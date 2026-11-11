import type { Metadata } from "next";
import { getOfficeBuilding } from "@/actions/office-building";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { BuildingExplorer } from "@/components/office-3d/building/BuildingExplorer";

export const metadata: Metadata = {
  title: "Bản đồ 3D tòa nhà Sao Đỏ | SDG ERP",
  description: "Khám phá ba tầng và không gian HCNS theo vị trí đã xác nhận.",
};
export default async function Office3DPage() {
  const result = await getOfficeBuilding();
  if (!result.success)
    return (
      <EmptyPanel
        title="Chưa thể mở mô hình tòa nhà"
        description={result.message}
      />
    );
  return <BuildingExplorer building={result.building} />;
}
