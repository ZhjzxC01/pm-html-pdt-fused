import { createEmptyProjectState } from "../state/project-state-manager.js";
import type { ProjectState } from "../types/index.js";
import { matchDomain } from "./domains/registry.js";
import type { DomainTemplate, DomainMatchResult } from "./domains/domain-template.js";

interface GenericContext {
  projectName: string;
  businessObject: string;
  hasApproval: boolean;
  hasAmountThreshold: boolean;
  hasReturnModification: boolean;
  hasCopyAfterReject: boolean;
  hasLegalApproval: boolean;
  hasFinanceApproval: boolean;
  hasAttachmentRule: boolean;
  approvalThresholdText: string;
  approvalRouteText: string;
  roleScopeText: string;
  filterText: string;
  detailText: string;
  sourceInput: string;
  domainMatch?: DomainMatchResult;
}

export function isExpenseApprovalInput(input: string): boolean {
  return ["费用", "报销", "审批"].every((keyword) => input.includes(keyword));
}

export function createGenericB2BProjectState(input: string, now = new Date().toISOString()): ProjectState {
  const context = inferGenericContext(input);
  const domain = context.domainMatch?.domain;
  setDomainFieldMap(domain);
  const state = createEmptyProjectState(context.projectName, now);
  const object = context.businessObject;
  const hasApproval = context.hasApproval;
  const domainRoles = domain ? buildDomainRoles(domain, object) : undefined;

  state.requirementCard = {
    id: "requirement_generic_b2b",
    title: context.projectName,
    sourceType: "free_text",
    businessDomain: domain ? domain.displayName : "B 端业务管理",
    background: context.sourceInput || `${context.projectName}需要管理${object}的创建、流转、查询和追踪。`,
    problemStatement: `当前${object}管理缺少统一的页面、状态、权限和追溯结构，难以稳定生成原型、PRD 和标注。`,
    goals: collection([
      {
        id: "goal_generic_closed_loop",
        description: `完成${object}的录入、查询、状态流转、${hasApproval ? "审批处理、" : ""}权限控制和闭环追溯。`,
        priority: "P0" as const
      }
    ]),
    roles: collection(domainRoles || [
      { id: "role_operator", name: inputRoleName(context, "operator"), description: `创建、编辑、提交并跟进自己的${object}` },
      { id: "role_manager", name: inputRoleName(context, "manager"), description: hasApproval ? `审批或驳回${object}，重点判断客户、金额、折扣和销售政策是否合理。` : `处理${object}状态流转和异常` },
      ...(context.hasLegalApproval ? [{ id: "role_legal", name: "法务", description: `检查${object}条款、附件完整性和风险条款。` }] : []),
      ...(context.hasFinanceApproval ? [{ id: "role_finance", name: "财务", description: `检查${object}开票信息、回款计划和付款条件。` }] : []),
      { id: "role_admin", name: "管理员", description: `查看全部${object}并维护权限和导出数据` }
    ]),
    businessObjects: collection([
      {
        id: "object_main",
        name: object,
        description: `${context.projectName}中的核心业务对象，包含名称、负责人、状态、说明和操作记录。`,
        keyFields: ["name", "owner", "status", "description", "attachment"]
      }
    ]),
    scenarios: collection([
      { id: "scenario_create", name: `创建${object}`, description: `业务经办人录入${object}并提交后续处理。`, relatedRoleIds: [operatorRoleId(context)] },
      {
        id: "scenario_process",
        name: hasApproval ? `${object}审批处理` : `${object}状态处理`,
        description: hasApproval ? `审批人通过、驳回或退回${object}。` : `业务负责人推进${object}状态并记录处理结果。`,
        relatedRoleIds: [managerRoleId(context)]
      },
      { id: "scenario_export", name: `${object}查询导出`, description: `管理员筛选、查看并导出${object}数据。`, relatedRoleIds: ["role_admin"] }
    ]),
    features: collection([
      feature("feature_create", `${object}创建提交`, `录入${object}基础信息并提交处理。${context.hasAttachmentRule ? "提交时需要校验必填附件。" : ""}`, [operatorRoleId(context)], ["scenario_create"], [
        criterion("criterion_submit", "提交成功", `业务经办人填写必填字段后，可以提交${object}，状态进入${hasApproval ? "待审批" : "处理中"}。${context.approvalThresholdText}`, ["action_submit"], [hasApproval ? "business_state_pending_approval" : "business_state_processing"])
      ]),
      feature("feature_process", hasApproval ? `${object}审批流转` : `${object}状态流转`, hasApproval ? `审批人处理通过、驳回${context.hasReturnModification ? "、退回修改" : ""}和撤回规则。${context.approvalRouteText}` : `业务负责人推进状态、完成处理或退回。`, allApprovalRoleIds(context), ["scenario_process"], [
        criterion("criterion_process", hasApproval ? "审批通过" : "处理完成", hasApproval ? `${object}审批通过后进入${completedStateName(context)}状态。${context.approvalRouteText}` : `${object}处理完成后进入已完成状态。`, [hasApproval ? "action_approve" : "action_complete"], ["business_state_completed"]),
        criterion("criterion_reject", hasApproval ? "审批驳回" : "退回处理", hasApproval ? `${object}被驳回后进入已驳回状态并记录原因。${context.hasCopyAfterReject ? `被驳回的${object}不能继续审批，但可以复制为新${object}。` : ""}` : `${object}退回后进入已退回状态并记录原因。`, [hasApproval ? "action_reject" : "action_return"], ["business_state_rejected"]),
        ...(hasApproval && context.hasReturnModification
          ? [criterion("criterion_return_modify", "退回修改", `审批人退回修改后，${inputRoleName(context, "operator")}可以补充信息并重新提交，重新提交后重新进入审批流。`, ["action_return"], ["business_state_returned"])]
          : [])
      ]),
      feature("feature_export", `${object}查询导出`, `管理员可以筛选并导出${object}。`, ["role_admin"], ["scenario_export"], [
        criterion("criterion_export", "管理员导出", `管理员可以导出符合条件的${object}，普通经办人不展示导出入口。`, ["action_export"], [])
      ])
    ]),
    inScope: [`${object}列表`, `${object}详情`, `${object}创建`, hasApproval ? "审批处理" : "状态处理", "状态记录", "权限控制", "数据导出"],
    outOfScope: ["外部系统集成", "复杂 BI 分析", "移动端专项适配"],
    assumptions: [{ id: "assumption_generic_scope", content: "首轮以 PC B 端管理台为主，移动端和复杂集成后续单独补充。", confidence: "medium" }],
    pendingQuestions: [
      {
        id: "question_state_rules",
        question: `是否存在特殊${object}状态、驳回后重提规则或终态后重开规则？`,
        reason: "状态机需要业务方确认边界规则。",
        required: !context.hasReturnModification && !context.hasCopyAfterReject
      }
    ],
    risks: [
      {
        id: "risk_permission_scope",
        description: "数据权限范围可能依赖组织架构、项目归属或业务线配置。",
        impact: "medium",
        mitigation: "首轮用 self / department / all 表达，后续接入组织模型。"
      }
    ]
  };

  state.prototypeSpec = createPrototypeSpec(context);
  state.flowSpec = createFlowSpec(context);
  state.htmlPrototype = createHtmlPrototype(context, now);
  state.prototypeMeta = createPrototypeMeta(context);
  state.prdSpec = createPrdSpec(context);
  state.testCaseSpec = createTestCaseSpec(context, now);
  state.prototypeAnnotationSpec = createAnnotationSpec(context, now);
  state.traceability.links = [
    trace("trace_feature_create_to_page_create", "feature", "feature_create", "page", "page_create"),
    trace("trace_feature_process_to_page_process", "feature", "feature_process", "page", hasApproval ? "page_approval" : "page_detail"),
    trace("trace_feature_export_to_action_export", "feature", "feature_export", "action", "action_export")
  ];

  return state;
}

