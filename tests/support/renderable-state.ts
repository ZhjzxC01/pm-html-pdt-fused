import { createExpenseApprovalProjectState } from "../../src/generators/expense-approval-state.js";
import type { ProjectState } from "../../src/types/index.js";

export function createRenderableState(): ProjectState {
  return createExpenseApprovalProjectState("2026-04-26T00:00:00.000Z");
}
