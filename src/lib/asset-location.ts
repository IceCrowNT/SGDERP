import type { ASSET_CONDITIONS } from "./asset-labels";

export type LocationAsset = {
  id: number;
  code: string;
  name: string;
  category: string;
  categoryCode: string;
  condition: keyof typeof ASSET_CONDITIONS;
  locationId: number | null;
  version: string;
};
export type AssetLocation = {
  id: number;
  parent_id: number | null;
  ten_vi_tri: string;
  dang_su_dung: boolean;
};

// Assets can be placed at any physical location, including equipment points.
export function isAvailableAssetLocation(id: number, rows: AssetLocation[]) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const seen = new Set<number>();
  let row = byId.get(id);
  while (row) {
    if (!row.dang_su_dung || seen.has(row.id)) return false;
    seen.add(row.id);
    if (row.parent_id === null) return true;
    row = byId.get(row.parent_id);
  }
  return false;
}