function inferGenericContext(input: string): GenericContext {
  const normalized = input.trim();
  const domainMatch = matchDomain(normalized);
  const domain = domainMatch?.domain;
  const object = domain ? domain.businessObjects[0] : inferBusinessObject(normalized);
  const projectName = inferProjectName(normalized, object);
  const hasApproval = domain ? true : /审批|审核|复核|驳回|撤回|流转|提交审批/.test(normalized);
  const hasAmountThreshold = domain ? domain.specialRules.some((r) => /金额|阈值/.test(r)) : /金额|万|阈值|超过|不超过/.test(normalized);
  const hasLegalApproval = domain ? domain.approvalRoles.includes("法务") : /法务/.test(normalized);
  const hasFinanceApproval = domain ? domain.approvalRoles.includes("财务") : /财务/.test(normalized);
  return {
    projectName,
    businessObject: object,
    hasApproval,
    hasAmountThreshold,
    hasReturnModification: domain ? true : /退回修改|退回/.test(normalized),
    hasCopyAfterReject: domain ? false : /复制为新|复制/.test(normalized),
    hasLegalApproval,
    hasFinanceApproval,
    hasAttachmentRule: domain ? domain.defaultFields.some((f) => f.fieldKey === "attachment") : /附件|必填附件/.test(normalized),
    approvalThresholdText: hasAmountThreshold ? (domain ? domain.specialRules.filter((r) => /金额|阈值/.test(r)).join(" ") : inferThresholdText(normalized, object)) : "",
    approvalRouteText: hasApproval ? (domain ? `按${domain.approvalRoles.join("、")}顺序审批。` : inferApprovalRouteText(normalized, object, hasAmountThreshold, hasLegalApproval, hasFinanceApproval)) : "",
    roleScopeText: domain ? `${domain.defaultRoles[0]?.name || "经办人"}查看自己的${object}，负责人查看团队范围，管理员查看全部数据。` : inferRoleScopeText(normalized, object),
    filterText: domain ? `列表页支持按${object}编号、${object}状态、${domain.extraFilters.join("、")}筛选。` : inferFilterText(normalized, object),
    detailText: domain ? `详情页展示${object}基本信息、${domain.extraDetailModules.map((m) => m.name).join("、")}和操作记录。` : inferDetailText(normalized, object),
    sourceInput: normalized,
    domainMatch: domainMatch
  };
}

function inferThresholdText(input: string, object: string): string {
  const overMatch = input.match(/金额超过\s*([0-9]+)\s*万[^。；\n]*?(?:审批|复核)/);
  const underMatch = input.match(/金额不超过\s*([0-9]+)\s*万[^。；\n]*?(?:审批|复核)/);
  if (overMatch || underMatch) {
    const threshold = overMatch?.[1] || underMatch?.[1];
    return `${object}金额以 ${threshold} 万元为审批阈值，超过阈值时需要增加财务审批，不超过阈值时不进入财务审批。`;
  }
  return `${object}金额需要参与审批路径判断。`;
}

function inferApprovalRouteText(input: string, object: string, hasAmountThreshold: boolean, hasLegalApproval: boolean, hasFinanceApproval: boolean): string {
  if (hasAmountThreshold && hasLegalApproval && hasFinanceApproval) {
    return `${object}超过金额阈值时按销售主管、法务、财务顺序审批；未超过阈值时按销售主管、法务顺序审批。`;
  }
  if (hasLegalApproval && hasFinanceApproval) {
    return `${object}需要经过业务负责人、法务和财务审批。`;
  }
  if (/销售主管/.test(input)) {
    return `${object}需要销售主管审批。`;
  }
  return "";
}

function inferRoleScopeText(input: string, object: string): string {
  if (/只能查看和维护自己|主管可以查看团队|管理员可以查看全部/.test(input)) {
    const operator = /销售/.test(input) ? "销售" : "经办人";
    return `${operator}只能查看和维护自己创建的${object}，主管查看团队${object}，法务和财务查看待自己处理或已处理的${object}，管理员查看全部${object}和配置规则。`;
  }
  return `经办人查看自己的${object}，负责人查看团队范围，管理员查看全部数据。`;
}

function inferFilterText(input: string, object: string): string {
  if (/合同编号|客户名称|金额范围|当前审批节点/.test(input)) {
    return `列表页支持按${object}编号、客户名称、${object}状态、${object}金额范围、创建人、提交时间和当前审批节点筛选。`;
  }
  return `列表页支持按状态、负责人和名称筛选${object}。`;
}

function inferDetailText(input: string, object: string): string {
  if (/基本信息|审批流转记录|审批意见|风险提示/.test(input)) {
    return `详情页展示${object}基本信息、附件、审批流转记录、审批意见和风险提示。`;
  }
  return `详情页展示${object}基本信息、状态和操作记录。`;
}

function inferProjectName(input: string, object: string): string {
  const match = input.match(/(?:做一个|做个|建设|搭建|开发|需要|我要做一个|我要做个)([^。；，,\n]{2,24}?)(?:，|。|；|\n|$)/);
  const candidate = match?.[1]?.replace(/^(能|可以|用于|支持)/, "").trim();
  if (candidate && !candidate.includes("需要")) {
    return ensureSystemSuffix(candidate);
  }
  return ensureSystemSuffix(`${object}管理`);
}

function inferBusinessObject(input: string): string {
  const known = ["合同", "工单", "客户", "订单", "采购", "库存", "项目", "任务", "资产", "线索", "商机", "发票", "供应商", "员工", "设备"];
  for (const item of known) {
    if (input.includes(item)) {
      return item;
    }
  }
  const match = input.match(/管理([^，。；\n]{2,8})(?:，|。|；|\n|$)/);
  return match?.[1]?.replace(/系统|平台|中心/g, "").trim() || "业务单据";
}

function ensureSystemSuffix(value: string): string {
  return /系统|平台|中心|工作台/.test(value) ? value : `${value}系统`;
}

function inputRoleName(context: GenericContext, role: "operator" | "manager"): string {
  if (role === "operator") {
    return /销售/.test(context.sourceInput) ? "销售" : "业务经办人";
  }
  return /销售主管/.test(context.sourceInput) ? "销售主管" : context.hasApproval ? "审批人" : "业务负责人";
}

function approvalRoleIds(context: GenericContext): string[] {
  return ["role_manager", ...(context.hasLegalApproval ? ["role_legal"] : []), ...(context.hasFinanceApproval ? ["role_finance"] : [])];
}

function operatorRoleId(context: GenericContext): string {
  return context.domainMatch?.domain ? context.domainMatch.domain.defaultRoles[0]?.id || "role_operator" : "role_operator";
}

function managerRoleId(context: GenericContext): string {
  const domain = context.domainMatch?.domain;
  return domain ? domain.defaultRoles[1]?.id || "role_manager" : "role_manager";
}

function allApprovalRoleIds(context: GenericContext): string[] {
  const domain = context.domainMatch?.domain;
  if (domain) {
    return domain.approvalRoles.filter((id) => id !== operatorRoleId(context));
  }
  return approvalRoleIds(context);
}

function domainRoleId(context: GenericContext, nameSubstring: string, fallback: string): string {
  const domain = context.domainMatch?.domain;
  if (domain) {
    const match = domain.defaultRoles.find((r) => r.name.includes(nameSubstring));
    return match?.id || fallback;
  }
  return fallback;
}

function completedStateName(context: GenericContext): string {
  return /已生效|生效/.test(context.sourceInput) ? "已生效" : context.hasApproval ? "已通过" : "已完成";
}

