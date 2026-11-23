import { test } from "node:test";
import assert from "node:assert/strict";
import { getVisibleMenuGroups, matchesRoute, getPageContext } from "../../src/components/layout/Sidebar";
import { systemAccess } from "../../src/lib/system-access";
import type { SessionUser } from "../../src/lib/auth";

const base: SessionUser = { userId: 1, username: "test", fullName: "Test", employeeCode: "", companyId: 1, roleCodes: [], permissions: {} };
const paths = (session: SessionUser) => getVisibleMenuGroups(session).flatMap(g => g.items.map(i => i.href));

test("basic accounts have no business/admin groups even with an ADMIN role label", () => {
  assert.deepEqual(paths({ ...base, roleCodes: ["ADMIN"] }), []);
});
test("space navigation is independent of HR permissions", () => {
  assert.deepEqual(paths({ ...base, permissions: { LOCATIONS: "VIEW" } }), ["/office-3d", "/system", "/locations"]);
  const groups = getVisibleMenuGroups({ ...base, permissions: { LOCATIONS: "VIEW" } });
  assert.deepEqual(groups.map(g => g.id), ["building", "system"]);
  assert.equal(getPageContext("/office-3d"), "Bản đồ 3D");
  assert.equal(getPageContext("/locations"), "Quản trị hệ thống");
  assert.deepEqual(paths({ ...base, permissions: { HR: "MANAGE" } }), ["/hr", "/employees", "/departments"]);
});
test("account administration and AI settings preserve their specific grants", () => {
  assert.deepEqual(paths({ ...base, permissions: { ACCOUNTS: "VIEW" } }), []);
  assert.deepEqual(paths({ ...base, permissions: { ACCOUNTS: "MANAGE" } }), ["/system", "/accounts"]);
  assert.deepEqual(paths({ ...base, aiActions: ["MANAGE_CONNECTIONS"] }), ["/system", "/settings"]);
});
test("password change gate hides business navigation", () => {
  assert.deepEqual(paths({ ...base, mustChangePassword: true, permissions: { LOCATIONS: "MANAGE", HR: "MANAGE", ACCOUNTS: "MANAGE" }, aiActions: ["MANAGE_CONNECTIONS"] }), []);
});
test("active routes respect URL segment boundaries", () => {
  assert.equal(matchesRoute("/settings/ai", "/settings"), true);
  assert.equal(matchesRoute("/settings-other", "/settings"), false);
  assert.equal(matchesRoute("/locations", "/"), false);
});

test("HR overview belongs to HR and remains available to viewers", () => {
  const groups = getVisibleMenuGroups({ ...base, permissions: { HR: "VIEW" } });
  assert.equal(groups[0].href, "/hr");
  assert.equal(getPageContext("/hr"), "Nhân sự");
});


test("system overview is available only through an authorized child area", () => {
  for (const moduleCode of ["ROLES", "AUDIT", "LOCATIONS"]) {
    const groups = getVisibleMenuGroups({ ...base, permissions: { [moduleCode]: "VIEW" } });
    assert.equal(groups.find(g => g.id === "system")?.href, "/system");
    assert.ok(paths({ ...base, permissions: { [moduleCode]: "VIEW" } }).includes("/system"));
    assert.ok(!paths({ ...base, permissions: { [moduleCode]: "VIEW" } }).includes("/accounts"));
  }
  assert.equal(getPageContext("/system"), "Quản trị hệ thống");
});

test("system domains remain independent and password gate closes all of them", () => {
  assert.deepEqual(systemAccess({ ...base, permissions: { LOCATIONS: "VIEW" } }), {
    accounts: false, roles: false, locations: true, audit: false, settings: false,
  });
  assert.deepEqual(systemAccess({ ...base, aiActions: ["VIEW_USAGE"] }), {
    accounts: false, roles: false, locations: false, audit: false, settings: true,
  });
  assert.ok(Object.values(systemAccess({ ...base, mustChangePassword: true, permissions: { ROLES: "MANAGE", ACCOUNTS: "MANAGE" }, aiActions: ["MANAGE_CONNECTIONS"] })).every(v => !v));
});
