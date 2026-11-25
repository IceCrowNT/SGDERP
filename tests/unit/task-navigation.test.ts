import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTaskQuery,
  taskListHref,
  taskReturnHref,
} from "../../src/lib/task-navigation";
test("task list state survives detail and standalone return URLs", () => {
  const filters = parseTaskQuery({
    tab: "doing",
    search: "Máy in HCNS",
    category: "IT",
    status: "CAN_BO_SUNG",
    overdue: "1",
    page: "2",
  });
  const list = taskListHref("/tasks", filters);
  const detail = taskListHref("/tasks", filters, 42);
  assert.equal(
    new URL(detail, "https://erp.invalid").searchParams.get("task"),
    "42",
  );
  const returned = taskReturnHref(list);
  assert.deepEqual(
    parseTaskQuery(
      Object.fromEntries(new URL(returned, "https://erp.invalid").searchParams),
    ),
    filters,
  );
  assert.equal(
    new URL(returned, "https://erp.invalid").searchParams.has("task"),
    false,
  );
});
test("query values are validated independently and department cannot be injected into personal tabs", () => {
  const f = parseTaskQuery({
    tab: "department",
    category: "NOPE",
    page: "-4",
    search: "máy in",
    status: "CHO_NHAN",
    overdue: "yes",
  });
  assert.equal(f.tab, "all");
  assert.equal(f.category, "ALL");
  assert.equal(f.page, 1);
  assert.equal(f.search, "máy in");
  assert.equal(f.status, "CHO_NHAN");
  assert.equal(f.overdue, false);
  assert.equal(parseTaskQuery({ tab: "requested" }, true).tab, "department");
});
test("return targets cannot navigate outside the two task lists", () => {
  for (const unsafe of [
    "https://evil.invalid/tasks",
    "//evil.invalid/tasks",
    "/tasks/42",
    "/tasks/department/other",
    "/tasks\\evil",
    "javascript:alert(1)",
  ])
    assert.equal(taskReturnHref(unsafe), "/tasks");
  assert.equal(
    taskReturnHref("/tasks/department?page=3&task=42&ignored=value"),
    "/tasks/department?page=3",
  );
});
