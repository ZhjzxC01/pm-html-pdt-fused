import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderTestCaseMarkdown(state: ProjectState): RenderOutcome {
  if (!state.testCaseSpec) {
    return renderMissingSource("missing_test_case_spec", "缺少测试用例结构，无法渲染 test-cases.md。", "/testCaseSpec");
  }

  const lines = ["# 测试用例", ""];
  for (const suite of Object.values(state.testCaseSpec.testSuites.byId)) {
    lines.push(`## ${suite.name}`, "");
    for (const testCase of Object.values(suite.cases.byId)) {
      lines.push(`### ${testCase.title}`, "", `优先级：${testCase.priority}`, "", "步骤：");
      testCase.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push("", "预期结果：");
      testCase.expectedResults.forEach((result, index) => lines.push(`${index + 1}. ${result}`));
      lines.push("");
    }
  }

  return renderOk(state, "test_cases_markdown", "test-cases.md", "output/test-cases.md", `${lines.join("\n")}\n`, state.testCaseSpec);
}
