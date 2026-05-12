import type { ProjectState, RenderOutcome, RequirementLevel } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

const LEVEL_LABELS: Record<RequirementLevel, string> = {
  S: "S 级轻量需求卡",
  M: "M 级功能版 PRD",
  L: "L 级完整版 B 端 PRD"
};

export function renderPrdMarkdown(state: ProjectState): RenderOutcome {
  if (!state.prdSpec || !state.requirementCard || !state.prototypeSpec || !state.flowSpec) {
    return renderMissingSource("missing_prd_sources", "缺少 PRD 渲染所需的结构化数据。", "/prdSpec");
  }

  const level = state.prdSpec.requirementLevel ?? "M";
  const lines: string[] = [];

  lines.push(`# ${state.prdSpec.title}`, "");
  lines.push(`> 文档级别：${LEVEL_LABELS[level]}`, "");
  if (state.complexityAssessment) {
    lines.push(`> 复杂度评估理由：${state.complexityAssessment.reasoning}`, "");
  }
  lines.push("---", "");

  for (const sectionId of state.prdSpec.sections.order) {
    const section = state.prdSpec.sections.byId[sectionId];
    if (!section) continue;
    const prefix = "#".repeat(Math.min(Math.max(section.sortOrder > 0 ? 2 : 1, 2), 6));
    lines.push(`${prefix} ${section.title}`, "", section.content, "");
  }

  return renderOk(
    state,
    "prd_markdown",
    "prd.md",
    "output/prd.md",
    `${lines.join("\n")}\n`,
    {
      requirementCard: state.requirementCard,
      prototypeSpec: state.prototypeSpec,
      flowSpec: state.flowSpec,
      prdSpec: state.prdSpec
    }
  );
}
