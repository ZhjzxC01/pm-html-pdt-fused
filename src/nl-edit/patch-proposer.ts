import type {
  PageAction,
  ProjectState,
  StateArtifactType,
  SupportedJsonPatchOperation,
  TestCaseSpec
} from "../types/index.js";
import { resolveIntent } from "./intent-resolver.js";
import { resolveStateQueries } from "./query-resolver.js";
import type { PatchProposal, SemanticAction } from "./state-query.js";

export function proposePatch(state: ProjectState, instruction: string): PatchProposal {
  const intent = resolveIntent(instruction);
  const resolved = resolveStateQueries(state, intent.queries);
  const patches = buildPatches(state, intent.semanticAction);
  const artifactTypes = inferArtifactTypes(patches);

  return {
    id: `proposal_${state.version + 1}_${Date.now()}`,
    projectId: state.id,
    baseVersion: state.version,
    naturalLanguageInstruction: instruction,
    semanticAction: intent.semanticAction,
    queries: intent.queries,
    targetScope: {
      artifactTypes,
      targetIds: Array.from(new Set(resolved.map((entity) => entity.id)))
    },
    patches,
    dirtyPolicy: {
      mark: artifactTypes,
      useDependencyPropagation: true
    },
    validationProfile: "nl_edit",
    riskLevel: patches.length > 3 ? "medium" : "low",
    requiresUserConfirmation: true,
    explanation: explainAction(intent.semanticAction),
    expectedImpact: buildExpectedImpact(artifactTypes)
  };
}

function buildPatches(state: ProjectState, action: SemanticAction): SupportedJsonPatchOperation[] {
  switch (action.type) {
    case "add_action_to_pages":
      return buildAddActionPatches(state, action);
    case "rename_action":
      return buildRenameActionPatches(state, action.fromName, action.toName);
    case "set_field_required":
      return buildSetFieldRequiredPatches(state, action.fieldNameOrId, action.required);
    case "add_permission_rule":
      return buildAddPermissionPatches(state, action.roleNameOrId, action.targetActionNameOrId, action.effect);
    case "add_test_case":
      return buildAddTestCasePatches(state, action.title, action.relatedActionNameOrId, action.priority);
    case "add_field_to_module":
      return buildAddFieldToModulePatches(state, action);
    case "add_module_to_page":
      return buildAddModuleToPagePatches(state, action);
    case "add_filter_field":
      return buildAddFilterFieldPatches(state, action);
    case "change_field_type":
      return buildChangeFieldTypePatches(state, action.fieldNameOrId, action.newType);
    case "rename_field":
      return buildRenameFieldPatches(state, action.fromName, action.toName);
    case "add_page_navigation":
      return buildAddPageNavigationPatches(state, action);
    case "add_ui_state":
      return buildAddUiStatePatches(state, action);
    case "modify_permission":
      return buildModifyPermissionPatches(state, action);
    case "add_approval_node":
      return buildAddApprovalNodePatches(state, action);
    case "remove_entity":
      return buildRemoveEntityPatches(state, action);
    case "add_prd_section":
      return buildAddPrdSectionPatches(state, action);
  }
}

function buildAddActionPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_action_to_pages" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增页面操作。");
  }

  const targetPages = state.prototypeSpec.pages.order
    .map((id) => state.prototypeSpec?.pages.byId[id])
    .filter((page) => page && (action.pageScope === "all_list_pages" ? page.type === "list" : matchesNameOrId(page, action.pageNameOrId)));

  if (targetPages.length === 0) {
    throw new Error("未找到要新增操作的目标页面。");
  }

  const patches: SupportedJsonPatchOperation[] = [];
  const permissions = structuredClone(state.prototypeSpec.permissions);
  const role = action.allowedRoleNameOrId ? findRole(state, action.allowedRoleNameOrId) : undefined;

  for (const page of targetPages) {
    if (!page) continue;
    const actions = structuredClone(page.actions);
    const actionId = uniqueId(`action_${slug(action.actionName)}_${page.id.replace(/^page_/, "")}`, actions.byId);
    const permissionIds: string[] = [];

    if (role) {
      const permissionId = uniqueId(`permission_${role.id.replace(/^role_/, "")}_${slug(action.actionName)}_${page.id.replace(/^page_/, "")}`, permissions.byId);
      permissions.byId[permissionId] = {
        id: permissionId,
        roleId: role.id,
        targetType: "action",
        targetId: actionId,
        effect: "allow",
        noPermissionBehavior: "hide",
        reason: `仅${role.name}可以使用${action.actionName}`
      };
      permissions.order.push(permissionId);
      permissionIds.push(permissionId);
    }

    const newAction: PageAction = {
      id: actionId,
      name: action.actionName,
      type: action.actionType,
      placement: action.placement,
      triggerComponent: "button",
      priority: "P1",
      permissionRuleIds: permissionIds,
      sourceRefs: []
    };
    actions.byId[actionId] = newAction;
    actions.order.push(actionId);
    patches.push({ op: "replace", path: `/prototypeSpec/pages/byId/${page.id}/actions`, value: actions });
  }

  if (role) {
    patches.push({ op: "replace", path: "/prototypeSpec/permissions", value: permissions });
  }

  return patches;
}

