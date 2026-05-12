import { loadProjectState } from "../state/project-state-manager.js";
import type { ValidationIssue, ValidationResult } from "../types/index.js";
import { validateGraph } from "../validators/graph-validator.js";
import { validateHtmlPrototype } from "../validators/html-prototype-validator.js";
import { validateProjectState } from "../validators/project-state-validator.js";
import { validatePrototypeAnnotation } from "../validators/prototype-annotation-validator.js";
import { validatePrototypeMeta } from "../validators/prototype-meta-validator.js";
import { validatePrototypeSpec } from "../validators/prototype-spec-validator.js";
import { validateSchema } from "../validators/schema-validator.js";
import { validateTestCoverage } from "../validators/test-coverage-checker.js";

export async function validateProjectFile(projectPath: string): Promise<ValidationResult> {
  const state = await loadProjectState(projectPath);
  const issues: ValidationIssue[] = [];

  issues.push(...validateSchema(state).issues);
  issues.push(...validateProjectState(state).issues);

  if (state.prototypeSpec) {
    issues.push(...validatePrototypeSpec(state.prototypeSpec, state.requirementCard).issues);
  }
  if (state.htmlPrototype) {
    issues.push(...validateHtmlPrototype(state, state.prototypeMeta ? "with_meta" : "single").issues);
  }
  if (state.prototypeMeta) {
    issues.push(...validatePrototypeMeta(state).issues);
  }
  if (state.flowSpec) {
    issues.push(...validateGraph(state.flowSpec, state.prototypeSpec).issues);
  }
  if (state.testCaseSpec) {
    issues.push(...validateTestCoverage(state).issues);
  }
  if (state.prototypeAnnotationSpec) {
    issues.push(...validatePrototypeAnnotation(state).issues);
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
