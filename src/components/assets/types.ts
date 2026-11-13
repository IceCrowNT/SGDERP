import type { getAsset, getAssetCategories, getAssets, getAssetFilterOptions, getAssetAssignmentOptions, getAssetOverview } from "@/actions/asset";
export type AssetRow = Extract<Awaited<ReturnType<typeof getAsset>>, { success: true }>["row"];
export type AssetCategory = Extract<Awaited<ReturnType<typeof getAssetCategories>>, { success: true }>["rows"][number];
export type AssetList = Extract<Awaited<ReturnType<typeof getAssets>>, { success: true }>;
export type AssetFilters = Extract<Awaited<ReturnType<typeof getAssetFilterOptions>>, { success: true }>;
export type AssetAssignments = Extract<Awaited<ReturnType<typeof getAssetAssignmentOptions>>, { success: true }>;
export type AssetOverview = Extract<Awaited<ReturnType<typeof getAssetOverview>>, { success: true }>;
export type AssetGroup = { id: string; label: string; description: string; icon: string; count: number; query: import("@/lib/validations/asset").AssetQuery };