function buildRenameActionPatches(state: ProjectState, fromName: string, toName: string): SupportedJsonPatchOperation[] {
  const matches = findActions(state, fromName);
  if (matches.length === 0) {
    throw new Error(`未找到按钮或操作：${fromName}`);
  }

  return matches.map((match) => ({
    op: "replace",
    path: `/prototypeSpec/pages/byId/${match.pageId}/actions/byId/${match.action.id}/name`,
    value: toName
  }));
}

function buildSetFieldRequiredPatches(
  state: ProjectState,
  fieldNameOrId: string,
  required: boolean
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法修改字段。");
  }

  const patches: SupportedJsonPatchOperation[] = [];
  for (const pageId of state.prototypeSpec.pages.order) {
    const page = state.prototypeSpec.pages.byId[pageId];
    for (const moduleId of page.modules.order) {
      const module = page.modules.byId[moduleId];
      for (const fieldId of module.fields.order) {
        const field = module.fields.byId[fieldId];
        if (matchesNameOrId(field, fieldNameOrId)) {
          patches.push({
            op: "replace",
            path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}/fields/byId/${fieldId}/required`,
            value: required
          });
        }
      }
    }
  }

  if (patches.length === 0) {
    throw new Error(`未找到字段：${fieldNameOrId}`);
  }
  return patches;
}

function buildAddPermissionPatches(
  state: ProjectState,
  roleNameOrId: string,
  targetActionNameOrId: string,
  effect: "allow" | "deny" | "hidden" | "disabled"
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增权限规则。");
  }

  const role = findRole(state, roleNameOrId);
  if (!role) {
    throw new Error(`未找到角色：${roleNameOrId}`);
  }

  const actions = findActions(state, targetActionNameOrId);
  if (actions.length === 0) {
    throw new Error(`未找到目标操作：${targetActionNameOrId}`);
  }

  const patches: SupportedJsonPatchOperation[] = [];
  const permissions = structuredClone(state.prototypeSpec.permissions);
  for (const match of actions) {
    const permissionId = uniqueId(
      `permission_${role.id.replace(/^role_/, "")}_${slug(match.action.name)}_${match.action.id.replace(/^action_/, "")}`,
      permissions.byId
    );
    permissions.byId[permissionId] = {
      id: permissionId,
      roleId: role.id,
      targetType: "action",
      targetId: match.action.id,
      effect,
      noPermissionBehavior: effect === "allow" ? "hide" : undefined,
      reason: `${role.name} ${effect === "allow" ? "可以" : "不可"}使用${match.action.name}`
    };
    permissions.order.push(permissionId);

    const permissionRuleIds = Array.from(new Set([...match.action.permissionRuleIds, permissionId]));
    patches.push({
      op: "replace",
      path: `/prototypeSpec/pages/byId/${match.pageId}/actions/byId/${match.action.id}/permissionRuleIds`,
      value: permissionRuleIds
    });
  }

  patches.push({ op: "replace", path: "/prototypeSpec/permissions", value: permissions });
  return patches;
}

function buildAddTestCasePatches(
  state: ProjectState,
  title: string,
  relatedActionNameOrId: string | undefined,
  priority: "P0" | "P1" | "P2"
): SupportedJsonPatchOperation[] {
  if (!state.testCaseSpec) {
    throw new Error("当前 ProjectState 缺少 testCaseSpec，无法新增测试用例。");
  }

  const testCaseSpec: TestCaseSpec = structuredClone(state.testCaseSpec);
  const suiteId = findOrCreateFunctionalSuite(testCaseSpec);
  const suite = testCaseSpec.testSuites.byId[suiteId];
  const relatedActions = relatedActionNameOrId ? findActions(state, relatedActionNameOrId) : [];
  const caseId = uniqueId(`test_case_${slug(title)}`, suite.cases.byId);
  suite.cases.byId[caseId] = {
    id: caseId,
    title,
    preconditions: ["用户已登录并具备对应角色权限"],
    steps: relatedActionNameOrId ? [`进入相关页面`, `点击${relatedActionNameOrId}`] : ["进入相关页面", "执行新增测试步骤"],
    expectedResults: ["系统行为符合产品规则，页面反馈清晰"],
    relatedPageIds: Array.from(new Set(relatedActions.map((item) => item.pageId))),
    relatedActionIds: relatedActions.map((item) => item.action.id),
    relatedAcceptanceCriterionIds: [],
    priority
  };
  suite.cases.order.push(caseId);

  return [{ op: "replace", path: "/testCaseSpec", value: testCaseSpec }];
}

function findOrCreateFunctionalSuite(testCaseSpec: TestCaseSpec): string {
  const existing = testCaseSpec.testSuites.order.find((id) => testCaseSpec.testSuites.byId[id]?.type === "functional");
  if (existing) {
    return existing;
  }

  const suiteId = "test_suite_nl_edit_functional";
  testCaseSpec.testSuites.byId[suiteId] = {
    id: suiteId,
    name: "自然语言新增功能测试",
    type: "functional",
    cases: { byId: {}, order: [] }
  };
  testCaseSpec.testSuites.order.push(suiteId);
  return suiteId;
}

function buildAddFieldToModulePatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_field_to_module" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增字段。");
  }

  const page = findPageByNameOrId(state, action.pageNameOrId);
  if (!page) {
    throw new Error(`未找到页面：${action.pageNameOrId}`);
  }

  const module = findModuleByNameOrId(page, action.moduleNameOrId);
  if (!module) {
    throw new Error(`未找到模块：${action.moduleNameOrId}`);
  }

  const fields = structuredClone(module.fields);
  const fieldId = uniqueId(`field_${slug(action.fieldName)}`, fields.byId);
  fields.byId[fieldId] = {
    id: fieldId,
    fieldKey: action.fieldKey,
    name: action.fieldName,
    type: action.fieldType as "text" | "number" | "money" | "date" | "datetime" | "select" | "multi_select" | "textarea" | "file" | "user" | "department" | "status",
    required: action.required
  };
  fields.order.push(fieldId);

  return [{
    op: "replace",
    path: `/prototypeSpec/pages/byId/${page.id}/modules/byId/${module.id}/fields`,
    value: fields
  }];
}

function buildAddModuleToPagePatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_module_to_page" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增模块。");
  }

  const page = findPageByNameOrId(state, action.pageNameOrId);
  if (!page) {
    throw new Error(`未找到页面：${action.pageNameOrId}`);
  }

  const modules = structuredClone(page.modules);
  const moduleId = uniqueId(`module_${slug(action.moduleName)}`, modules.byId);
  modules.byId[moduleId] = {
    id: moduleId,
    name: action.moduleName,
    type: action.moduleType as "filter" | "table" | "form" | "detail_card" | "tabs" | "steps" | "approval_panel" | "log_timeline" | "empty_state" | "exception_state",
    fields: { byId: {}, order: [] },
    sourceRefs: []
  };
  modules.order.push(moduleId);

  return [{
    op: "replace",
    path: `/prototypeSpec/pages/byId/${page.id}/modules`,
    value: modules
  }];
}

function buildAddFilterFieldPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_filter_field" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增筛选条件。");
  }

  const page = findPageByNameOrId(state, action.pageNameOrId);
  if (!page) {
    throw new Error(`未找到页面：${action.pageNameOrId}`);
  }

  const filterModule = page.modules.order
    .map((id) => page.modules.byId[id])
    .find((m) => m?.type === "filter");

  if (!filterModule) {
    throw new Error(`页面"${page.name}"中未找到筛选模块。`);
  }

  const fields = structuredClone(filterModule.fields);
  const fieldId = uniqueId(`field_filter_${slug(action.fieldName)}`, fields.byId);
  fields.byId[fieldId] = {
    id: fieldId,
    fieldKey: action.fieldKey,
    name: action.fieldName,
    type: action.fieldType as "text" | "number" | "money" | "date" | "datetime" | "select" | "multi_select" | "textarea" | "file" | "user" | "department" | "status",
    required: false
  };
  fields.order.push(fieldId);

  return [{
    op: "replace",
    path: `/prototypeSpec/pages/byId/${page.id}/modules/byId/${filterModule.id}/fields`,
    value: fields
  }];
}

function buildChangeFieldTypePatches(
  state: ProjectState,
  fieldNameOrId: string,
  newType: string
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法修改字段类型。");
  }

  const patches: SupportedJsonPatchOperation[] = [];
  for (const pageId of state.prototypeSpec.pages.order) {
    const page = state.prototypeSpec.pages.byId[pageId];
    for (const moduleId of page.modules.order) {
      const module = page.modules.byId[moduleId];
      for (const fieldId of module.fields.order) {
        const field = module.fields.byId[fieldId];
        if (matchesNameOrId(field, fieldNameOrId)) {
          patches.push({
            op: "replace",
            path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}/fields/byId/${fieldId}/type`,
            value: newType
          });
        }
      }
    }
  }

  if (patches.length === 0) {
    throw new Error(`未找到字段：${fieldNameOrId}`);
  }
  return patches;
}

