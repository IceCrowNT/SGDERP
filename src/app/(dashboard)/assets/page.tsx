import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { ManagementTabs } from "@/components/inventory/ManagementTabs";
import { assetPath, parseAssetId } from "@/lib/asset-link";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssetOverview, getAssetCategories, getAssetFilterOptions } from "@/actions/asset";
import { AssetManager } from "@/components/assets/AssetManager";
import { EmptyPanel } from "@/components/ui/feature-overview";
export const metadata: Metadata = { title: "Quản lý tài sản | SDG ERP" };
export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ asset?: string | string[] }> }) {
  const params = await searchParams;
  const id = parseAssetId(typeof params.asset === "string" ? params.asset : null);
  const suffix = id === null ? "" : `?returnTo=${encodeURIComponent(assetPath(id))}`;
  const session = await getSession({ allowPasswordChange: true });
  if (!session) redirect(`/login${suffix}`);
  if (session.mustChangePassword) redirect(`/profile${suffix}`);
  const [list, categories, filters] = await Promise.all([getAssetOverview(), getAssetCategories(), getAssetFilterOptions()]);
  if (!list.success || !categories.success || !filters.success)
    return <EmptyPanel title="Không thể truy cập tài sản" description={!list.success ? list.message : !categories.success ? categories.message : !filters.success ? filters.message : "Vui lòng thử lại."} />;
  return <><ManagementTabs active="assets" assets inventory={hasPermission(session, "INVENTORY")} /><Suspense fallback={<Skeleton className="h-72 w-full" />}><AssetManager initial={list} initialCategories={categories.rows} initialFilters={filters} /></Suspense></>;
}
