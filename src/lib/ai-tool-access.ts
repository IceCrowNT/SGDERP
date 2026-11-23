import { canTask } from "./support-task";
import { hasPermission, type SessionUser } from "@/lib/auth";
import type { AiJob } from "@/lib/validations/ai-governance";

const inventoryRead = ["search_inventory", "get_inventory_item", "lookup_inventory"];
const writes = ["prepare_support_ticket","prepare_asset", "prepare_location", "plan_category_depreciation", "prepare_inventory_item", "prepare_inventory_transaction", "prepare_inventory_receipt"];
/** Filter exposure and enforce again before execution; actions still own all business validation. */
export function canUseBusinessTool(session: SessionUser, job: AiJob, name: string, input?: unknown) {
  if (job === "LOOKUP" && writes.includes(name)) return false;
  if (["lookup_support_targets", "prepare_support_ticket"].includes(name)) return canTask(session.taskActions,"CREATE");
  if (inventoryRead.includes(name)) {
    const people = name === "lookup_inventory" && input && typeof input === "object" && "kind" in input && input.kind === "people";
    return hasPermission(session, "INVENTORY", people ? "MANAGE" : "VIEW");
  }
  if (["prepare_inventory_item", "prepare_inventory_transaction", "prepare_inventory_receipt"].includes(name)) return hasPermission(session, "INVENTORY", "MANAGE");
  if (["prepare_asset", "plan_category_depreciation"].includes(name)) return hasPermission(session, "ASSETS", "MANAGE");
  if (name === "prepare_location") return hasPermission(session, "LOCATIONS", "MANAGE");
  if (["search_assets", "get_asset"].includes(name)) return hasPermission(session, "ASSETS");
  if (name === "lookup") {
    const kind = input && typeof input === "object" && "kind" in input ? input.kind : null;
    if (kind === "locations") return hasPermission(session, "LOCATIONS");
    if (kind === "departments" || kind === "people") return hasPermission(session, "ASSETS", "MANAGE");
    if (kind === "categories") return hasPermission(session, "ASSETS");
    return hasPermission(session, "ASSETS") || hasPermission(session, "LOCATIONS");
  }
  return false;
}
