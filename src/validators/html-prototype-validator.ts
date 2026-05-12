import * as cheerio from "cheerio";
import type { ProjectState, ValidationIssue, ValidationResult } from "../types/index.js";

export function validateHtmlPrototype(state: ProjectState, mode: "single" | "with_meta" = "single"): ValidationResult {
  const issues: ValidationIssue[] = [];
  const html = getHtmlContent(state);

  if (!html) {
    return {
      valid: false,
      issues: [
        {
          id: "issue_missing_html_file",
          severity: "error",
          code: "missing_html_file",
          message: "HTML 原型结构中缺少 index.html 内容。",
          path: "/htmlPrototype/files"
        }
      ]
    };
  }

  const $ = cheerio.load(html);
  if ($("[data-page-id]").length === 0) {
    issues.push({
      id: "issue_missing_page_container",
      severity: "error",
      code: "missing_page_container",
      message: "HTML 中缺少带 data-page-id 的页面容器。",
      path: "/htmlPrototype/files"
    });
  }

  for (const attribute of ["data-page-id", "data-module-id", "data-action-id"]) {
    issues.push(...validateUniqueDataAttribute($, attribute));
  }

  if (mode === "with_meta" && state.prototypeSpec && state.prototypeMeta) {
    for (const pageId of state.prototypeSpec.pages.order) {
      if ($(`[data-page-id="${cssEscape(pageId)}"]`).length !== 1) {
        issues.push({
          id: `issue_missing_data_page_${pageId}`,
          severity: "error",
          code: "missing_data_page_id",
          message: `HTML 中缺少页面 ${pageId} 对应的 data-page-id。`,
          entityRef: { entityType: "page", entityId: pageId }
        });
      }
    }

    for (const mapping of [
      ...state.prototypeMeta.pageMappings,
      ...state.prototypeMeta.moduleMappings,
      ...state.prototypeMeta.fieldMappings,
      ...state.prototypeMeta.actionMappings,
      ...state.prototypeMeta.uiStateMappings
    ]) {
      if ($(mapping.domSelector).length !== 1) {
        issues.push({
          id: `issue_mapping_selector_not_unique_${mapping.id}`,
          severity: "error",
          code: "mapping_selector_not_unique",
          message: `PrototypeMeta selector 未命中唯一节点：${mapping.domSelector}`,
          path: `/prototypeMeta/${mapping.id}`
        });
      }
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

function getHtmlContent(state: ProjectState): string | null {
  const htmlPrototype = state.htmlPrototype;
  if (!htmlPrototype) {
    return null;
  }
  return htmlPrototype.files.order.map((id) => htmlPrototype.files.byId[id]).find((file) => file?.type === "html")?.content ?? null;
}

function validateUniqueDataAttribute($: cheerio.CheerioAPI, attribute: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  $(`[${attribute}]`).each((_, element) => {
    const value = $(element).attr(attribute);
    if (!value) return;
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  });

  for (const value of duplicated) {
    issues.push({
      id: `issue_duplicate_${attribute}_${value}`.replace(/[^a-zA-Z0-9_]+/g, "_"),
      severity: "error",
      code: "duplicate_data_attribute",
      message: `${attribute} 必须唯一，发现重复值：${value}`
    });
  }

  return issues;
}

function cssEscape(value: string): string {
  return value.replace(/"/g, '\\"');
}