function createPrototypeSpec(context: GenericContext) {
  const object = context.businessObject;
  const domain = context.domainMatch?.domain;
  const domainPagePattern = domain?.pagePatterns.find((p) => p.type === "list");
  const domainDetailPattern = domain?.pagePatterns.find((p) => p.type === "detail");
  const domainCreatePattern = domain?.pagePatterns.find((p) => p.type === "create");

  const actionIds = context.hasApproval
    ? ["action_approve", "action_reject", ...(context.hasReturnModification ? ["action_return"] : [])]
    : ["action_complete", "action_return"];
  const roleVisibility = [
    { roleId: operatorRoleId(context), visible: true },
    { roleId: managerRoleId(context), visible: true },
    { roleId: domainRoleId(context, "管理员", "role_admin"), visible: true }
  ];
  const processPage = context.hasApproval
    ? page("page_approval", `${object}审批处理页`, "approval", "/items/:id/approval", `处理${object}审批`, [
        module("module_process_panel", "审批面板", "approval_panel", ["field_name", "field_status", "field_amount", "field_description", "field_attachment"])
      ], actionIds, ["ui_state_no_permission"], ["feature_process"], roleVisibility)
    : null;

  const listModules = domainPagePattern
    ? domainPagePattern.modules.map((m) => module(m.id, m.name, m.type as "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline", m.fieldIds))
    : [
        module("module_filter", "筛选区", "filter", ["field_code", "field_customer", "field_status", "field_amount", "field_owner", "field_current_node"]),
        module("module_table", `${object}表格`, "table", ["field_code", "field_customer", "field_name", "field_amount", "field_owner", "field_status", "field_current_node"])
      ];
  const listActionIds = domainPagePattern ? domainPagePattern.actionIds : ["action_create", "action_search", "action_reset", "action_export", "action_view_detail"];

  const detailModules = domainDetailPattern
    ? domainDetailPattern.modules.map((m) => module(m.id, m.name, m.type as "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline", m.fieldIds))
    : [
        module("module_detail_card", `${object}详情`, "detail_card", ["field_code", "field_customer", "field_name", "field_amount", "field_owner", "field_status", "field_description", "field_attachment", "field_risk"]),
        module("module_timeline", "状态记录", "log_timeline", ["field_status"])
      ];
  const detailActionIds = domainDetailPattern ? domainDetailPattern.actionIds : (context.hasApproval ? ["action_withdraw"] : ["action_complete", "action_return"]);

  const createModules = domainCreatePattern
    ? domainCreatePattern.modules.map((m) => module(m.id, m.name, m.type as "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline", m.fieldIds))
    : [module("module_form", `${object}表单`, "form", ["field_customer", "field_name", "field_amount", "field_description", "field_attachment"])];
  const createActionIds = domainCreatePattern ? domainCreatePattern.actionIds : ["action_submit"];

  return {
    id: "prototype_generic_b2b",
    pages: collection([
      page("page_list", `${object}列表页`, "list", "/items", `查看、筛选、导出${object}`, listModules, listActionIds, ["ui_state_empty", "ui_state_error", "ui_state_no_permission"], ["feature_create", "feature_export"], [
        { roleId: operatorRoleId(context), visible: true },
        { roleId: managerRoleId(context), visible: true },
        { roleId: domainRoleId(context, "管理员", "role_admin"), visible: true }
      ]),
      page("page_detail", `${object}详情页`, "detail", "/items/:id", `查看${object}详情、状态和操作记录`, detailModules, detailActionIds, ["ui_state_no_permission"], ["feature_create", "feature_process"], [
        { roleId: operatorRoleId(context), visible: true },
        { roleId: managerRoleId(context), visible: true },
        { roleId: domainRoleId(context, "管理员", "role_admin"), visible: true }
      ]),
      page("page_create", `新建${object}页`, "create", "/items/new", `录入并提交${object}`, createModules, createActionIds, ["ui_state_error"], ["feature_create"], [
        { roleId: operatorRoleId(context), visible: true },
        { roleId: managerRoleId(context), visible: true },
        { roleId: domainRoleId(context, "管理员", "role_admin"), visible: true }
      ]),
      ...(processPage ? [processPage] : []),
      page("page_log", `${object}操作记录页`, "log", "/items/:id/logs", `查看完整状态和操作记录`, [
        module("module_log", "操作记录", "log_timeline", ["field_status"])
      ], [], [], ["feature_process"], [
        { roleId: operatorRoleId(context), visible: true },
        { roleId: managerRoleId(context), visible: true },
        { roleId: domainRoleId(context, "管理员", "role_admin"), visible: true }
      ])
    ]),
    navigation: collection([
      navigation("navigation_list_to_create", "page_list", "page_create", "action_create", `点击新建进入新建${object}页`),
      navigation("navigation_list_to_detail", "page_list", "page_detail", "action_view_detail", `点击查看进入${object}详情`),
      navigation("navigation_detail_to_log", "page_detail", "page_log", undefined, "从详情页查看操作记录"),
      ...(context.hasApproval ? [navigation("navigation_detail_to_approval", "page_detail", "page_approval", undefined, "从详情页进入审批处理")] : [])
    ]),
    permissions: collection([
      permission("permission_operator_create", operatorRoleId(context), "action", "action_create", "allow", "self", `经办人可以新建${object}`),
      permission("permission_operator_submit", operatorRoleId(context), "action", "action_submit", "allow", "self", `经办人可以提交自己的${object}`),
      permission("permission_operator_withdraw", operatorRoleId(context), "action", "action_withdraw", "allow", "self", `经办人可以撤回待处理${object}`),
      permission("permission_manager_approve", managerRoleId(context), "action", "action_approve", "allow", "department", `审批人可以通过${object}`),
      permission("permission_manager_reject", managerRoleId(context), "action", "action_reject", "allow", "department", `审批人可以驳回${object}`),
      permission("permission_manager_return", managerRoleId(context), "action", "action_return", "allow", "department", `审批人可以退回${object}要求修改`),
      ...(context.hasLegalApproval ? [
        permission("permission_legal_approve", domainRoleId(context, "法务", "role_legal"), "action", "action_approve", "allow", "all", `法务可以审批${object}条款和风险`),
        permission("permission_legal_reject", domainRoleId(context, "法务", "role_legal"), "action", "action_reject", "allow", "all", `法务可以驳回存在条款风险的${object}`)
      ] : []),
      ...(context.hasFinanceApproval ? [
        permission("permission_finance_approve", domainRoleId(context, "财务", "role_finance"), "action", "action_approve", "allow", "all", `财务可以审批${object}开票和回款条件`),
        permission("permission_finance_reject", domainRoleId(context, "财务", "role_finance"), "action", "action_reject", "allow", "all", `财务可以驳回付款条件异常的${object}`)
      ] : []),
      permission("permission_manager_complete", managerRoleId(context), "action", "action_complete", "allow", "department", `业务负责人可以完成${object}`),
      permission("permission_admin_export", domainRoleId(context, "管理员", "role_admin"), "action", "action_export", "allow", "all", `管理员可以导出全部${object}`),
      permission("permission_operator_view_own", operatorRoleId(context), "data", "object_main", "allow", "self", `经办人查看自己的${object}`),
      permission("permission_manager_view_team", managerRoleId(context), "data", "object_main", "allow", "department", `主管查看团队${object}`),
      permission("permission_admin_view_all", domainRoleId(context, "管理员", "role_admin"), "data", "object_main", "allow", "all", `管理员查看全部${object}`)
    ].filter((item) => {
      if (context.hasApproval) return !["permission_manager_complete", ...(!context.hasReturnModification ? ["permission_manager_return"] : [])].includes(item.id);
      return !["permission_operator_withdraw", "permission_manager_approve", "permission_manager_reject"].includes(item.id);
    })),
    mockDataSets: collection([
      {
        id: "mock_items",
        name: `${object}列表样例`,
        targetPageId: "page_list",
        records: [
          { code: `${object}-202604-001`, customer: "华东示例客户", name: `${object}样例 A`, amount: "680000.00", owner: "张三", status: context.hasApproval ? "待法务审批" : "处理中", currentNode: context.hasFinanceApproval ? "法务审批" : "主管审批" },
          { name: `${object}样例 B`, owner: "李四", status: "已完成" }
        ]
      }
    ])
  };
}

