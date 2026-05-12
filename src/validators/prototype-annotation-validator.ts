import * as cheerio from "cheerio";
import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";

export function validatePrototypeAnnotation(state: ProjectState): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!state.prototypeAnnotationSpec) {
    return { valid: true, issues };
  }

  const html = state.htmlPrototype?.files.order
    .map((id) => state.htmlPrototype?.files.byId[id])
    .find((file) => file?.type === "html")?.content;
  const $ = html ? cheerio.load(html) : null;

  for (const annotation of Object.values(state.prototypeAnnotationSpec.annotations.byId)) {
    if ($ && $(annotation.targetSelector).length === 0) {
      issues.push({
        id: `issue_annotation_selector_missing_${annotation.id}`,
        severity: "error",
        code: "annotation_selector_missing",
        message: `标注 ${annotation.title} 的 selector 无法命中 HTML 节点。`,
        entityRef: { entityType: "prototype_annotation", entityId: annotation.id }
      });
    }

    for (const sectionId of annotation.prdSectionIds) {
      if (state.prdSpec && !state.prdSpec.sections.byId[sectionId]) {
        issues.push({
          id: `issue_annotation_unknown_prd_section_${annotation.id}_${sectionId}`,
          severity: "error",
          code: "annotation_unknown_prd_section",
          message: `标注 ${annotation.title} 引用了不存在的 PRD 章节：${sectionId}`
        });
      }
    }
  }

  for (const brokenLink of state.prototypeAnnotationSpec.brokenLinks) {
    if (!containsChinese(brokenLink.reason) || !containsChinese(brokenLink.fixSuggestion)) {
      issues.push({
        id: `issue_broken_link_not_chinese_${brokenLink.id}`,
        severity: "error",
        code: "broken_link_message_not_chinese",
        message: `断链 ${brokenLink.id} 的 reason 和 fixSuggestion 必须使用中文。`
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

function containsChinese(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}
