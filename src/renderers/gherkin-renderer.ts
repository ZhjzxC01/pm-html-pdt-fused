import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderGherkinFeature(state: ProjectState): RenderOutcome {
  if (!state.testCaseSpec) {
    return renderMissingSource("missing_test_case_spec", "缺少测试用例结构，无法渲染 gherkin.feature。", "/testCaseSpec");
  }

  const lines = ["# language: zh-CN", "功能: 费用报销审批", ""];
  for (const suite of Object.values(state.testCaseSpec.testSuites.byId)) {
    for (const testCase of Object.values(suite.cases.byId)) {
      lines.push(`  场景: ${testCase.title}`);
      for (const precondition of testCase.preconditions) {
        lines.push(`    假如 ${precondition}`);
      }
      testCase.steps.forEach((step, index) => {
        lines.push(`    ${index === 0 ? "当" : "并且"} ${step}`);
      });
      for (const expected of testCase.expectedResults) {
        lines.push(`    那么 ${expected}`);
      }
      lines.push("");
    }
  }

  return renderOk(state, "gherkin_feature", "gherkin.feature", "output/gherkin.feature", `${lines.join("\n")}\n`, state.testCaseSpec);
}
