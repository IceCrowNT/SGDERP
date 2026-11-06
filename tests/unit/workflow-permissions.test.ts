import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canWorkflow,
  workflowActions,
  isEditableGrant,
} from "../../src/lib/role-catalog";
import {
  WorkflowCommandSchema,
  WorkflowTemplateSchema,
} from "../../src/lib/validations/workflow";
test("workflow manager can coordinate/view but cannot approve, execute or submit implicitly", () => {
  assert.equal(canWorkflow(["MANAGE"], "VIEW"), true);
  for (const action of ["APPROVE", "EXECUTE", "CREATE"] as const)
    assert.equal(canWorkflow(["MANAGE"], action), false);
  assert.equal(canWorkflow(["APPROVE"], "APPROVE"), false);
  assert.equal(canWorkflow(["VIEW", "APPROVE"], "APPROVE"), true);
});
test("workflow only recognizes its own ALL grants; TASK and scoped rights never leak", () => {
  const grants = [
    { phan_he: "WORKFLOW", hanh_dong: "APPROVE", pham_vi: "ALL" },
    { phan_he: "WORKFLOW", hanh_dong: "VIEW", pham_vi: "ALL" },
    { phan_he: "TASK", hanh_dong: "MANAGE", pham_vi: "ALL" },
    { phan_he: "WORKFLOW", hanh_dong: "MANAGE", pham_vi: "DEPARTMENT" },
  ];
  assert.deepEqual(workflowActions(grants), ["VIEW", "APPROVE"]);
  assert.equal(isEditableGrant(grants[0]), true);
  assert.equal(isEditableGrant(grants[3]), false);
});
test("decision validation requires reasons, assignee and exact payload", () => {
  const value = {
    id: 1,
    version: "v",
    stepId: 2,
    command: "REASSIGN",
    reason: "",
    employeeId: 3,
  };
  assert.equal(WorkflowCommandSchema.safeParse(value).success, false);
  assert.equal(
    WorkflowCommandSchema.safeParse({ ...value, reason: "Bàn giao" }).success,
    true,
  );
  assert.equal(
    WorkflowCommandSchema.safeParse({
      ...value,
      reason: "Bàn giao",
      companyId: 2,
    }).success,
    false,
  );
  assert.equal(
    WorkflowTemplateSchema.safeParse({
      code: "IT",
      name: "IT",
      description: "",
      steps: [
        {
          name: "Duyệt",
          instructions: "",
          kind: "APPROVAL",
          assignment: "SPECIFIC_EMPLOYEE",
          employeeId: null,
        },
      ],
    }).success,
    false,
  );
});
