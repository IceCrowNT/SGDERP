import { AssetQuerySchema, type AssetQuery } from "@/lib/validations/asset";

const keys = ["search", "categoryId", "condition", "usage", "departmentId", "employeeId", "locationId", "page"] as const;
export function readAssetListQuery(params: Pick<URLSearchParams, "get">): AssetQuery {
  const raw: Record<string, unknown> = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value === null) continue;
    raw[key] = key === "locationId" && value === "null" ? null : key.endsWith("Id") || key === "page" ? Number(value) : value;
  }
  const result = AssetQuerySchema.safeParse(raw);
  if (!result.success || Object.entries(result.data).some(([key, value]) => key.endsWith("Id") && typeof value === "number" && value > 2147483647)) return {};
  return result.data;
}
export function assetListKey(query: AssetQuery) {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== "" && !(key === "page" && value === 1)) params.set(key, String(value));
  }
  return params.toString();
}
export function setAssetListQuery(url: URL, query: AssetQuery) {
  keys.forEach(key => url.searchParams.delete(key));
  new URLSearchParams(assetListKey(query)).forEach((value, key) => url.searchParams.set(key, value));
  return url.pathname + url.search + url.hash;
}
