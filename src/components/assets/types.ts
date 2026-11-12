import type { getAsset, getAssetCategories, getAssets, getAssetFilterOptions, getAssetAssignmentOptions } from "@/actions/asset";
export type AssetRow = Extract<Awaited<ReturnType<typeof getAsset>>, { success: true }>["row"];
export type AssetCategory = Extract<Awaited<ReturnType<typeof getAssetCategories>>, { success: true }>["rows"][number];
export type AssetList = Extract<Awaited<ReturnType<typeof getAssets>>, { success: true }>;
export type AssetFilters = Extract<Awaited<ReturnType<typeof getAssetFilterOptions>>, { success: true }>;
export type AssetAssignments = Extract<Awaited<ReturnType<typeof getAssetAssignmentOptions>>, { success: true }>;
