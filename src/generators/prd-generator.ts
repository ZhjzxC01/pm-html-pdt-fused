import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generatePrdSpec(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "prd_generation",
    "规则版生成 PRD 结构",
    "/prdSpec",
    fullState.prdSpec,
    ["prdSpec"],
    ["testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_prd"
  );
}