function buildRenameFieldPatches(state: ProjectState, fromName: string, toName: string): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法重命名字段。");
  }

  const patches: SupportedJsonPatchOperation[] = [];
  for (const pageId of state.prototypeSpec.pages.order) {
    const page = state.prototypeSpec.pages.byId[pageId];
    for (const moduleId of page.modules.order) {
      const module = page.modules.byId[moduleId];
      for (const fieldId of module.fields.order) {
        const field = module.fields.byId[fieldId];
        if (field.name === fromName) {
          patches.push({
            op: "replace",
            path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}/fields/byId/${fieldId}/name`,
            value: toName
          });
        }
      }
    }
  }

  if (patches.length === 0) {
    throw new Error(`未找到字段：${fromName}`);
  }
  return patches;
}

function buildAddPageNavigationPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_page_navigation" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增导航。");
  }

  const fromPage = findPageByNameOrId(state, action.fromPageNameOrId);
  const toPage = findPageByNameOrId(state, action.toPageNameOrId);
  if (!fromPage) {
    throw new Error(`未找到源页面：${action.fromPageNameOrId}`);
  }
  if (!toPage) {
    throw new Error(`未找到目标页面：${action.toPageNameOrId}`);
  }

  const triggerAction = findActionByNameOrId(state, action.triggerActionNameOrId);
  const triggerActionId = triggerAction?.action.id ?? `action_nav_${fromPage.id}_${toPage.id}`;

  const navigation = structuredClone(state.prototypeSpec.navigation);
  const navId = uniqueId(`nav_${fromPage.id}_${toPage.id}`, navigation.byId);
  navigation.byId[navId] = {
    id: navId,
    fromPageId: fromPage.id,
    toPageId: toPage.id,
    triggerActionId,
    description: `从${fromPage.name}导航到${toPage.name}`
  };
  navigation.order.push(navId);

  return [{
    op: "replace",
    path: "/prototypeSpec/navigation",
    value: navigation
  }];
}

function buildAddUiStatePatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_ui_state" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法新增 UI 状态。");
  }

  const page = findPageByNameOrId(state, action.pageNameOrId);
  if (!page) {
    throw new Error(`未找到页面：${action.pageNameOrId}`);
  }

  const uiStates = structuredClone(page.uiStates);
  const stateId = uniqueId(`ui_state_${action.stateType}_${page.id.replace(/^page_/, "")}`, uiStates.byId);
  uiStates.byId[stateId] = {
    id: stateId,
    type: action.stateType as "normal" | "loading" | "empty" | "error" | "no_permission",
    name: action.stateName,
    description: action.description
  };
  uiStates.order.push(stateId);

  return [{
    op: "replace",
    path: `/prototypeSpec/pages/byId/${page.id}/uiStates`,
    value: uiStates
  }];
}

function buildModifyPermissionPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "modify_permission" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法修改权限。");
  }

  const patches: SupportedJsonPatchOperation[] = [];
  const permissions = structuredClone(state.prototypeSpec.permissions);

  for (const permId of permissions.order) {
    const perm = permissions.byId[permId];
    if (perm && (perm.id === action.permissionIdOrTarget || perm.targetId?.includes(action.permissionIdOrTarget))) {
      if (action.changes.effect) {
        patches.push({
          op: "replace",
          path: `/prototypeSpec/permissions/byId/${permId}/effect`,
          value: action.changes.effect
        });
      }
      if (action.changes.roleNameOrId) {
        const role = findRole(state, action.changes.roleNameOrId);
        if (role) {
          patches.push({
            op: "replace",
            path: `/prototypeSpec/permissions/byId/${permId}/roleId`,
            value: role.id
          });
        }
      }
    }
  }

  if (patches.length === 0) {
    throw new Error(`未找到权限规则：${action.permissionIdOrTarget}`);
  }
  return patches;
}

function buildAddApprovalNodePatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_approval_node" }>
): SupportedJsonPatchOperation[] {
  if (!state.flowSpec) {
    throw new Error("当前 ProjectState 缺少 flowSpec，无法新增审批节点。");
  }

  const smId = state.flowSpec.stateMachines.order[0];
  if (!smId) {
    throw new Error("未找到状态机。");
  }

  const sm = structuredClone(state.flowSpec.stateMachines.byId[smId]);
  const stateId = uniqueId(`state_${slug(action.nodeName)}`, sm.states.byId);
  sm.states.byId[stateId] = {
    id: stateId,
    name: action.nodeName,
    type: "intermediate",
    description: `${action.nodeName}节点`
  };
  sm.states.order.push(stateId);

  const afterState = action.afterStateIdOrName
    ? sm.states.order.find((sid) => {
        const s = sm.states.byId[sid];
        return s && (s.id === action.afterStateIdOrName || s.name === action.afterStateIdOrName);
      })
    : undefined;

  if (afterState) {
    const existingTransitions = sm.transitions.order
      .map((tid) => sm.transitions.byId[tid])
      .filter((t) => t && t.toStateId === afterState);
    for (const t of existingTransitions) {
      if (t) {
        const transId = uniqueId(`transition_${t.fromStateId}_${stateId}`, sm.transitions.byId);
        sm.transitions.byId[transId] = {
          id: transId,
          name: `提交至${action.nodeName}`,
          fromStateId: t.fromStateId,
          toStateId: stateId,
          triggerActionId: t.triggerActionId,
          allowedRoleIds: t.allowedRoleIds
        };
        sm.transitions.order.push(transId);
      }
    }
  }

  return [{
    op: "replace",
    path: `/flowSpec/stateMachines/byId/${smId}`,
    value: sm
  }];
}

function buildRemoveEntityPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "remove_entity" }>
): SupportedJsonPatchOperation[] {
  if (!state.prototypeSpec) {
    throw new Error("当前 ProjectState 缺少 prototypeSpec，无法删除实体。");
  }

  const patches: SupportedJsonPatchOperation[] = [];

  if (action.entityType === "action") {
    for (const pageId of state.prototypeSpec.pages.order) {
      const page = state.prototypeSpec.pages.byId[pageId];
      const actions = structuredClone(page.actions);
      let removed = false;
      for (const actionId of actions.order) {
        const act = actions.byId[actionId];
        if (act && matchesNameOrId(act, action.entityNameOrId)) {
          delete actions.byId[actionId];
          removed = true;
        }
      }
      if (removed) {
        actions.order = actions.order.filter((id) => actions.byId[id]);
        patches.push({
          op: "replace",
          path: `/prototypeSpec/pages/byId/${pageId}/actions`,
          value: actions
        });
      }
    }
  } else if (action.entityType === "field") {
    for (const pageId of state.prototypeSpec.pages.order) {
      const page = state.prototypeSpec.pages.byId[pageId];
      for (const moduleId of page.modules.order) {
        const module = page.modules.byId[moduleId];
        const fields = structuredClone(module.fields);
        let removed = false;
        for (const fieldId of fields.order) {
          const field = fields.byId[fieldId];
          if (field && matchesNameOrId(field, action.entityNameOrId)) {
            delete fields.byId[fieldId];
            removed = true;
          }
        }
        if (removed) {
          fields.order = fields.order.filter((id) => fields.byId[id]);
          patches.push({
            op: "replace",
            path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}/fields`,
            value: fields
          });
        }
      }
    }
  } else if (action.entityType === "permission") {
    const permissions = structuredClone(state.prototypeSpec.permissions);
    let removed = false;
    for (const permId of permissions.order) {
      const perm = permissions.byId[permId];
      if (perm && (perm.id === action.entityNameOrId || perm.targetId?.includes(action.entityNameOrId))) {
        delete permissions.byId[permId];
        removed = true;
      }
    }
    if (removed) {
      permissions.order = permissions.order.filter((id) => permissions.byId[id]);
      patches.push({
        op: "replace",
        path: "/prototypeSpec/permissions",
        value: permissions
      });
    }
  } else if (action.entityType === "test_case" && state.testCaseSpec) {
    const testCaseSpec = structuredClone(state.testCaseSpec);
    let removed = false;
    for (const suiteId of testCaseSpec.testSuites.order) {
      const suite = testCaseSpec.testSuites.byId[suiteId];
      if (suite) {
        for (const caseId of suite.cases.order) {
          const testCase = suite.cases.byId[caseId];
          if (testCase && matchesNameOrId(testCase, action.entityNameOrId)) {
            delete suite.cases.byId[caseId];
            removed = true;
          }
        }
        if (removed) {
          suite.cases.order = suite.cases.order.filter((id) => suite.cases.byId[id]);
        }
      }
    }
    if (removed) {
      patches.push({
        op: "replace",
        path: "/testCaseSpec",
        value: testCaseSpec
      });
    }
  }

  if (patches.length === 0) {
    throw new Error(`未找到要删除的${action.entityType}：${action.entityNameOrId}`);
  }
  return patches;
}

