import { test } from "node:test";
import assert from "node:assert/strict";
import { usernameBase } from "../../src/lib/username";
test("Vietnamese username convention, Unicode normalization and safe fallback", () => {
  assert.equal(usernameBase("Dương Hoàng Nam"), "namdh");
  assert.equal(usernameBase("Đinh Hoài Nam"), "namdh");
  assert.equal(usernameBase("  ĐINH   HOÀI   NAM  "), "namdh");
  assert.equal(usernameBase("Lan"), "lan");
  assert.equal(usernameBase("李 明", 17), "nv17");
  assert.equal(usernameBase("A", 17), "nv17");
  assert.ok(usernameBase("A " + "x".repeat(255)).length <= 80);
});
