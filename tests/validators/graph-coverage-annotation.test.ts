import { describe, expect, it } from "vitest";
import { createRenderableState } from "../support/renderable-state.js";
import { validateGraph } from "../../src/validators/graph-validator.js";
import { validatePrototypeAnnotation } from "../../src/validators/prototype-annotation-validator.js";
import { validateTestCoverage } from "../../src/validators/test-coverage-checker.js";

describe("图、覆盖率和标注校验器", () => {
  it("可渲染夹具通过图和覆盖率校验", () => {
    const state = createRenderableState();

    expect(validateGraph(state.flowSpec!, state.prototypeSpec).valid).toBe(true);
    expect(validateTestCoverage(state).valid).toBe(true);
    expect(validatePrototypeAnnotation(state).valid).toBe(true);
  });

  it("拒绝缺失的状态流转操作引用", () => {
    const state = createRenderableState();
    const transition = state.flowSpec?.stateMachines.byId.state_machine_expense_report.transitions.byId.transition_submit_expense;
    if (transition) {
      transition.triggerActionId = "action_missing";
    }

    const result = validateGraph(state.flowSpec!, state.prototypeSpec);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "invalid_action_transition_ref")).toBe(true);
  });

  it("拒绝没有测试覆盖的 P0 操作", () => {
    const state = createRenderableState();
    const testCase = state.testCaseSpec?.testSuites.byId.test_suite_expense_approval.cases.byId.test_case_submit_expense_success;
    if (testCase) {
      testCase.relatedActionIds = [];
    }

    const result = validateTestCoverage(state);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "p0_action_missing_test_case")).toBe(true);
  });

  it("拒绝无法命中 HTML 的标注 selector", () => {
    const state = createRenderableState();
    const annotation = state.prototypeAnnotationSpec?.annotations.byId.annotation_module_expense_form;
    if (annotation) {
      annotation.targetSelector = "[data-action-id=\"missing\"]";
    }

    const result = validatePrototypeAnnotation(state);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "annotation_selector_missing")).toBe(true);
  });
});
