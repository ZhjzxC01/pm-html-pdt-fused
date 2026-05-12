import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderOk } from "./renderer-utils.js";

export function renderConsistencyReport(state: ProjectState): RenderOutcome {
  const lines = ["# 一致性检查报告", ""];

  if (state.issues.length === 0) {
    lines.push("未发现一致性问题。");
  } else {
    for (const issue of state.issues) {
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      if (issue.fixSuggestion) {
        lines.push(`  - 修复建议：${issue.fixSuggestion}`);
      }
    }
  }

  return renderOk(state, "consistency_report", "consistency-report.md", "output/consistency-report.md", `${lines.join("\n")}\n`, state.issues);
}
