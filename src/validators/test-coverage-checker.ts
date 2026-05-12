import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";

export function validateTestCoverage(state: ProjectState): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!state.prototypeSpec || !state.testCaseSpec) {
    return { valid: true, issues };
  }

  const coveredActions = new Set<string>();
  for (const suite of Object.values(state.testCaseSpec.testSuites.byId)) {
    for (const testCase of Object.values(suite.cases.byId)) {
      testCase.relatedActionIds.forEach((id) => coveredActions.add(id));
    }
  }

  for (const page of Object.values(state.prototypeSpec.pages.byId)) {
    for (const action of Object.values(page.actions.byId)) {
      if (action.priority === "P0" && !coveredActions.has(action.id)) {
        issues.push({
          id: `issue_p0_action_missing_test_${action.id}`,
          severity: "error",
          code: "p0_action_missing_test_case",
          message: `P0 核心操作 ${action.name} 缺少测试用例覆盖。`,
          entityRef: { entityType: "action", entityId: action.id }
        });
      }
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
