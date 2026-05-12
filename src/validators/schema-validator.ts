import { projectStateSchema } from "../schemas/project-state.schema.js";
import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";

export function validateSchema(state: unknown): ValidationResult {
  const parsed = projectStateSchema.safeParse(state);
  if (parsed.success) {
    return { valid: true, issues: [] };
  }

  const issues: ValidationIssue[] = parsed.error.issues.map((issue, index) => ({
    id: `issue_schema_${index + 1}`,
    severity: "error",
    code: "schema_validation_failed",
    message: `状态结构校验失败：${issue.path.join("/") || "根节点"} ${issue.message}`,
    path: `/${issue.path.join("/")}`
  }));

  return { valid: false, issues };
}

export function parseProjectState(state: unknown): ProjectState {
  return projectStateSchema.parse(state);
}
