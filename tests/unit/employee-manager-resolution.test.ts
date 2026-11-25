import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createManagerResolver,
  assertNoNewManagerCycles,
  type ManagerGraph,
  type ManagerPerson,
  type ManagerDepartment,
} from "../../src/lib/employee-manager-resolution";
const person = (
  id: number,
  department_id: number | null,
  quan_ly_truc_tiep_id: number | null = null,
): ManagerPerson => ({
  id,
  department_id,
  quan_ly_truc_tiep_id,
  tinh_trang_lam_viec: "ACTIVE",
});
const department = (
  id: number,
  nguoi_phu_trach_id: number | null,
  parent_id: number | null = null,
): ManagerDepartment => ({
  id,
  nguoi_phu_trach_id,
  parent_id,
  ten_phong_ban: `Phòng ${id}`,
});
const base: ManagerGraph = {
  people: [person(1, 10), person(2, 10), person(3, 20)],
  departments: [department(10, 1), department(20, 3, 10)],
};
test("ordinary employee inherits own head, explicit override takes precedence, with no input mutation", () => {
  const graph = { ...base, people: [...base.people, person(4, 20, 1)] };
  const before = JSON.stringify(graph),
    resolver = createManagerResolver(graph);
  assert.deepEqual(resolver.resolve(2), {
    managerId: 1,
    source: "DEPARTMENT",
    departmentId: 10,
    error: null,
  });
  assert.deepEqual(resolver.resolve(4), {
    managerId: 1,
    source: "EXPLICIT",
    departmentId: null,
    error: null,
  });
  assert.equal(JSON.stringify(graph), before);
});
test("department head inherits distinct ancestor head, top-level head has no self manager", () => {
  const graph = {
    people: [person(1, 10), person(2, 30)],
    departments: [
      department(10, 1),
      department(20, null, 10),
      department(30, 2, 20),
    ],
  };
  const r = createManagerResolver(graph);
  assert.equal(r.resolve(2).managerId, 1);
  assert.equal(r.resolve(2).source, "ANCESTOR");
  assert.equal(r.resolve(2).departmentId, 10);
  assert.equal(r.resolve(1).source, "TOP_LEVEL");
  assert.equal(r.resolve(1).managerId, null);
  assert.equal(r.resolve(1).error, null);
});
test("missing own head is unresolved for ordinary employees even when ancestor has a head", () => {
  const r = createManagerResolver({
    people: [person(1, 10), person(2, 20)],
    departments: [department(10, 1), department(20, null, 10)],
  });
  assert.equal(r.resolve(2).source, "UNRESOLVED");
  assert.match(r.resolve(2).error!, /chưa có người phụ trách/);
  assert.equal(r.resolve(99).source, "UNRESOLVED");
});
test("nested head without distinct ancestor is unresolved rather than silently treated as top-level", () => {
  const r = createManagerResolver({
    people: [person(1, 20)],
    departments: [department(10, 1), department(20, 1, 10)],
  });
  assert.equal(r.resolve(1).source, "UNRESOLVED");
});
test("inactive or missing explicit manager never falls back to a valid department head", () => {
  const g = {
    ...base,
    people: [
      ...base.people,
      person(4, 10, 5),
      { ...person(5, 10), tinh_trang_lam_viec: "LEFT" },
      person(6, 10, 999),
    ],
  };
  const r = createManagerResolver(g);
  assert.match(r.resolve(4).error!, /không còn đang làm việc/);
  assert.match(r.resolve(6).error!, /không thuộc/);
  const headInactive = {
    ...base,
    people: base.people.map((p) =>
      p.id === 1 ? { ...p, tinh_trang_lam_viec: "LEFT" } : p,
    ),
  };
  assert.match(
    createManagerResolver(headInactive).resolve(2).error!,
    /không còn đang làm việc/,
  );
});
test("effective cycles span inherited and explicit edges and reject self override", () => {
  const next = {
    ...base,
    people: base.people.map((p) =>
      p.id === 1 ? { ...p, quan_ly_truc_tiep_id: 2 } : p,
    ),
  };
  assert.match(createManagerResolver(next).resolve(2).error!, /vòng lặp/);
  assert.throws(() => assertNoNewManagerCycles(base, next), /vòng lặp/);
  const self = {
    ...base,
    people: base.people.map((p) =>
      p.id === 2 ? { ...p, quan_ly_truc_tiep_id: 2 } : p,
    ),
  };
  assert.throws(() => assertNoNewManagerCycles(base, self), /vòng lặp/);
});
test("changing department or department head cannot introduce inherited cycles", () => {
  const move = {
    ...base,
    people: base.people.map((p) =>
      p.id === 1 ? { ...p, department_id: 20 } : p,
    ),
  };
  assert.throws(() => assertNoNewManagerCycles(base, move), /vòng lặp/);
  const head = {
    ...base,
    departments: base.departments.map((d) =>
      d.id === 10 ? { ...d, nguoi_phu_trach_id: 2 } : d,
    ),
    people: base.people.map((p) =>
      p.id === 2 ? { ...p, quan_ly_truc_tiep_id: 1 } : p,
    ),
  };
  assert.throws(() => assertNoNewManagerCycles(base, head), /vòng lặp/);
});
test("unrelated legacy cycles do not block repairs but new people cannot join that cycle", () => {
  const old = {
    ...base,
    people: [...base.people, person(4, 10, 5), person(5, 10, 4)],
  };
  assert.doesNotThrow(() =>
    assertNoNewManagerCycles(old, {
      ...old,
      people: old.people.map((p) =>
        p.id === 2 ? { ...p, department_id: 20 } : p,
      ),
    }),
  );
  assert.throws(
    () =>
      assertNoNewManagerCycles(old, {
        ...old,
        people: old.people.map((p) =>
          p.id === 2 ? { ...p, quan_ly_truc_tiep_id: 4 } : p,
        ),
      }),
    /vòng lặp/,
  );
  const fixed = {
    ...old,
    people: old.people.map((p) =>
      p.id === 4 ? { ...p, quan_ly_truc_tiep_id: 1 } : p,
    ),
  };
  assert.doesNotThrow(() => assertNoNewManagerCycles(old, fixed));
  assert.equal(createManagerResolver(fixed).resolve(5).error, null);
});
test("a changed legacy path must not be redirected into a different existing cycle", () => {
  const old = {
    ...base,
    people: [...base.people, person(4, 10, 5), person(5, 10, 4), person(6, 10, 7), person(7, 10, 6), person(8, 10, 4)],
  };
  const next = {...old, people: old.people.map(p => p.id === 8 ? {...p, quan_ly_truc_tiep_id: 6} : p)};
  assert.throws(() => assertNoNewManagerCycles(old, next), /vòng lặp/);
});
test("batch resolution handles long organization chains without recursive stack or repeated graph traversal", () => {
  const count = 15000,
    graph = {
      people: Array.from({ length: count }, (_, i) =>
        person(i + 1, 10, i + 1 === count ? null : i + 2),
      ),
      departments: [department(10, count)],
    };
  const r = createManagerResolver(graph);
  assert.equal(r.resolve(1).managerId, 2);
  assert.equal(r.resolve(count).source, "TOP_LEVEL");
  assert.equal(r.cyclicPeople.size, 0);
});
