import type { getInventory, getInventoryOptions, getInventoryDetail } from "@/actions/inventory";
export type InventoryList = Extract<Awaited<ReturnType<typeof getInventory>>, { success: true }>;
export type InventoryOptions = Extract<Awaited<ReturnType<typeof getInventoryOptions>>, { success: true }>;
export type InventoryDetail = Extract<Awaited<ReturnType<typeof getInventoryDetail>>, { success: true }>;
export type InventoryItem = InventoryDetail["row"];
export type InventoryCategory = InventoryOptions["categories"][number];
