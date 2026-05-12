import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderFlowMermaid(state: ProjectState): RenderOutcome {
  if (!state.flowSpec) {
    return renderMissingSource("missing_flow_spec", "缺少流程结构，无法渲染 flow.mermaid。", "/flowSpec");
  }

  const lines = ["stateDiagram-v2"];
  for (const machine of Object.values(state.flowSpec.stateMachines.byId)) {
    for (const transition of Object.values(machine.transitions.byId)) {
      lines.push(`  ${transition.fromStateId} --> ${transition.toStateId}: ${transition.name}`);
    }
  }

  return renderOk(state, "flow_mermaid", "flow.mermaid", "output/flow.mermaid", `${lines.join("\n")}\n`, state.flowSpec);
}
