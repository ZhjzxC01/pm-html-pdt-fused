import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";
import { stateArtifactTypeSchema } from "../schemas/project-state.schema.js";

export function validateProjectState(state: ProjectState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!state.schemaVersion) {
    issues.push({
      id: "issue_missing_schema_version",
      severity: "error",
      code: "missing_schema_version",
      message: "ProjectState.schemaVersion 不能为空。",
      path: "/schemaVersion"
    });
  }

  if (!Number.isInteger(state.version) || state.version < 0) {
    issues.push({
      id: "issue_invalid_project_version",
      severity: "error",
      code: "invalid_project_version",
      message: "ProjectState.version 必须是非负整数。",
      path: "/version"
    });
  }

  for (const [index, artifact] of state.dirtyArtifacts.entries()) {
    if (!stateArtifactTypeSchema.safeParse(artifact).success) {
      issues.push({
        id: `issue_invalid_dirty_artifact_${index}`,
        severity: "error",
        code: "invalid_dirty_artifact",
        message: `dirtyArtifacts 包含非法结构化产物：${artifact}`,
        path: `/dirtyArtifacts/${index}`
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
