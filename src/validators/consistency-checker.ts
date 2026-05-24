import type { ConsistencyIssue, ProjectState } from "../types/index.js";
import { calculateSourceHash, getSourceSliceForArtifact } from "../renderers/renderer-utils.js";

export function runConsistencyCheck(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  if (state.prototypeSpec && state.htmlPrototype) {
    const html = state.htmlPrototype.files.order.map((id) => state.htmlPrototype?.files.byId[id]?.content ?? "").join("\n");
    for (const pageId of state.prototypeSpec.pages.order) {
      if (!html.includes(`data-page-id="${pageId}"`)) {
        issues.push({
          id: `issue_missing_html_page_${pageId}`,
          severity: "error",
          code: "prototype_page_missing_in_html",
          message: `PrototypeSpec 中存在页面 ${pageId}，但 HTML 中缺少对应 data-page-id。`,
          entityRef: { entityType: "page", entityId: pageId },
          sourceArtifact: "htmlPrototype",
          fixSuggestion: "请重新生成 HTML 原型或原型元数据。"
        });
      }
    }
  }

  issues.push(...checkPrdTargets(state));
  issues.push(...checkAnnotationRefs(state));
  issues.push(...checkTestCaseRefs(state));
  issues.push(...checkFlowActionRefs(state));
  issues.push(...checkPermissionCoverage(state));
  issues.push(...checkArtifactManifestStaleness(state));
  issues.push(...checkPageNameConsistency(state));
  issues.push(...checkInteractionCoverage(state));

  return issues;
}

function checkPrdTargets(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.prdSpec) return issues;

  for (const section of Object.values(state.prdSpec.sections.byId)) {
    if (section.target && !entityExists(state, section.target.entityType, section.target.entityId)) {
      issues.push({
        id: `issue_prd_target_missing_${section.id}`,
        severity: "error",
        code: "prd_section_target_missing",
        message: `PRD 章节 ${section.title} 引用了不存在的实体：${section.target.entityType}/${section.target.entityId}`,
        entityRef: { entityType: "prd_section", entityId: section.id },
        fixSuggestion: "请修正 PRD 章节的目标引用或重新生成 PRD。"
      });
    }
  }

  return issues;
}

function checkAnnotationRefs(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.prototypeAnnotationSpec) return issues;
  const html = getHtml(state);

  for (const annotation of Object.values(state.prototypeAnnotationSpec.annotations.byId)) {
    for (const sectionId of annotation.prdSectionIds) {
      if (state.prdSpec && !state.prdSpec.sections.byId[sectionId]) {
        issues.push({
          id: `issue_annotation_missing_prd_${annotation.id}_${sectionId}`,
          severity: "error",
          code: "annotation_prd_section_missing",
          message: `标注 ${annotation.title} 引用了不存在的 PRD 章节：${sectionId}`,
          entityRef: { entityType: "prototype_annotation", entityId: annotation.id },
          fixSuggestion: "请重新生成原型标注结构。"
        });
      }
    }

    if (html && !html.includes(selectorDataValue(annotation.targetSelector))) {
      issues.push({
        id: `issue_annotation_selector_missing_${annotation.id}`,
        severity: "error",
        code: "annotation_selector_missing_in_html",
        message: `标注 ${annotation.title} 的 selector 无法在 HTML 中找到对应节点。`,
        entityRef: { entityType: "prototype_annotation", entityId: annotation.id },
        fixSuggestion: "请重新生成 HTML 原型或原型标注结构。"
      });
    }
  }

  return issues;
}

