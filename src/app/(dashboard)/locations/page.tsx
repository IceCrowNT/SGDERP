import type { Metadata } from "next";
import { getLocations } from "@/actions/location";
import { LocationManager } from "@/components/locations/LocationManager";
import { EmptyPanel } from "@/components/ui/feature-overview";
export const metadata: Metadata = { title: "Vị trí & không gian | SDG ERP" };
export default async function LocationsPage() {
  const result = await getLocations();
  if (!result.success) return <EmptyPanel title="Không thể truy cập vị trí & không gian" description={result.message} />;
  return <LocationManager rows={result.rows} canManage={result.canManage} />;
}