function createFlowSpec(context: GenericContext) {
  const domain = context.domainMatch?.domain;
  const domainPattern = domain?.statePatterns[0];

  const states = domainPattern
    ? domainPattern.states.map((s) => businessState(s.id, s.name, s.description, s.type))
    : context.hasApproval
    ? [
        businessState("business_state_draft", "草稿", "已创建但未提交", "initial"),
        businessState("business_state_pending_approval", "待审批", "等待审批人处理", "intermediate"),
        ...(context.hasLegalApproval ? [businessState("business_state_pending_legal", "待法务审批", "等待法务检查条款、附件和风险", "intermediate")] : []),
        ...(context.hasFinanceApproval ? [businessState("business_state_pending_finance", "待财务审批", "等待财务检查开票、回款和付款条件", "intermediate")] : []),
        ...(context.hasReturnModification ? [businessState("business_state_returned", "退回修改", "审批人退回后等待经办人修改并重新提交", "intermediate")] : []),
        businessState("business_state_completed", completedStateName(context), "审批完成后的终态", "terminal"),
        businessState("business_state_rejected", "已驳回", "审批驳回后的终态", "terminal"),
        businessState("business_state_withdrawn", "已撤回", "经办人撤回后的终态", "terminal")
      ]
    : [
        businessState("business_state_draft", "草稿", "已创建但未提交", "initial"),
        businessState("business_state_processing", "处理中", "业务负责人正在处理", "intermediate"),
        businessState("business_state_completed", "已完成", "处理完成后的终态", "terminal"),
        businessState("business_state_rejected", "已退回", "退回修改后的终态", "terminal")
      ];

  const transitions = domainPattern
    ? domainPattern.transitions.map((t) => transition(t.id, t.name, t.fromStateId, t.toStateId, t.triggerActionId, t.allowedRoleIds))
    : context.hasApproval
    ? approvalTransitions(context)
    : [
        transition("transition_submit", "提交处理", "business_state_draft", "business_state_processing", "action_submit", [operatorRoleId(context)]),
        transition("transition_complete", "处理完成", "business_state_processing", "business_state_completed", "action_complete", [managerRoleId(context)]),
        transition("transition_return", "退回修改", "business_state_processing", "business_state_rejected", "action_return", [managerRoleId(context)])
      ];

  const initialStateId = domainPattern ? domainPattern.states.find((s) => s.type === "initial")?.id || "business_state_draft" : "business_state_draft";
  const terminalStateIds = domainPattern
    ? domainPattern.states.filter((s) => s.type === "terminal").map((s) => s.id)
    : context.hasApproval ? ["business_state_completed", "business_state_rejected", "business_state_withdrawn"] : ["business_state_completed", "business_state_rejected"];

  return {
    id: "flow_generic_b2b",
    flows: collection([
      {
        id: "flow_main",
        name: `${context.businessObject}${context.hasApproval ? "审批" : "处理"}流程`,
        description: `${context.businessObject}从草稿提交后进入${context.hasApproval ? "审批" : "处理"}，最终完成或退回。${context.approvalRouteText}`,
        relatedPageIds: context.hasApproval ? ["page_create", "page_approval", "page_detail"] : ["page_create", "page_detail"],
        relatedActionIds: context.hasApproval ? ["action_submit", "action_approve", "action_reject", "action_withdraw", ...(context.hasReturnModification ? ["action_return"] : [])] : ["action_submit", "action_complete", "action_return"]
      }
    ]),
    stateMachines: collection([
      {
        id: "state_machine_main",
        name: `${context.businessObject}状态机`,
        businessObjectId: "object_main",
        states: collection(states),
        transitions: collection(transitions),
        initialStateId,
        terminalStateIds
      }
    ])
  };
}

function approvalTransitions(context: GenericContext) {
  if (context.hasLegalApproval && context.hasFinanceApproval && context.hasAmountThreshold) {
    return [
      transition("transition_submit", "提交审批", "business_state_draft", "business_state_pending_approval", "action_submit", [operatorRoleId(context)]),
      transition("transition_manager_approve", "主管审批通过", "business_state_pending_approval", "business_state_pending_legal", "action_approve", [managerRoleId(context)]),
      transition("transition_legal_approve", "法务审批通过", "business_state_pending_legal", "business_state_pending_finance", "action_approve", [domainRoleId(context, "法务", "role_legal")]),
      transition("transition_finance_approve", "财务审批通过", "business_state_pending_finance", "business_state_completed", "action_approve", [domainRoleId(context, "财务", "role_finance")]),
      transition("transition_short_route_legal_approve", "未超阈值法务审批通过", "business_state_pending_legal", "business_state_completed", "action_approve", [domainRoleId(context, "法务", "role_legal")]),
      transition("transition_reject", "审批驳回", "business_state_pending_approval", "business_state_rejected", "action_reject", allApprovalRoleIds(context)),
      ...(context.hasReturnModification ? [transition("transition_return_modify", "退回修改", "business_state_pending_approval", "business_state_returned", "action_return", allApprovalRoleIds(context)), transition("transition_resubmit", "修改后重新提交", "business_state_returned", "business_state_pending_approval", "action_submit", [operatorRoleId(context)])] : []),
      transition("transition_withdraw", "撤回", "business_state_pending_approval", "business_state_withdrawn", "action_withdraw", [operatorRoleId(context)])
    ];
  }
  return [
    transition("transition_submit", "提交审批", "business_state_draft", "business_state_pending_approval", "action_submit", [operatorRoleId(context)]),
    transition("transition_approve", "审批通过", "business_state_pending_approval", "business_state_completed", "action_approve", allApprovalRoleIds(context)),
    transition("transition_reject", "审批驳回", "business_state_pending_approval", "business_state_rejected", "action_reject", allApprovalRoleIds(context)),
    ...(context.hasReturnModification ? [transition("transition_return_modify", "退回修改", "business_state_pending_approval", "business_state_returned", "action_return", allApprovalRoleIds(context)), transition("transition_resubmit", "修改后重新提交", "business_state_returned", "business_state_pending_approval", "action_submit", [operatorRoleId(context)])] : []),
    transition("transition_withdraw", "撤回", "business_state_pending_approval", "business_state_withdrawn", "action_withdraw", [operatorRoleId(context)])
  ];
}

function createHtmlPrototype(context: GenericContext, now: string) {
  return {
    id: "html_generic_b2b",
    packageType: "single_html" as const,
    files: collection([
      {
        id: "html_index",
        fileName: "index.html",
        type: "html" as const,
        content: genericHtml(context)
      }
    ]),
    sourcePrototypeSpecId: "prototype_generic_b2b",
    generatedAt: now,
    generatorVersion: "0.2.0",
    status: "review_ready" as const,
    assumptions: [],
    pendingQuestions: []
  };
}

function createPrototypeMeta(context: GenericContext) {
  const domain = context.domainMatch?.domain;
  const pages = context.hasApproval ? ["page_list", "page_detail", "page_create", "page_approval", "page_log"] : ["page_list", "page_detail", "page_create", "page_log"];
  const modules = context.hasApproval
    ? ["module_filter", "module_table", "module_detail_card", "module_timeline", "module_form", "module_process_panel", "module_log"]
    : ["module_filter", "module_table", "module_detail_card", "module_timeline", "module_form", "module_log"];
  const actions = context.hasApproval
    ? ["action_create", "action_submit", "action_approve", "action_reject", ...(context.hasReturnModification ? ["action_return"] : []), "action_withdraw", "action_export", "action_view_detail", "action_search", "action_reset"]
    : ["action_create", "action_submit", "action_complete", "action_return", "action_export", "action_view_detail", "action_search", "action_reset"];
  const fieldIds = domain
    ? domain.defaultFields.map((f) => f.id)
    : ["field_code", "field_customer", "field_name", "field_amount", "field_owner", "field_status", "field_current_node", "field_description", "field_attachment", "field_risk"];
  return {
    id: "meta_generic_b2b",
    sourcePrototypeSpecId: "prototype_generic_b2b",
    pageMappings: pages.map((id) => mapping(`mapping_${id}`, id, "page", "data-page-id", `[data-page-id="${id}"]`, pageName(id, context))),
    moduleMappings: modules.map((id) => mapping(`mapping_${id}`, id, "module", "data-module-id", `[data-module-id="${id}"]`, moduleName(id, context))),
    fieldMappings: fieldIds.map((id) => mapping(`mapping_${id}`, id, "field", "data-field-id", fieldSelector(id), fieldName(id, context))),
    actionMappings: actions.map((id) => mapping(`mapping_${id}`, id, "action", "data-action-id", `[data-action-id="${id}"]`, actionName(id, context))),
    uiStateMappings: ["ui_state_empty", "ui_state_error", "ui_state_no_permission"].map((id) => mapping(`mapping_${id}`, id, "ui_state", "data-ui-state-id", `[data-ui-state-id="${id}"]`, uiStateName(id)))
  };
}

