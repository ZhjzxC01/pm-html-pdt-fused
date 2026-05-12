import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generatePrototypeAnnotationSpec(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "prototype_annotation_generation",
    "规则版生成原型 PRD 标注",
    "/prototypeAnnotationSpec",
    fullState.prototypeAnnotationSpec,
    ["prototypeAnnotationSpec"],
    ["issues"],
    "generation_annotation"
  );
}
