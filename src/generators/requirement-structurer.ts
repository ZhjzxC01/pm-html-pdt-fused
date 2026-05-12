import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generateRequirementCard(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "requirement_generation",
    "规则版生成需求卡",
    "/requirementCard",
    fullState.requirementCard,
    ["requirementCard"],
    ["prototypeSpec", "htmlPrototype", "prototypeMeta", "flowSpec", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_requirement"
  );
}
