import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generatePrototypeSpec(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  const traceLinks = fullState.traceability.links.map(({ id, from, to, confidence, reason }) => ({
    id,
    from,
    to,
    confidence,
    reason
  }));

  return replaceArtifact(
    "prototype_spec_generation",
    "规则版生成原型结构",
    "/prototypeSpec",
    fullState.prototypeSpec,
    ["prototypeSpec"],
    ["htmlPrototype", "prototypeMeta", "flowSpec", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_prototype_spec",
    traceLinks
  );
}
