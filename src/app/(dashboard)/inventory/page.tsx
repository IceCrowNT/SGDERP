import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { getInventory, getInventoryOptions } from "@/actions/inventory";
import { InventoryManager } from "@/components/inventory/InventoryManager";
import { ManagementTabs } from "@/components/inventory/ManagementTabs";
import { EmptyPanel } from "@/components/ui/feature-overview";
export const metadata: Metadata = { title: "Vật tư và phụ kiện | SDG ERP" };
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ kind?: string; item?: string }> }) {
  const s = await getSession(); if (!s) redirect("/login");
  const params = await searchParams;
  const kind = params.kind === "accessory" ? "PHU_KIEN" : "TIEU_HAO";
  const [list, options] = await Promise.all([getInventory({ kind }), getInventoryOptions()]);
  const tabs = <ManagementTabs active={kind === "PHU_KIEN" ? "accessory" : "consumable"} assets={hasPermission(s, "ASSETS")} inventory={hasPermission(s, "INVENTORY")} />;
  if (!list.success || !options.success) return <>{tabs}<EmptyPanel title="Không thể truy cập vật tư" description={!list.success ? list.message : !options.success ? options.message : "Vui lòng thử lại."} /></>;
  return <>{tabs}<InventoryManager key={kind} kind={kind} initial={list} initialOptions={options} initialItem={params.item && /^\d+$/.test(params.item) ? Number(params.item) : null} /></>;
}
