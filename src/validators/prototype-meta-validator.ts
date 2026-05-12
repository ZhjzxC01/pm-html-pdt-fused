import * as cheerio from "cheerio";
import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";

export function validatePrototypeMeta(state: ProjectState): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!state.prototypeMeta || !state.prototypeSpec || !state.htmlPrototype) {
    return { valid: true, issues };
  }

  const html = state.htmlPrototype.files.order
    .map((id) => state.htmlPrototype?.files.byId[id])
    .find((file) => file?.type === "html")?.content;
  if (!html) {
    return { valid: false, issues: [{ id: "issue_missing_html_file", severity: "error", code: "missing_html_file", message: "缺少 HTML 文件。" }] };
  }

  const $ = cheerio.load(html);
  const fieldPrimaryMappings = new Set<string>();

  for (const mapping of state.prototypeMeta.fieldMappings) {
    if (mapping.mappingRole === "primary") {
      fieldPrimaryMappings.add(mapping.entityId);
    }
  }

  for (const page of Object.values(state.prototypeSpec.pages.byId)) {
    for (const module of Object.values(page.modules.byId)) {
      for (const field of Object.values(module.fields.byId)) {
        if (!fieldPrimaryMappings.has(field.id)) {
          issues.push({
            id: `issue_field_missing_primary_mapping_${field.id}`,
            severity: "error",
            code: "field_missing_primary_mapping",
            message: `字段 ${field.name} 缺少 primary DOM 映射。`,
            entityRef: { entityType: "field", entityId: field.id }
          });
        }
      }
    }
  }

  for (const mapping of [
    ...state.prototypeMeta.pageMappings,
    ...state.prototypeMeta.moduleMappings,
    ...state.prototypeMeta.fieldMappings,
    ...state.prototypeMeta.actionMappings,
    ...state.prototypeMeta.uiStateMappings
  ]) {
    if (mapping.dataValue !== mapping.entityId) {
      issues.push({
        id: `issue_mapping_data_value_mismatch_${mapping.id}`,
        severity: "error",
        code: "mapping_data_value_mismatch",
        message: `DOM 映射 ${mapping.id} 的 dataValue 必须等于 entityId。`
      });
    }

    if ($(mapping.domSelector).length !== 1) {
      issues.push({
        id: `issue_mapping_selector_not_unique_${mapping.id}`,
        severity: "error",
        code: "mapping_selector_not_unique",
        message: `DOM 映射 ${mapping.id} 的 selector 未命中唯一节点。`
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
