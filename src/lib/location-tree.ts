export type LocationRow = {
  id: number;
  ma_vi_tri: string;
  ten_vi_tri: string;
  loai_vi_tri: string;
  parent_id: number | null;
  mo_ta: string | null;
  dang_su_dung: boolean;
  version: string;
};
export function locationPath(
  id: number,
  rows: Pick<LocationRow, "id" | "parent_id" | "ten_vi_tri">[],
) {
  const map = new Map(rows.map((r) => [r.id, r]));
  const names: string[] = [],
    seen = new Set<number>();
  let node = map.get(id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    names.unshift(node.ten_vi_tri);
    node = node.parent_id === null ? undefined : map.get(node.parent_id);
  }
  return names.join(" / ");
}
export function descendantIds(
  id: number,
  rows: Pick<LocationRow, "id" | "parent_id">[],
) {
  const found = new Set<number>([id]);
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift();
    for (const row of rows)
      if (row.parent_id === parent && !found.has(row.id)) {
        found.add(row.id);
        queue.push(row.id);
      }
  }
  return found;
}