function buildAddPrdSectionPatches(
  state: ProjectState,
  action: Extract<SemanticAction, { type: "add_prd_section" }>
): SupportedJsonPatchOperation[] {
  if (!state.prdSpec) {
    throw new Error("当前 ProjectState 缺少 prdSpec，无法新增 PRD 章节。");
  }

  const prdSpec = structuredClone(state.prdSpec);
  const sectionId = uniqueId(`prd_section_${slug(action.title)}`, prdSpec.sections.byId);
  prdSpec.sections.byId[sectionId] = {
    id: sectionId,
    parentId: null,
    title: action.title,
    type: "appendix",
    target: action.targetEntityType && action.targetEntityId
      ? { entityType: action.targetEntityType as "goal" | "role" | "business_object" | "scenario" | "feature" | "acceptance_criterion" | "page" | "module" | "field" | "action" | "permission" | "ui_state" | "business_state" | "state_transition" | "flow" | "prd_section" | "test_case" | "prototype_annotation", entityId: action.targetEntityId }
      : undefined,
    content: action.content,
    sortOrder: prdSpec.sections.order.length,
    sourceRefs: [],
    assumptions: [],
    pendingQuestions: []
  };
  prdSpec.sections.order.push(sectionId);

  return [{
    op: "replace",
    path: "/prdSpec",
    value: prdSpec
  }];
}

