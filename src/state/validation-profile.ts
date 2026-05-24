import type { ProjectState, ValidationIssue, ValidationProfile, ValidationResult } from "../types/index.js";
import { projectStateSchema } from "../schemas/project-state.schema.js";
import { validateGraph } from "../validators/graph-validator.js";
import { validateHtmlPrototype } from "../validators/html-prototype-validator.js";
import { validateProjectState } from "../validators/project-state-validator.js";
import { validatePrototypeAnnotation } from "../validators/prototype-annotation-validator.js";
import { validatePrototypeMeta } from "../validators/prototype-meta-validator.js";
import { validatePrototypeSpec } from "../validators/prototype-spec-validator.js";
import { validateTestCoverage } from "../validators/test-coverage-checker.js";

export function validateByProfile(state: ProjectState, profile: ValidationProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  const schemaResult = projectStateSchema.safeParse(state);

  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      issues.push({
        id: `issue_schema_${issues.length + 1}`,
        severity: "error",
        code: "schema_validation_failed",
        message: `状态结构校验失败：${issue.path.join("/") || "根节点"} ${issue.message}`,
        path: `/${issue.path.join("/")}`
      });
    }
  }

  issues.push(...validateProjectState(state).issues);

  switch (profile) {
    case "generation_prototype_spec":
      if (state.prototypeSpec) {
        issues.push(...validatePrototypeSpec(state.prototypeSpec, state.requirementCard).issues);
      }
      break;
    case "generation_html":
      issues.push(...validateHtmlPrototype(state, "single").issues);
      break;
    case "generation_meta":
      issues.push(...validateHtmlPrototype(state, "with_meta").issues);
      issues.push(...validatePrototypeMeta(state).issues);
      break;
    case "generation_flow":
      if (state.flowSpec) {
        issues.push(...validateGraph(state.flowSpec, state.prototypeSpec).issues);
      }
      break;
    case "generation_test_case":
      issues.push(...validateTestCoverage(state).issues);
      break;
    case "generation_annotation":
      issues.push(...validatePrototypeAnnotation(state).issues);
      break;
    case "nl_edit":
      if (state.prototypeSpec) {
        issues.push(...validatePrototypeSpec(state.prototypeSpec, state.requirementCard).issues);
      }
      if (state.testCaseSpec) {
        issues.push(...validateTestCoverage(state).issues);
      }
      break;
    case "render_manifest_sync":
      issues.push(...validateArtifactManifestBasics(state));
      break;
    case "schema_only":
    case "generation_complexity":
    case "generation_requirement":
    case "generation_prd":
    case "consistency_check":
    case "undo":
      break;
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

function validateArtifactManifestBasics(state: ProjectState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const id of state.artifactManifest.items.order) {
    if (!state.artifactManifest.items.byId[id]) {
      issues.push({
        id: `issue_artifact_manifest_missing_${id}`,
        severity: "error",
        code: "artifact_manifest_order_missing_by_id",
        message: `产物清单的 order 包含不存在的产物：${id}`,
        path: "/artifactManifest/items/order"
      });
    }
  }

  return issues;
}
