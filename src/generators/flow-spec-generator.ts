import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generateFlowSpec(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "flow_generation",
    "规则版生成流程与状态机",
    "/flowSpec",
    fullState.flowSpec,
    ["flowSpec"],
    ["prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_flow"
  );
}