function findPageByNameOrId(state: ProjectState, nameOrId: string) {
  if (!state.prototypeSpec) return undefined;
  return state.prototypeSpec.pages.order
    .map((id) => state.prototypeSpec?.pages.byId[id])
    .find((page) => page && matchesNameOrId(page, nameOrId));
}

function findModuleByNameOrId(page: { modules: { byId: Record<string, { id: string; name: string; fields: { byId: Record<string, unknown>; order: string[] } }>; order: string[] } }, nameOrId: string) {
  return page.modules.order
    .map((id) => page.modules.byId[id])
    .find((module) => module && matchesNameOrId(module, nameOrId));
}

function findActionByNameOrId(state: ProjectState, nameOrId: string) {
  const results = findActions(state, nameOrId);
  return results.length > 0 ? results[0] : undefined;
}

function findActions(state: ProjectState, nameOrId: string): Array<{ pageId: string; action: PageAction }> {
  if (!state.prototypeSpec) {
    return [];
  }
  const matches: Array<{ pageId: string; action: PageAction }> = [];
  for (const pageId of state.prototypeSpec.pages.order) {
    const page = state.prototypeSpec.pages.byId[pageId];
    for (const actionId of page.actions.order) {
      const action = page.actions.byId[actionId];
      if (matchesNameOrId(action, nameOrId)) {
        matches.push({ pageId, action });
      }
    }
  }
  return matches;
}