function createPrdSpec(context: GenericContext) {
  const processSection = context.hasApproval
    ? prd("prd_section_action_approve", "审批通过", "state_transition", "state_transition", approvalTransitionTargetId(context), `审批人点击通过后，${context.businessObject}按审批路径流转；全部必经节点通过后进入${completedStateName(context)}状态，并写入操作记录。${context.approvalRouteText}`)
    : prd("prd_section_action_complete", "处理完成", "state_transition", "state_transition", "transition_complete", `业务负责人点击完成后，${context.businessObject}进入已完成状态，并写入操作记录。`);
  const sections = [
    prd("prd_section_page_list", `${context.businessObject}列表页`, "page", "page", "page_list", `列表页提供${context.businessObject}筛选、查看、新建和管理员导出入口。`),
    prd("prd_section_module_filter", "筛选区", "module", "module", "module_filter", context.filterText),
    prd("prd_section_module_table", `${context.businessObject}表格`, "module", "module", "module_table", `${context.businessObject}表格展示${context.businessObject}列表，支持新建、查看详情${context.hasApproval ? "和管理员导出" : ""}操作。`),
    prd("prd_section_action_create", "新建", "action", "action", "action_create", `新建${context.businessObject}入口，点击后跳转到新建表单页。`),
    prd("prd_section_action_view_detail", "查看详情", "action", "action", "action_view_detail", `点击表格行或详情链接跳转到${context.businessObject}详情页。`),
    prd("prd_section_field_name", `${context.businessObject}名称字段`, "field", "field", "field_name", `${context.businessObject}名称为必填文本字段，用于列表识别和详情展示。`),
    prd("prd_section_field_amount", `${context.businessObject}金额字段`, "field", "field", "field_amount", `${context.businessObject}金额为必填金额字段。${context.approvalThresholdText || "金额用于列表筛选和详情展示。"}`),
    prd("prd_section_detail", `${context.businessObject}详情页`, "page", "page", "page_detail", context.detailText),
    prd("prd_section_module_detail_card", `${context.detailText}`, "module", "module", "module_detail_card", `详情页展示${context.businessObject}基本信息、状态和操作记录。`),
    prd("prd_section_action_submit", context.hasApproval ? "提交审批" : "提交处理", "action", "action", "action_submit", `经办人提交后，${context.businessObject}进入${context.hasApproval ? "待审批" : "处理中"}状态。${context.approvalThresholdText}`),
    prd("prd_section_module_form", `${context.businessObject}表单`, "module", "module", "module_form", `新建${context.businessObject}表单，包含必填字段校验。`),
    processSection,
    ...(context.hasReturnModification ? [prd("prd_section_action_return", "退回修改", "state_transition", "state_transition", "transition_return_modify", `审批人可以退回修改，${inputRoleName(context, "operator")}修改后重新提交，并重新进入审批流。`)] : []),
    ...(context.hasCopyAfterReject ? [prd("prd_section_reject_copy", "驳回后复制", "state_transition", "state_transition", "transition_reject", `被驳回的${context.businessObject}不能继续审批，但可以复制为新${context.businessObject}后重新提交。`)] : []),
    prd("prd_section_role_scope", "角色数据权限", "permission", "permission", "permission_operator_view_own", context.roleScopeText),
    prd("prd_section_permission_export", "管理员导出权限", "permission", "permission", "permission_admin_export", `只有管理员可以看到导出入口并导出全部${context.businessObject}。`)
  ];
  return {
    id: "prd_generic_b2b",
    title: `${context.projectName} PRD`,
    requirementLevel: "M" as const,
    toc: sections.map((section, index) => ({ id: `toc_${section.id}`, title: section.title, level: 2, sectionId: section.id, sortOrder: index + 1 })),
    sections: collection(sections),
    assumptions: [],
    pendingQuestions: []
  };
}

function approvalTransitionTargetId(context: GenericContext): string {
  return context.hasLegalApproval && context.hasFinanceApproval && context.hasAmountThreshold ? "transition_manager_approve" : "transition_approve";
}

function createTestCaseSpec(context: GenericContext, now: string) {
  const cases = [
    testCase("test_case_submit_success", context.hasApproval ? `提交${context.businessObject}审批成功` : `提交${context.businessObject}处理成功`, ["经办人已登录"], [`点击新建${context.businessObject}`, "填写必填字段", context.hasApproval ? "点击提交审批" : "点击提交处理"], [context.hasApproval ? `${context.businessObject}进入待审批状态` : `${context.businessObject}进入处理中状态`], ["action_create", "action_submit"], ["criterion_submit"]),
    context.hasApproval
      ? testCase("test_case_approve_success", "审批通过", [`${context.businessObject}处于待审批`], ["审批人点击通过"], [`${context.businessObject}进入${completedStateName(context)}状态`], ["action_approve"], ["criterion_process"])
      : testCase("test_case_complete_success", "处理完成", [`${context.businessObject}处于处理中`], ["业务负责人点击完成"], [`${context.businessObject}进入已完成状态`], ["action_complete"], ["criterion_process"]),
    context.hasApproval
      ? testCase("test_case_reject", "审批驳回", [`${context.businessObject}处于待审批`], ["审批人填写原因", "点击驳回"], [`${context.businessObject}进入已驳回状态`], ["action_reject"], ["criterion_reject"])
      : testCase("test_case_return", "退回处理", [`${context.businessObject}处于处理中`], ["业务负责人填写原因", "点击退回"], [`${context.businessObject}进入已退回状态`], ["action_return"], ["criterion_reject"]),
    ...(context.hasAmountThreshold ? [testCase("test_case_amount_threshold_route", "金额阈值审批路径", [`${context.businessObject}金额超过审批阈值`], ["提交审批", "销售主管通过", "法务通过", "财务通过"], [`${context.businessObject}按销售主管、法务、财务路径审批并进入${completedStateName(context)}状态`], ["action_submit", "action_approve"], ["criterion_submit", "criterion_process"])] : []),
    ...(context.hasReturnModification ? [testCase("test_case_return_modify_resubmit", "退回修改后重新提交", [`${context.businessObject}处于待审批`], ["审批人点击退回", "经办人修改信息", "经办人重新提交"], [`${context.businessObject}重新进入审批流`], ["action_return", "action_submit"], ["criterion_return_modify"])] : []),
    ...(context.hasCopyAfterReject ? [testCase("test_case_reject_copy_new", "驳回后复制新合同", [`${context.businessObject}处于已驳回`], [`点击复制为新${context.businessObject}`, "补充修改后提交"], [`生成新的${context.businessObject}草稿，原${context.businessObject}保持已驳回`], ["action_create", "action_submit"], ["criterion_reject"])] : []),
    ...(context.hasApproval ? [testCase("test_case_withdraw", "经办人撤回", [`${context.businessObject}处于待审批`], ["经办人点击撤回"], [`${context.businessObject}进入已撤回状态`], ["action_withdraw"], ["criterion_submit"])] : []),
    testCase("test_case_admin_export", "管理员导出", ["管理员已登录"], ["筛选数据", "点击导出"], [`系统导出符合条件的${context.businessObject}`], ["action_search", "action_export"], ["criterion_export"])
  ];
  return {
    id: "test_spec_generic_b2b",
    testSuites: collection([{ id: "test_suite_generic_b2b", name: `${context.businessObject}闭环测试`, type: "functional" as const, cases: collection(cases) }]),
    sourceRefs: [{ entityType: "feature" as const, entityId: "feature_create" }],
    generatedAt: now
  };
}