function checkTestCaseRefs(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.testCaseSpec) return issues;

  for (const suite of Object.values(state.testCaseSpec.testSuites.byId)) {
    for (const testCase of Object.values(suite.cases.byId)) {
      for (const pageId of testCase.relatedPageIds) {
        if (state.prototypeSpec && !state.prototypeSpec.pages.byId[pageId]) {
          issues.push({
            id: `issue_test_case_missing_page_${testCase.id}_${pageId}`,
            severity: "error",
            code: "test_case_page_missing",
            message: `测试用例 ${testCase.title} 引用了不存在的页面：${pageId}`,
            entityRef: { entityType: "test_case", entityId: testCase.id },
            fixSuggestion: "请修正测试用例引用或重新生成测试用例结构。"
          });
        }
      }

      for (const actionId of testCase.relatedActionIds) {
        if (!actionExists(state, actionId)) {
          issues.push({
            id: `issue_test_case_missing_action_${testCase.id}_${actionId}`,
            severity: "error",
            code: "test_case_action_missing",
            message: `测试用例 ${testCase.title} 引用了不存在的操作：${actionId}`,
            entityRef: { entityType: "test_case", entityId: testCase.id },
            fixSuggestion: "请修正测试用例引用或重新生成测试用例结构。"
          });
        }
      }
    }
  }

  return issues;
}

function checkFlowActionRefs(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.flowSpec) return issues;

  for (const machine of Object.values(state.flowSpec.stateMachines.byId)) {
    for (const transition of Object.values(machine.transitions.byId)) {
      if (!actionExists(state, transition.triggerActionId)) {
        issues.push({
          id: `issue_transition_action_missing_${transition.id}`,
          severity: "error",
          code: "flow_transition_action_missing",
          message: `状态流转 ${transition.name} 没有关联有效操作：${transition.triggerActionId}`,
          entityRef: { entityType: "state_transition", entityId: transition.id },
          fixSuggestion: "请修正流程结构中的流转触发操作。"
        });
      }
    }
  }

  return issues;
}

function checkPermissionCoverage(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.prototypeSpec || !state.testCaseSpec) return issues;

  const coveredActions = new Set<string>();
  for (const suite of Object.values(state.testCaseSpec.testSuites.byId)) {
    for (const testCase of Object.values(suite.cases.byId)) {
      testCase.relatedActionIds.forEach((id) => coveredActions.add(id));
    }
  }

  for (const permission of Object.values(state.prototypeSpec.permissions.byId)) {
    if (permission.targetType === "action" && !coveredActions.has(permission.targetId)) {
      issues.push({
        id: `issue_permission_without_test_${permission.id}`,
        severity: "warning",
        code: "permission_without_test_case",
        message: `权限规则 ${permission.id} 缺少对应操作测试覆盖。`,
        entityRef: { entityType: "permission", entityId: permission.id },
        fixSuggestion: "请补充权限测试用例或重新生成测试用例结构。"
      });
    }
  }

  return issues;
}

function checkArtifactManifestStaleness(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  for (const item of Object.values(state.artifactManifest.items.byId)) {
    const currentSourceHash = calculateSourceHash(state, getSourceSliceForArtifact(state, item.artifactType), item.rendererVersion);
    if (item.sourceHash !== currentSourceHash) {
      issues.push({
        id: `issue_artifact_stale_${item.id}`,
        severity: "warning",
        code: "artifact_source_hash_stale",
        message: `产物 ${item.fileName} 的 sourceHash 与当前 ProjectState 不一致。`,
        sourceArtifact: item.artifactType,
        fixSuggestion: "请运行 pm-html-skill render 重新渲染产物。"
      });
    }
  }

  return issues;
}

function checkPageNameConsistency(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.prototypeSpec || !state.htmlPrototype) return issues;

  const htmlFiles = state.htmlPrototype.files.order
    .map((id) => state.htmlPrototype!.files.byId[id]?.fileName ?? "")
    .filter((f) => f.endsWith(".html"));

  if (htmlFiles.length <= 1) return issues;

  for (const pageId of state.prototypeSpec.pages.order) {
    const normalizedId = pageId.replace(/^page_/, "").replace(/_/g, "").toLowerCase();
    const hasMatch = htmlFiles.some((f) => {
      const normalizedFile = f.replace(/\.(html?)$/, "").replace(/[\s_-]/g, "").toLowerCase();
      return normalizedFile.includes(normalizedId) || normalizedId.includes(normalizedFile);
    });
    if (!hasMatch) {
      const page = state.prototypeSpec.pages.byId[pageId];
      issues.push({
        id: `issue_page_name_no_file_${pageId}`,
        severity: "warning",
        code: "page_name_no_matching_file",
        message: `页面 "${page.name}" (${pageId}) 没有匹配的 HTML 原型文件。`,
        entityRef: { entityType: "page", entityId: pageId },
        fixSuggestion: "确保原型 HTML 文件名与页面 ID 对应，或重新生成原型。"
      });
    }
  }

  return issues;
}