function findRole(state: ProjectState, nameOrId: string): { id: string; name: string } | undefined {
  const roles = state.requirementCard?.roles;
  if (!roles) {
    return undefined;
  }
  return roles.order.map((id) => roles.byId[id]).find((role) => matchesNameOrId(role, nameOrId));
}

function matchesNameOrId(value: { id: string; name?: string }, nameOrId?: string): boolean {
  if (!nameOrId) {
    return false;
  }
  return value.id === nameOrId || value.name === nameOrId || value.id.includes(nameOrId) || Boolean(value.name?.includes(nameOrId));
}

function uniqueId(base: string, existing: Record<string, unknown>): string {
  let candidate = base;
  let index = 2;
  while (existing[candidate]) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  return candidate;
}

function slug(value: string): string {
  const known: Record<string, string> = {
    导出: "export",
    批量导出: "batch_export",
    提交审批: "submit_approval",
    提交报销审批: "submit_expense_approval",
    管理员导出权限测试用例: "admin_export_permission"
  };
  const normalized =
    known[value] ??
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  return normalized || "nl_edit";
}

function inferArtifactTypes(patches: SupportedJsonPatchOperation[]): StateArtifactType[] {
  const artifacts = new Set<StateArtifactType>();
  for (const patch of patches) {
    if (patch.path.startsWith("/prototypeSpec")) {
      artifacts.add("prototypeSpec");
    }
    if (patch.path.startsWith("/testCaseSpec")) {
      artifacts.add("testCaseSpec");
    }
    if (patch.path.startsWith("/flowSpec")) {
      artifacts.add("flowSpec");
    }
    if (patch.path.startsWith("/prdSpec")) {
      artifacts.add("prdSpec");
    }
  }
  return Array.from(artifacts);
}

