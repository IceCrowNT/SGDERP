import assert from "node:assert/strict";
import test from "node:test";
import { assetDepreciation, validAssetDate, todayVietnam, displayVnd } from "../../src/lib/asset-depreciation";
import { SaveAssetSchema, SaveAssetCategorySchema } from "../../src/lib/validations/asset";

test("optional data stays unknown; future/new, mid-life and expired periods are bounded", () => {
  assert.equal(assetDepreciation(null, 36), null);
  assert.equal(assetDepreciation("2026-01-01", null), null);
  assert.equal(assetDepreciation("2026-01-01", 0), null);
  assert.equal(assetDepreciation("2026-01-01", 12, "12000000", "2025-12-01")?.remainingPercent, 100);
  assert.equal(assetDepreciation("2026-01-01", 12, "12000000", "2026-01-01")?.tone, "green");
  assert.equal(assetDepreciation("2026-01-01", 12, "12000000", "2026-09-01")?.tone, "yellow");
  const expired = assetDepreciation("2026-01-01", 12, "12000000", "2027-01-01");
  assert.equal(expired?.remainingPercent, 0); assert.equal(expired?.tone, "red"); assert.equal(expired?.remainingValue, "0"); assert.equal(expired?.completed, true);
});
test("calendar month ends, leap days, Vietnam reporting date and integer currency are exact", () => {
  assert.equal(assetDepreciation("2024-01-31", 1, null, "2024-02-01")?.endDate, "2024-02-29");
  assert.equal(assetDepreciation("2024-02-29", 12, null, "2024-02-29")?.endDate, "2025-02-28");
  assert.equal(assetDepreciation("2026-01-01", 12, "999999999999999999", "2026-01-01")?.remainingValue, "999999999999999999");
  assert.equal(todayVietnam(new Date("2026-01-01T17:01:00Z")), "2026-01-02");
  assert.equal(displayVnd("0"), "0 ₫"); assert.equal(validAssetDate("2026-02-29"), false);
});
test("finance validates without forcing optional inputs or silently clearing legacy payloads", () => {
  const base = { name: "PC", categoryId: 1 };
  assert.equal(SaveAssetSchema.parse(base).purchaseDate, undefined);
  assert.equal(SaveAssetSchema.parse({ ...base, purchasePrice: null }).purchasePrice, null);
  for (const fields of [{ purchasePrice: "-1" }, { purchasePrice: "1.5" }, { purchasePrice: "1e6" }, { purchasePrice: "1000000000000000000" }, { depreciationMonths: 0 }, { depreciationMonths: 1.5 }, { depreciationMonths: 1201 }, { purchaseDate: "2026-02-30" }, { purchaseDate: "2026-01-02", warrantyUntil: "2026-01-01" }])
    assert.equal(SaveAssetSchema.safeParse({ ...base, ...fields }).success, false);
  assert.equal(SaveAssetCategorySchema.safeParse({ name: "PC", code: "PC", defaultDepreciationMonths: 36 }).success, true);
  assert.equal(SaveAssetCategorySchema.safeParse({ name: "PC", code: "PC", defaultDepreciationMonths: 0 }).success, false);
});