function checkInteractionCoverage(state: ProjectState): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  if (!state.prototypeSpec) return issues;

  const interactionRequiredTypes = new Set(["filter", "table", "form", "tabs", "approval_panel"]);

  for (const pageId of state.prototypeSpec.pages.order) {
    const page = state.prototypeSpec.pages.byId[pageId];
    for (const moduleId of page.modules.order) {
      const module = page.modules.byId[moduleId];
      if (interactionRequiredTypes.has(module.type) && (!module.interactions || module.interactions.length === 0)) {
        issues.push({
          id: `issue_module_no_interactions_${moduleId}`,
          severity: "warning",
          code: "module_missing_interactions",
          message: `模块 "${module.name}" (${moduleId}, 类型: ${module.type}) 未声明交互模式。交互类模块必须在 interactions 字段中声明需要的交互模式。`,
          entityRef: { entityType: "module", entityId: moduleId },
          fixSuggestion: `请为 ${module.type} 类型模块添加 interactions 字段。参考 references/b2b-interaction-patterns.md 中的模式 ID。`
        });
      }
    }
  }

  return issues;
}

function getHtml(state: ProjectState): string {
  return state.htmlPrototype?.files.order.map((id) => state.htmlPrototype?.files.byId[id]?.content ?? "").join("\n") ?? "";
}

function selectorDataValue(selector: string): string {
  const match = selector.match(/data-[^=]+="([^"]+)"/);
  return match?.[1] ?? selector;
}

function entityExists(state: ProjectState, entityType: string, entityId: string): boolean {
  if (entityType === "page") return Boolean(state.prototypeSpec?.pages.byId[entityId]);
  if (entityType === "module") return moduleExists(state, entityId);
  if (entityType === "field") return fieldExists(state, entityId);
  if (entityType === "action") return actionExists(state, entityId);
  if (entityType === "permission") return Boolean(state.prototypeSpec?.permissions.byId[entityId]);
  if (entityType === "state_transition") return transitionExists(state, entityId);
  if (entityType === "feature") return Boolean(state.requirementCard?.features.byId[entityId]);
  if (entityType === "acceptance_criterion") return acceptanceCriterionExists(state, entityId);
  return true;
}

function moduleExists(state: ProjectState, moduleId: string): boolean {
  return Object.values(state.prototypeSpec?.pages.byId ?? {}).some((page) => Boolean(page.modules.byId[moduleId]));
}

function fieldExists(state: ProjectState, fieldId: string): boolean {
  return Object.values(state.prototypeSpec?.pages.byId ?? {}).some((page) =>
    Object.values(page.modules.byId).some((module) => Boolean(module.fields.byId[fieldId]))
  );
}

function actionExists(state: ProjectState, actionId: string): boolean {
  return Object.values(state.prototypeSpec?.pages.byId ?? {}).some((page) => Boolean(page.actions.byId[actionId]));
}

function transitionExists(state: ProjectState, transitionId: string): boolean {
  return Object.values(state.flowSpec?.stateMachines.byId ?? {}).some((machine) => Boolean(machine.transitions.byId[transitionId]));
}

function acceptanceCriterionExists(state: ProjectState, criterionId: string): boolean {
  return Object.values(state.requirementCard?.features.byId ?? {}).some((feature) => Boolean(feature.acceptanceCriteria.byId[criterionId]));
}
