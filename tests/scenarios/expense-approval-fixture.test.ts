import { describe, expect, it } from "vitest";
import { createExpenseApprovalProjectState } from "../../src/generators/expense-approval-state.js";

describe("费用报销夹具", () => {
  it("包含 V1.0 必需的场景实体", () => {
    const state = createExpenseApprovalProjectState("2026-04-26T00:00:00.000Z");

    expect(state.requirementCard?.roles.order).toEqual(["role_employee", "role_manager", "role_finance", "role_admin"]);
    expect(state.prototypeSpec?.pages.order).toEqual([
      "page_expense_list",
      "page_expense_detail",
      "page_expense_create",
      "page_expense_approval",
      "page_expense_log"
    ]);

    const actionIds = new Set(
      Object.values(state.prototypeSpec?.pages.byId ?? {}).flatMap((page) => page.actions.order)
    );
    expect(actionIds).toEqual(
      new Set([
        "action_create_expense",
        "action_search_expense",
        "action_reset_expense_filter",
        "action_export_expense",
        "action_view_expense_detail",
        "action_withdraw_expense",
        "action_submit_expense",
        "action_approve_expense",
        "action_reject_expense"
      ])
    );

    const machine = state.flowSpec?.stateMachines.byId.state_machine_expense_report;
    expect(machine?.states.order).toEqual([
      "business_state_draft",
      "business_state_pending_manager_approval",
      "business_state_pending_finance_review",
      "business_state_pending_payment",
      "business_state_completed",
      "business_state_rejected",
      "business_state_withdrawn"
    ]);

    expect(state.prototypeSpec?.permissions.order).toHaveLength(10);
    expect(state.testCaseSpec?.testSuites.byId.test_suite_expense_approval.cases.order).toHaveLength(6);
    expect(state.prototypeAnnotationSpec?.annotations.order).toHaveLength(5);
  });
});