function createAnnotationSpec(context: GenericContext, now: string) {
  const NL = "\n";
  const processActionId = context.hasApproval ? "action_approve" : "action_complete";
  const processPrdId = context.hasApproval ? "prd_section_action_approve" : "prd_section_action_complete";
  const annotations = [
    {
      id: "annotation_module_filter",
      annotationNumber: 1,
      title: `${context.filterText}需求`,
      targetSelector: '[data-module-id="module_filter"]',
      targetDescription: `${context.businessObject}列表页 - ${context.filterText}模块`,
      prdSectionIds: ["prd_section_module_filter", "prd_section_field_name"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: `${context.filterText}位于${context.businessObject}列表页顶部，包含${context.businessObject}名称（输入框）筛选字段。筛选和重置按钮位于底部工具栏。` },
        { heading: "交互与排序", markdownContent: [`- ${context.businessObject}名称输入框：支持模糊搜索。`, "- 筛选按钮：点击后按条件过滤表格数据。", "- 重置按钮：点击后清空筛选条件。"].join(NL) },
        { heading: "业务定义", markdownContent: `${context.filterText}用于快速定位${context.businessObject}。` },
        { heading: "异常处理", markdownContent: ["- 筛选无结果时显示空态提示。", "- 网络异常时显示错误态并提供重试。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_filter", label: context.filterText },
        { entityType: "field" as const, entityId: "field_name", label: `${context.businessObject}名称` },
        { entityType: "action" as const, entityId: "action_search", label: "筛选" },
        { entityType: "action" as const, entityId: "action_reset_filter", label: "重置" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_table",
      annotationNumber: 2,
      title: `${context.businessObject}表格需求`,
      targetSelector: '[data-module-id="module_table"]',
      targetDescription: `${context.businessObject}列表页 - ${context.businessObject}表格模块`,
      prdSectionIds: ["prd_section_module_table", "prd_section_action_create", "prd_section_action_view_detail", "prd_section_permission_export"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: `${context.businessObject}表格位于筛选区下方，展示${context.businessObject}列表。工具栏包含"新建"按钮（主色调）、"查看详情"链接${context.hasApproval ? '和"管理员导出"按钮' : ''}。` },
        { heading: "交互与排序", markdownContent: [`- 新建：点击跳转到新建${context.businessObject}页。`, "- 查看详情：点击某行跳转到详情页。", ...(context.hasApproval ? ["- 管理员导出：点击导出当前筛选条件下的全部数据。"] : []), "- 表格默认按创建时间倒序排列。"].join(NL) },
        { heading: "业务定义", markdownContent: `表格展示${context.businessObject}的核心信息和当前状态。${context.hasApproval ? `状态流转遵循：${context.approvalRouteText}` : ''}` },
        { heading: "权限控制", markdownContent: context.roleScopeText },
        ...(context.hasApproval ? [{ heading: "状态流转", markdownContent: [`${context.businessObject}状态机：`, "- 初始态：草稿", "- 提交 → 待处理", "- 审批通过 → 已完成", "- 驳回 → 已驳回"].join(NL) }] : []),
        { heading: "异常处理", markdownContent: ["- 表格数据加载失败时显示错误态。", "- 无权限查看时显示无权限提示。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_table", label: `${context.businessObject}表格` },
        { entityType: "action" as const, entityId: "action_create", label: "新建" },
        { entityType: "action" as const, entityId: "action_view_detail", label: "查看详情" },
        ...(context.hasApproval ? [{ entityType: "action" as const, entityId: "action_export", label: "管理员导出" }] : [])
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_detail_card",
      annotationNumber: 3,
      title: `${context.detailText}需求`,
      targetSelector: '[data-module-id="module_detail_card"]',
      targetDescription: `${context.businessObject}详情页 - ${context.detailText}模块`,
      prdSectionIds: ["prd_section_module_detail_card", ...(context.hasReturnModification ? ["prd_section_action_return"] : [])],
      tooltipSections: [
        { heading: "显示样式", markdownContent: `${context.detailText}展示${context.businessObject}完整信息。${context.hasReturnModification ? '底部包含"退回修改"操作按钮。' : ''}` },
        { heading: "交互与排序", markdownContent: [`详情页展示${context.businessObject}的全部字段信息。`, ...(context.hasReturnModification ? ["- 退回修改：点击后将数据退回给提交者修改。"] : [])].join(NL) },
        { heading: "业务定义", markdownContent: `详情页用于查看${context.businessObject}全貌。` },
        { heading: "异常处理", markdownContent: "- 数据加载失败时显示错误态。" }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_detail_card", label: context.detailText }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_form",
      annotationNumber: 4,
      title: `${context.businessObject}表单需求`,
      targetSelector: '[data-module-id="module_form"]',
      targetDescription: `新建${context.businessObject}页 - ${context.businessObject}表单模块`,
      prdSectionIds: ["prd_section_module_form", "prd_section_field_name", ...(context.hasAttachmentRule ? ["prd_section_field_attachment"] : []), "prd_section_action_submit"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: `${context.businessObject}表单包含必填字段：${context.businessObject}名称（输入框）${context.hasAttachmentRule ? '和附件（文件上传）' : ''}。底部有"提交"主按钮。` },
        { heading: "交互与排序", markdownContent: [`- ${context.businessObject}名称：必填，最多 100 个字。`, ...(context.hasAttachmentRule ? ["- 附件：必填，支持 jpg/png/pdf 格式，单文件最大 10MB。"] : []), "- 提交：点击后校验所有必填字段，通过后提交。"].join(NL) },
        { heading: "业务定义", markdownContent: `新建${context.businessObject}页面是发起业务的入口。提交后系统自动流转。` },
        { heading: "验收条件", markdownContent: ["- 提交成功：状态变更，提交者收到通知。", "- 校验失败：表单字段标红并显示错误提示。"].join(NL) },
        { heading: "异常处理", markdownContent: "- 提交接口异常：显示失败提示，保留表单内容。" }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_form", label: `${context.businessObject}表单` },
        { entityType: "field" as const, entityId: "field_name", label: `${context.businessObject}名称` },
        { entityType: "action" as const, entityId: "action_submit", label: "提交" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    }
  ];
  return {
    id: "annotation_spec_generic_b2b",
    sourcePrdSpecId: "prd_generic_b2b",
    sourcePrototypeMetaId: "meta_generic_b2b",
    generatedAt: now,
    annotations: collection(annotations),
    brokenLinks: []
  };
}

function feature(id: string, name: string, description: string, relatedRoleIds: string[], relatedScenarioIds: string[], acceptanceCriteria: ReturnType<typeof criterion>[]) {
  return { id, name, description, priority: "P0" as const, relatedRoleIds, relatedScenarioIds, acceptanceCriteria: collection(acceptanceCriteria) };
}

function criterion(id: string, title: string, description: string, relatedActionIds: string[], relatedStateIds: string[]) {
  return { id, title, description, priority: "P0" as const, relatedFeatureIds: [], relatedPageIds: ["page_list"], relatedActionIds, relatedStateIds, testable: true };
}

function page(id: string, name: string, type: "list" | "detail" | "create" | "approval" | "log", routePath: string, goal: string, modules: ReturnType<typeof module>[], actionIds: string[], uiStateIds: string[], featureIds: string[], roleVisibility?: Array<{ roleId: string; visible: boolean }>) {
  return {
    id,
    name,
    type,
    goal,
    routePath,
    layout: { layoutType: "top_nav_content" as const, density: "compact" as const, primaryRegion: "content", secondaryRegions: [] },
    modules: collection(modules),
    actions: collection(actionIds.map(action)),
    uiStates: collection(uiStateIds.map(uiState)),
    roleVisibility: roleVisibility || [
      { roleId: "role_operator", visible: true },
      { roleId: "role_manager", visible: true },
      { roleId: "role_admin", visible: true }
    ],
    sourceRefs: featureIds.map((featureId) => ({ entityType: "feature" as const, entityId: featureId }))
  };
}

function module(id: string, name: string, type: "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline", fieldIds: string[]) {
  return { id, name, type, fields: collection(fieldIds.map(field)), sourceRefs: [{ entityType: "feature" as const, entityId: type === "filter" || type === "table" ? "feature_export" : "feature_create" }] };
}

let currentDomainFields: Map<string, { name: string; fieldKey: string; type: string; required: boolean }> | undefined;

export function setDomainFieldMap(domain: DomainTemplate | undefined) {
  if (domain) {
    currentDomainFields = new Map(domain.defaultFields.map((f) => [f.id, { name: f.name, fieldKey: f.fieldKey, type: f.type, required: f.required }]));
  } else {
    currentDomainFields = undefined;
  }
}

function field(id: string) {
  const domainField = currentDomainFields?.get(id);
  if (domainField) {
    return { id, name: domainField.name, fieldKey: domainField.fieldKey, type: domainField.type as "text" | "number" | "money" | "date" | "datetime" | "select" | "multi_select" | "textarea" | "file" | "user" | "department" | "status", required: domainField.required };
  }
  const specs = {
    field_code: { name: "编号", fieldKey: "code", type: "text" as const, required: true },
    field_customer: { name: "客户名称", fieldKey: "customerName", type: "text" as const, required: true },
    field_name: { name: "名称", fieldKey: "name", type: "text" as const, required: true },
    field_amount: { name: "金额", fieldKey: "amount", type: "money" as const, required: true },
    field_owner: { name: "负责人", fieldKey: "owner", type: "user" as const, required: true },
    field_status: { name: "状态", fieldKey: "status", type: "status" as const, required: true },
    field_current_node: { name: "当前审批节点", fieldKey: "currentNode", type: "text" as const, required: false },
    field_description: { name: "说明", fieldKey: "description", type: "textarea" as const, required: true },
    field_attachment: { name: "附件", fieldKey: "attachment", type: "file" as const, required: false },
    field_risk: { name: "风险提示", fieldKey: "riskHint", type: "textarea" as const, required: false }
  };
  return { id, ...specs[id as keyof typeof specs] };
}

function action(id: string) {
  const specs = {
    action_create: ["新建", "create", "toolbar", "button", "P0", ["permission_operator_create"]],
    action_submit: ["提交", "submit", "form_footer", "button", "P0", ["permission_operator_submit"]],
    action_approve: ["通过", "approve", "form_footer", "button", "P0", ["permission_manager_approve"]],
    action_reject: ["驳回", "reject", "form_footer", "button", "P0", ["permission_manager_reject"]],
    action_withdraw: ["撤回", "withdraw", "toolbar", "button", "P0", ["permission_operator_withdraw"]],
    action_complete: ["完成", "edit", "toolbar", "button", "P0", ["permission_manager_complete"]],
    action_return: ["退回", "reject", "toolbar", "button", "P0", ["permission_manager_return"]],
    action_export: ["导出", "export", "toolbar", "button", "P0", ["permission_admin_export"]],
    action_view_detail: ["查看详情", "view", "row", "link", "P1", []],
    action_search: ["筛选", "search", "toolbar", "button", "P1", []],
    action_reset: ["重置", "reset", "toolbar", "button", "P1", []]
  } as const;
  const [name, type, placement, triggerComponent, priority, permissionRuleIds] = specs[id as keyof typeof specs];
  return { id, name, type, placement, triggerComponent, priority, permissionRuleIds: [...permissionRuleIds], sourceRefs: [{ entityType: "feature" as const, entityId: id === "action_export" ? "feature_export" : "feature_process" }] };
}

function uiState(id: string) {
  const specs = {
    ui_state_empty: ["empty", "空态", "暂无符合条件的数据"],
    ui_state_error: ["error", "异常态", "数据加载失败"],
    ui_state_no_permission: ["no_permission", "无权限态", "当前角色无权访问该页面或操作"]
  } as const;
  const [type, name, description] = specs[id as keyof typeof specs];
  return { id, type, name, description };
}

function permission(id: string, roleId: string, targetType: "action" | "data", targetId: string, effect: "allow", dataScope: "self" | "department" | "all", reason: string) {
  return { id, roleId, targetType, targetId, effect, dataScope, reason };
}

function navigation(id: string, fromPageId: string, toPageId: string, triggerActionId: string | undefined, description: string) {
  return { id, fromPageId, toPageId, triggerActionId, description };
}

function businessState(id: string, name: string, description: string, type: "initial" | "intermediate" | "terminal") {
  return { id, name, description, type };
}

function transition(id: string, name: string, fromStateId: string, toStateId: string, triggerActionId: string, allowedRoleIds: string[]) {
  return { id, name, fromStateId, toStateId, triggerActionId, allowedRoleIds };
}

function collection<T extends { id: string }>(items: T[]) {
  return { byId: Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>, order: items.map((item) => item.id) };
}

function mapping(id: string, entityId: string, entityType: "page" | "module" | "field" | "action" | "ui_state", dataAttribute: string, domSelector: string, name: string) {
  return { id, entityId, entityType, domSelector, dataAttribute, dataValue: entityId, name, mappingRole: "primary" as const };
}

function fieldSelector(id: string): string {
  const scoped = {
    field_code: '[data-module-id="module_filter"] [data-field-id="field_code"].primary-field',
    field_customer: '[data-module-id="module_filter"] [data-field-id="field_customer"].primary-field',
    field_name: '[data-module-id="module_filter"] [data-field-id="field_name"].primary-field',
    field_amount: '[data-module-id="module_filter"] [data-field-id="field_amount"].primary-field',
    field_owner: '[data-module-id="module_filter"] [data-field-id="field_owner"].primary-field',
    field_status: '[data-module-id="module_filter"] [data-field-id="field_status"].primary-field',
    field_current_node: '[data-module-id="module_filter"] [data-field-id="field_current_node"].primary-field',
    field_description: '[data-module-id="module_form"] [data-field-id="field_description"].primary-field',
    field_attachment: '[data-module-id="module_form"] [data-field-id="field_attachment"].primary-field',
    field_risk: '[data-module-id="module_detail_card"] [data-field-id="field_risk"].primary-field'
  };
  return scoped[id as keyof typeof scoped] || `[data-field-id="${id}"].primary-field`;
}

function prd(id: string, title: string, type: "page" | "module" | "field" | "action" | "state_transition" | "permission", entityType: "page" | "module" | "field" | "action" | "state_transition" | "permission", entityId: string, content: string) {
  return { id, parentId: null, title, type, target: { entityType, entityId }, content, sortOrder: Number(id.length), sourceRefs: [{ entityType, entityId }], assumptions: [], pendingQuestions: [] };
}

function testCase(id: string, title: string, preconditions: string[], steps: string[], expectedResults: string[], relatedActionIds: string[], relatedAcceptanceCriterionIds: string[]) {
  return { id, title, preconditions, steps, expectedResults, relatedPageIds: ["page_list", "page_detail"], relatedActionIds, relatedAcceptanceCriterionIds, priority: "P0" as const };
}

function trace(id: string, fromType: "feature", fromId: string, toType: "page" | "action", toId: string) {
  return { id, from: { entityType: fromType, entityId: fromId }, to: { entityType: toType, entityId: toId }, confidence: "medium" as const, status: "active" as const, createdBy: "generator" as const, reason: "通用 B 端规则生成" };
}

function pageName(id: string, context: GenericContext): string {
  return {
    page_list: `${context.businessObject}列表页`,
    page_detail: `${context.businessObject}详情页`,
    page_create: `新建${context.businessObject}页`,
    page_approval: `${context.businessObject}审批处理页`,
    page_log: `${context.businessObject}操作记录页`
  }[id] || id;
}

function moduleName(id: string, context: GenericContext): string {
  return {
    module_filter: "筛选区",
    module_table: `${context.businessObject}表格`,
    module_detail_card: `${context.businessObject}详情`,
    module_timeline: "状态记录",
    module_form: `${context.businessObject}表单`,
    module_process_panel: context.hasApproval ? "审批面板" : "处理面板",
    module_log: "操作记录"
  }[id] || id;
}

function fieldName(id: string, context: GenericContext): string {
  const domainField = currentDomainFields?.get(id);
  if (domainField) return domainField.name;
  return {
    field_code: `${context.businessObject}编号`,
    field_customer: "客户名称",
    field_name: `${context.businessObject}名称`,
    field_amount: `${context.businessObject}金额`,
    field_owner: "创建人",
    field_status: `${context.businessObject}状态`,
    field_current_node: "当前审批节点",
    field_description: "特殊条款说明",
    field_attachment: "附件",
    field_risk: "风险提示"
  }[id] || id;
}

function actionName(id: string, context: GenericContext): string {
  return {
    action_create: `新建${context.businessObject}`,
    action_submit: context.hasApproval ? "提交审批" : "提交处理",
    action_approve: "通过",
    action_reject: "驳回",
    action_withdraw: "撤回",
    action_complete: "完成",
    action_return: "退回",
    action_export: "导出",
    action_view_detail: "查看详情",
    action_search: "筛选",
    action_reset: "重置"
  }[id] || id;
}

function uiStateName(id: string): string {
  return { ui_state_empty: "空态", ui_state_error: "异常态", ui_state_no_permission: "无权限态" }[id] || id;
}

function buildDomainRoles(domain: DomainTemplate, object: string) {
  return domain.defaultRoles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description.replace(/\{object\}/g, object)
  }));
}

function genericHtml(context: GenericContext): string {
  const object = context.businessObject;
  const processButtons = context.hasApproval
    ? `<button class="primary" data-action-id="action_approve">通过</button>${context.hasReturnModification ? '<button data-action-id="action_return">退回修改</button>' : ""}<button class="danger" data-action-id="action_reject">驳回</button>`
    : '<button class="primary" data-action-id="action_complete">完成</button><button class="danger" data-action-id="action_return">退回</button>';
  const processPage = context.hasApproval
    ? `<section data-page-id="page_approval"><h1>${object}审批处理页</h1><section data-module-id="module_process_panel"><h2>审批面板</h2><p><span data-field-id="field_name">${object}样例 A</span> 当前状态：<span data-field-id="field_status">待法务审批</span>，当前节点：<span data-field-id="field_current_node">法务审批</span></p><p><span data-field-id="field_amount" class="primary-field">680000.00</span> 元，${context.approvalThresholdText}</p><p data-field-id="field_description">审批前需确认信息完整、权限合规、附件有效。${context.approvalRouteText}</p><div class="toolbar">${processButtons}</div></section></section>`
    : "";
  const detailActions = context.hasApproval
    ? '<button data-action-id="action_withdraw">撤回</button>'
    : processButtons;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${context.projectName}原型</title>
  <style>
    body { margin: 0; font-family: Arial, "Microsoft YaHei", sans-serif; color: #1f2937; background: #f5f7fb; }
    header { height: 56px; display: flex; align-items: center; padding: 0 24px; background: #183153; color: #fff; }
    main { padding: 20px 24px; }
    section { margin: 0 0 18px; padding: 16px; background: #fff; border: 1px solid #d8dee8; border-radius: 6px; }
    .toolbar { display: flex; gap: 8px; margin-top: 12px; }
    button, a { border: 1px solid #9aa8bc; background: #fff; color: #183153; border-radius: 4px; padding: 7px 12px; text-decoration: none; }
    .primary { background: #1f6feb; color: #fff; border-color: #1f6feb; }
    .danger { color: #b42318; border-color: #f3b1aa; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(140px, 1fr)); gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .state { color: #5b6472; font-size: 13px; }
  </style>
</head>
<body>
  <header><strong>${context.projectName}</strong></header>
  <main>
    <section data-page-id="page_list">
      <h1>${object}列表页</h1>
      <section data-module-id="module_filter">
        <h2>筛选区</h2>
        <div class="grid">
          <label class="field"><span data-field-id="field_status" class="primary-field">状态</span><select><option>全部</option><option>${context.hasApproval ? "待审批" : "处理中"}</option></select></label>
          <label class="field"><span data-field-id="field_code" class="primary-field">${object}编号</span><input value="${object}-202604-001" /></label>
          <label class="field"><span data-field-id="field_customer" class="primary-field">客户名称</span><input value="华东示例客户" /></label>
          <label class="field"><span data-field-id="field_amount" class="primary-field">${object}金额</span><input value="680000.00" /></label>
          <label class="field"><span data-field-id="field_owner" class="primary-field">创建人</span><input value="张三" /></label>
          <label class="field"><span data-field-id="field_current_node" class="primary-field">当前审批节点</span><select><option>全部</option><option>销售主管</option><option>法务</option><option>财务</option></select></label>
          <label class="field"><span data-field-id="field_name" class="primary-field">${object}名称</span><input value="${object}样例 A" /></label>
        </div>
        <div class="toolbar"><button data-action-id="action_search">筛选</button><button data-action-id="action_reset">重置</button></div>
      </section>
      <section data-module-id="module_table">
        <h2>${object}表格</h2>
        <p><span data-field-id="field_code">${object}-202604-001</span> / <span data-field-id="field_customer">华东示例客户</span> / <span data-field-id="field_name">${object}样例 A</span> / <span data-field-id="field_amount">680000.00</span> / <span data-field-id="field_owner">张三</span> / <span data-field-id="field_status">${context.hasApproval ? "待法务审批" : "处理中"}</span> / <span data-field-id="field_current_node">法务审批</span></p>
        <div data-ui-state-id="ui_state_empty">空态：暂无符合条件的数据</div>
        <div data-ui-state-id="ui_state_error">异常态：数据加载失败</div>
        <div data-ui-state-id="ui_state_no_permission">无权限态：当前角色无权访问</div>
        <div class="toolbar"><button class="primary" data-action-id="action_create">新建${object}</button><button data-action-id="action_export">导出</button><a data-action-id="action_view_detail">查看详情</a></div>
      </section>
    </section>
    <section data-page-id="page_detail">
      <h1>${object}详情页</h1>
      <section data-module-id="module_detail_card"><h2>${object}详情</h2><p><span data-field-id="field_code">${object}-202604-001</span>，客户 <span data-field-id="field_customer">华东示例客户</span>，金额 <span data-field-id="field_amount">680000.00</span> 元。</p><p><span data-field-id="field_name">${object}样例 A</span> 由 <span data-field-id="field_owner">张三</span> 创建，状态 <span data-field-id="field_status">${context.hasApproval ? "待法务审批" : "处理中"}</span>。</p><p data-field-id="field_description">特殊条款说明、回款方式、付款条件和合同周期。</p><p data-field-id="field_attachment" class="primary-field">附件：合同正文、客户资质、报价单</p><p data-field-id="field_risk" class="primary-field">风险提示：存在特殊付款条件，需法务和财务关注。</p><div class="toolbar">${detailActions}</div></section>
      <section data-module-id="module_timeline"><h2>状态记录</h2><ol><li>草稿</li><li>${context.hasApproval ? "提交审批" : "提交处理"}</li><li>销售主管通过</li><li>待法务审批</li></ol></section>
    </section>
    <section data-page-id="page_create">
      <h1>新建${object}页</h1>
      <section data-module-id="module_form"><h2>${object}表单</h2><p data-field-id="field_customer" class="primary-field">客户名称</p><p data-field-id="field_name">${object}名称</p><p data-field-id="field_amount" class="primary-field">${object}金额</p><p data-field-id="field_description" class="primary-field">特殊条款说明</p><p data-field-id="field_attachment" class="primary-field">附件</p><button class="primary" data-action-id="action_submit">${context.hasApproval ? "提交审批" : "提交处理"}</button></section>
    </section>
    ${processPage}
    <section data-page-id="page_log"><h1>${object}操作记录页</h1><section data-module-id="module_log"><h2>操作记录</h2><ol><li>创建${object}</li><li>${context.hasApproval ? "审批处理" : "状态处理"}</li></ol></section></section>
  </main>
</body>
</html>`;
}
