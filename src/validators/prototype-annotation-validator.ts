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
  const annotations = Object.values(state.prototypeAnnotationSpec.annotations.byId);

  for (const annotation of annotations) {
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

  // #13a — 编号连续性检查
  const numbers = annotations.map((a) => a.annotationNumber).sort((a: number, b: number) => a - b);
  const numberSet = new Set(numbers);
  if (numberSet.size !== numbers.length) {
    issues.push({
      id: "issue_annotation_duplicate_number",
      severity: "warning",
      code: "annotation_duplicate_number",
      message: "标注编号存在重复。"
    });
  }
  if (numbers.length > 0 && numbers[0] !== 1) {
    issues.push({
      id: "issue_annotation_number_not_starting_from_1",
      severity: "warning",
      code: "annotation_number_not_starting_from_1",
      message: `标注编号未从 1 开始，当前最小编号为 ${numbers[0]}。`
    });
  }
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] - numbers[i - 1] > 1) {
      issues.push({
        id: `issue_annotation_number_gap_${numbers[i - 1]}_${numbers[i]}`,
        severity: "warning",
        code: "annotation_number_gap",
        message: `标注编号存在跳号：${numbers[i - 1]} → ${numbers[i]}。`
      });
      break;
    }
  }

  // #13b — 浮窗内容非空检查
  for (const annotation of annotations) {
    if (annotation.tooltipSections.length === 0) {
      issues.push({
        id: `issue_annotation_empty_tooltip_${annotation.id}`,
        severity: "error",
        code: "annotation_empty_tooltip",
        message: `标注 ${annotation.title} 的浮窗内容为空。`
      });
    } else {
      const hasContent = annotation.tooltipSections.some((s: { markdownContent: string }) => s.markdownContent.length > 10);
      if (!hasContent) {
        issues.push({
          id: `issue_annotation_tooltip_no_content_${annotation.id}`,
          severity: "error",
          code: "annotation_tooltip_no_content",
          message: `标注 ${annotation.title} 的浮窗所有 section 内容过短（均 ≤10 字符）。`
        });
      }
    }
  }

  // #13c — activatePath 选择器验证
  if ($) {
    for (const annotation of annotations) {
      if (annotation.activatePath) {
        for (const step of annotation.activatePath) {
          if ($(step.selector).length === 0) {
            issues.push({
              id: `issue_activate_path_selector_${annotation.id}_${step.selector}`,
              severity: "warning",
              code: "activate_path_selector_missing",
              message: `标注 ${annotation.title} 的激活路径选择器 "${step.selector}" 无法命中 HTML 节点。`
            });
          }
        }
      }
    }
  }

  // #14 — PRD 覆盖度检查
  if (state.prdSpec) {
    const allPrdSectionIds = Object.keys(state.prdSpec.sections.byId);
    const coveredSectionIds = new Set(annotations.flatMap((a) => a.prdSectionIds));
    const uncovered = allPrdSectionIds.filter((id) => !coveredSectionIds.has(id));
    for (const sectionId of uncovered) {
      issues.push({
        id: `issue_prd_section_uncovered_${sectionId}`,
        severity: "warning",
        code: "prd_section_uncovered",
        message: `PRD 章节 "${sectionId}" 未被任何标注覆盖。`
      });
    }
  }

  // #13d — relatedEntities 完整性
  for (const annotation of annotations) {
    if (annotation.relatedEntities.length === 0) {
      issues.push({
        id: `issue_annotation_no_entities_${annotation.id}`,
        severity: "info",
        code: "annotation_no_entities",
        message: `标注 ${annotation.title} 未列出任何关联实体。`
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
