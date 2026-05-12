import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generatePrototypeMeta(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "prototype_meta_generation",
    "规则版生成 DOM 映射",
    "/prototypeMeta",
    fullState.prototypeMeta,
    ["prototypeMeta"],
    ["prototypeAnnotationSpec", "issues"],
    "generation_meta"
  );
}
