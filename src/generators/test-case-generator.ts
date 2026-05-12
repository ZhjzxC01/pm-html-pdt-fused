import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generateTestCaseSpec(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  return replaceArtifact(
    "test_case_generation",
    "规则版生成测试用例",
    "/testCaseSpec",
    fullState.testCaseSpec,
    ["testCaseSpec"],
    ["prototypeAnnotationSpec", "issues"],
    "generation_test_case"
  );
}
