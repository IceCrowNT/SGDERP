import assert from "node:assert/strict";
import test from "node:test";
import { assetPath, assetReturnPath, parseAssetId } from "../../src/lib/asset-link";

test("asset IDs fit database integers; reject ambiguous or malformed identities", () => {
  assert.equal(parseAssetId("123"), 123);
  assert.equal(parseAssetId("2147483647"), 2147483647);
  for (const value of [null, undefined, "", "0", "-1", "01", "1.5", "1e2", " 1", "1,2", "2147483648", "9007199254740993"])
    assert.equal(parseAssetId(value), null);
});

test("login return target accepts only a canonical local asset link", () => {
  assert.equal(assetReturnPath(assetPath(123)), "/assets?asset=123");
  for (const value of [undefined, ["/assets?asset=1"], "https://example.org", "//example.org", "/\\example.org", "javascript:alert(1)", "/assets?asset=1&next=https://example.org", "/assets?asset=1#other", "/assets?asset=1%0a", "/assets?asset=0", "/assets?asset=2147483648", "/assets?asset=1&asset=2"])
    assert.equal(assetReturnPath(value), null);
});