function explainAction(action: SemanticAction): string {
  switch (action.type) {
    case "add_action_to_pages":
      return `为目标页面新增${action.actionName}操作${action.allowedRoleNameOrId ? `，并限制${action.allowedRoleNameOrId}可用` : ""}。`;
    case "rename_action":
      return `将操作文案从\u201c${action.fromName}\u201d修改为\u201c${action.toName}\u201d。`;
    case "set_field_required":
      return `将字段\u201c${action.fieldNameOrId}\u201d设置为${action.required ? "必填" : "非必填"}。`;
    case "add_permission_rule":
      return `为${action.roleNameOrId}新增 ${action.targetActionNameOrId} 的权限规则。`;
    case "add_test_case":
      return `新增测试用例\u201c${action.title}\u201d。`;
    case "add_field_to_module":
      return `在${action.pageNameOrId}的${action.moduleNameOrId}中新增字段\u201c${action.fieldName}\u201d（${action.fieldType}${action.required ? "，必填" : ""}）。`;
    case "add_module_to_page":
      return `在${action.pageNameOrId}中新增${action.moduleName}模块（${action.moduleType}类型）。`;
    case "add_filter_field":
      return `在${action.pageNameOrId}的筛选区域新增\u201c${action.fieldName}\u201d筛选条件。`;
    case "change_field_type":
      return `将字段\u201c${action.fieldNameOrId}\u201d的类型改为${action.newType}。`;
    case "rename_field":
      return `将字段名从\u201c${action.fromName}\u201d修改为\u201c${action.toName}\u201d。`;
    case "add_page_navigation":
      return `新增从${action.fromPageNameOrId}到${action.toPageNameOrId}的页面导航。`;
    case "add_ui_state":
      return `在${action.pageNameOrId}中新增${action.stateName}（${action.stateType}类型）。`;
    case "modify_permission":
      return `修改权限规则\u201c${action.permissionIdOrTarget}\u201d。`;
    case "add_approval_node":
      return `新增审批节点\u201c${action.nodeName}\u201d。`;
    case "remove_entity":
      return `删除${action.entityType === "action" ? "操作" : action.entityType === "field" ? "字段" : action.entityType}\u201c${action.entityNameOrId}\u201d。`;
    case "add_prd_section":
      return `新增 PRD 章节\u201c${action.title}\u201d。`;
  }
}

function buildExpectedImpact(artifactTypes: StateArtifactType[]): string[] {
  return [
    `将修改结构化产物：${artifactTypes.join("、")}`,
    "应用后相关渲染文件会过期，需要重新 render / annotate / check",
    "变更会写入 ChangeLog，可通过 undo 回滚"
  ];
}
