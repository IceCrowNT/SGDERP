import type { Metadata } from "next";
import { getAssets, getAssetCategories, getAssetFilterOptions } from "@/actions/asset";
import { AssetManager } from "@/components/assets/AssetManager";
import { EmptyPanel } from "@/components/ui/feature-overview";
export const metadata: Metadata = { title: "Quản lý tài sản | SDG ERP" };
export default async function AssetsPage() {
  const [list, categories, filters] = await Promise.all([getAssets(), getAssetCategories(), getAssetFilterOptions()]);
  if (!list.success || !categories.success || !filters.success)
    return <EmptyPanel title="Không thể truy cập tài sản" description={!list.success ? list.message : !categories.success ? categories.message : !filters.success ? filters.message : "Vui lòng thử lại."} />;
  return <AssetManager initial={list} initialCategories={categories.rows} initialFilters={filters} />;
}
