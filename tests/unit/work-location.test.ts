import { test } from "node:test";
import assert from "node:assert/strict";
import { assertWorkLocationChange, WorkLocationError, isAvailableWorkLocation } from "../../src/lib/work-location";
const base = { currentId: 1, targetId: 2, currentVersion: "v2", expectedVersion: "v2", status: "ACTIVE" };
test("transfers require confirmation; new assignment, no-op and clearing do not", () => {
  assert.throws(() => assertWorkLocationChange(base), (e) => e instanceof WorkLocationError && e.code === "CONFIRM_MOVE");
  for (const change of [{ ...base, confirmMove: true }, { ...base, currentId: null }, { ...base, targetId: 1 }, { ...base, targetId: null, status: "LEFT" }]) assert.doesNotThrow(() => assertWorkLocationChange(change));
});
test("stale confirmations and inactive employees cannot overwrite current assignments", () => {
  assert.throws(() => assertWorkLocationChange({ ...base, confirmMove: true, expectedVersion: "v1" }), (e) => e instanceof WorkLocationError && e.code === "STALE");
  assert.throws(() => assertWorkLocationChange({ ...base, confirmMove: true, status: "LEFT" }), (e) => e instanceof WorkLocationError && e.code === "INVALID");
});
test("workplace eligibility includes all ancestors and rejects device points and cycles", () => {
  const room = { id: 1, parent_id: null, ten_vi_tri: "Phòng", loai_vi_tri: "PHONG", dang_su_dung: true };
  const seat = { ...room, id: 2, parent_id: 1, loai_vi_tri: "CHO_NGOI" };
  assert.equal(isAvailableWorkLocation(2, [room, seat]), true);
  assert.equal(isAvailableWorkLocation(2, [{ ...room, dang_su_dung: false }, seat]), false);
  assert.equal(isAvailableWorkLocation(2, [seat]), false);
  assert.equal(isAvailableWorkLocation(2, [room, { ...seat, loai_vi_tri: "DIEM_DAT_THIET_BI" }]), false);
  assert.equal(isAvailableWorkLocation(2, [{ ...room, parent_id: 2 }, seat]), false);
});
