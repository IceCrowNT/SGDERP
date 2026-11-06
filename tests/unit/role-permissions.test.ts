import { test } from "node:test";
import assert from "node:assert/strict";
import { permissionLevels, isEditableGrant } from "../../src/lib/role-catalog";

test("union is order independent and MANAGE includes VIEW", () => {
  const grants = [
    { phan_he: "HR", hanh_dong: "VIEW", pham_vi: "ALL" },
    { phan_he: "HR", hanh_dong: "MANAGE", pham_vi: "ALL" },
    { phan_he: "ROLES", hanh_dong: "VIEW", pham_vi: "ALL" },
  ];
  assert.deepEqual(permissionLevels(grants), { HR: "MANAGE", ROLES: "VIEW" });
  assert.deepEqual(permissionLevels([...grants].reverse()), { HR: "MANAGE", ROLES: "VIEW" });
});
test("scoped MANAGE never amplifies company-wide VIEW", () => {
  assert.deepEqual(permissionLevels([
    { phan_he: "HR", hanh_dong: "VIEW", pham_vi: "ALL" },
    { phan_he: "HR", hanh_dong: "MANAGE", pham_vi: "DEPARTMENT" },
    { phan_he: "ROLES", hanh_dong: "MANAGE", pham_vi: "PERSONAL" },
  ]), { HR: "VIEW" });
});
test("unsupported actions do not become manage and are preserved outside the matrix", () => {
  for (const action of ["APPROVE", "CREATE", "ASSIGN"]) {
    const grant = { phan_he: "TASK", hanh_dong: action, pham_vi: "ALL" };
    assert.deepEqual(permissionLevels([grant]), {});
    assert.equal(isEditableGrant(grant), false);
  }
  assert.equal(isEditableGrant({ phan_he: "HR", hanh_dong: "MANAGE", pham_vi: "DEPARTMENT" }), false);
  assert.equal(isEditableGrant({ phan_he: "HR", hanh_dong: "MANAGE", pham_vi: "ALL" }), true);
});
