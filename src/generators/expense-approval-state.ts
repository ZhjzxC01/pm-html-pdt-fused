import { createEmptyProjectState } from "../state/project-state-manager.js";
import type { ProjectState } from "../types/index.js";

export function createExpenseApprovalProjectState(now = new Date().toISOString()): ProjectState {
  const state = createEmptyProjectState("expense-approval", now);

  state.requirementCard = {
    id: "requirement_expense_approval",
    title: "费用报销审批",
    sourceType: "free_text",
    businessDomain: "企业费用管理",
    background: "企业需要规范员工费用报销、主管审批、财务复核和管理员导出。",
    problemStatement: "当前费用报销依赖线下沟通，审批状态不透明，权限边界和测试口径缺少统一结构化表达。",
    goals: {
      byId: {
        goal_expense_approval: {
          id: "goal_expense_approval",
          description: "完成费用报销提交、审批、复核、打款前状态管理和导出。",
          priority: "P0"
        }
      },
      order: ["goal_expense_approval"]
    },
    roles: {
      byId: {
        role_employee: { id: "role_employee", name: "员工", description: "新建、提交、撤回并查看自己的报销单" },
        role_manager: { id: "role_manager", name: "直属主管", description: "审批自己负责员工的报销单" },
        role_finance: { id: "role_finance", name: "财务", description: "复核主管已通过的报销单" },
        role_admin: { id: "role_admin", name: "管理员", description: "查看全部报销单并导出数据" }
      },
      order: ["role_employee", "role_manager", "role_finance", "role_admin"]
    },
    businessObjects: {
      byId: {
        object_expense_report: {
          id: "object_expense_report",
          name: "费用报销单",
          description: "员工提交的费用报销申请，包含金额、事由、附件、状态和审批日志。",
          keyFields: ["amount", "reason", "status", "applicant", "department"]
        }
      },
      order: ["object_expense_report"]
    },
    scenarios: {
      byId: {
        scenario_submit_expense: {
          id: "scenario_submit_expense",
          name: "员工提交报销",
          description: "员工填写报销信息并提交给主管审批。",
          relatedRoleIds: ["role_employee"]
        },
        scenario_approve_expense: {
          id: "scenario_approve_expense",
          name: "审批与复核",
          description: "主管审批后财务复核，任一节点可以驳回。",
          relatedRoleIds: ["role_manager", "role_finance"]
        },
        scenario_export_expense: {
          id: "scenario_export_expense",
          name: "管理员导出",
          description: "管理员按条件筛选并导出全部报销单。",
          relatedRoleIds: ["role_admin"]
        }
      },
      order: ["scenario_submit_expense", "scenario_approve_expense", "scenario_export_expense"]
    },
    features: {
      byId: {
        feature_expense_submit: {
          id: "feature_expense_submit",
          name: "费用报销提交",
          description: "员工新建报销单、填写必填字段并提交审批。",
          priority: "P0",
          relatedRoleIds: ["role_employee"],
          relatedScenarioIds: ["scenario_submit_expense"],
          acceptanceCriteria: {
            byId: {
              criterion_submit_expense: {
                id: "criterion_submit_expense",
                title: "提交成功",
                description: "员工填写报销金额、事由和附件后，可以提交审批，状态变为待主管审批。",
                priority: "P0",
                relatedFeatureIds: ["feature_expense_submit"],
                relatedPageIds: ["page_expense_create"],
                relatedActionIds: ["action_submit_expense"],
                relatedStateIds: ["business_state_pending_manager_approval"],
                testable: true
              }
            },
            order: ["criterion_submit_expense"]
          }
        },
        feature_expense_approval: {
          id: "feature_expense_approval",
          name: "费用报销审批",
          description: "主管和财务按节点审批或驳回报销单。",
          priority: "P0",
          relatedRoleIds: ["role_manager", "role_finance"],
          relatedScenarioIds: ["scenario_approve_expense"],
          acceptanceCriteria: {
            byId: {
              criterion_approve_expense: {
                id: "criterion_approve_expense",
                title: "审批通过",
                description: "主管审批通过后进入财务复核，财务通过后进入待打款。",
                priority: "P0",
                relatedFeatureIds: ["feature_expense_approval"],
                relatedPageIds: ["page_expense_approval"],
                relatedActionIds: ["action_approve_expense"],
                relatedStateIds: ["business_state_pending_finance_review", "business_state_pending_payment"],
                testable: true
              },
              criterion_reject_expense: {
                id: "criterion_reject_expense",
                title: "审批驳回",
                description: "主管或财务驳回后，报销单进入已驳回状态并记录原因。",
                priority: "P0",
                relatedFeatureIds: ["feature_expense_approval"],
                relatedPageIds: ["page_expense_approval"],
                relatedActionIds: ["action_reject_expense"],
                relatedStateIds: ["business_state_rejected"],
                testable: true
              }
            },
            order: ["criterion_approve_expense", "criterion_reject_expense"]
          }
        },
        feature_expense_export: {
          id: "feature_expense_export",
          name: "费用报销导出",
          description: "管理员可以筛选并导出全部报销单。",
          priority: "P0",
          relatedRoleIds: ["role_admin"],
          relatedScenarioIds: ["scenario_export_expense"],
          acceptanceCriteria: {
            byId: {
              criterion_export_expense: {
                id: "criterion_export_expense",
                title: "管理员导出",
                description: "管理员可以导出全部报销单，普通员工不展示导出入口。",
                priority: "P0",
                relatedFeatureIds: ["feature_expense_export"],
                relatedPageIds: ["page_expense_list"],
                relatedActionIds: ["action_export_expense"],
                testable: true
              }
            },
            order: ["criterion_export_expense"]
          }
        }
      },
      order: ["feature_expense_submit", "feature_expense_approval", "feature_expense_export"]
    },
    inScope: ["报销单列表", "报销单详情", "新建报销单", "审批处理", "审批日志", "权限控制", "数据导出"],
    outOfScope: ["实际打款", "发票 OCR", "预算系统集成"],
    assumptions: [{ id: "assumption_expense_attachment", content: "首轮附件只做字段展示，不实现上传服务。", confidence: "high" }],
    pendingQuestions: [],
    risks: [
      {
        id: "risk_expense_permission_scope",
        description: "部门和直属关系的数据范围需要后续接入组织架构后精确判断。",
        impact: "medium",
        mitigation: "首轮通过 dataScope 表达，不接组织架构服务。"
      }
    ]
  };

  state.prototypeSpec = {
    id: "prototype_expense_approval",
    pages: {
      byId: {
        page_expense_list: page("page_expense_list", "费用报销列表页", "list", "/expenses", "查看、筛选、导出费用报销单", [
          module("module_expense_filter", "筛选区", "filter", ["field_expense_status", "field_expense_applicant", "field_expense_amount"]),
          module("module_expense_table", "报销单表格", "table", ["field_expense_applicant", "field_expense_amount", "field_expense_status"])
        ], ["action_create_expense", "action_search_expense", "action_reset_expense_filter", "action_export_expense", "action_view_expense_detail"], [
          "ui_state_expense_empty",
          "ui_state_expense_error",
          "ui_state_expense_no_permission"
        ], ["feature_expense_submit", "feature_expense_export"]),
        page_expense_detail: page("page_expense_detail", "费用报销详情页", "detail", "/expenses/:id", "查看报销单详情和审批结果", [
          module("module_expense_detail_card", "报销详情", "detail_card", ["field_expense_applicant", "field_expense_amount", "field_expense_reason", "field_expense_status"]),
          module("module_expense_log_timeline", "审批日志", "log_timeline", ["field_expense_status"])
        ], ["action_withdraw_expense"], ["ui_state_expense_no_permission"], ["feature_expense_submit", "feature_expense_approval"]),
        page_expense_create: page("page_expense_create", "新建报销单页", "create", "/expenses/new", "填写并提交费用报销单", [
          module("module_expense_form", "报销表单", "form", ["field_expense_amount", "field_expense_reason", "field_expense_attachment"])
        ], ["action_submit_expense"], ["ui_state_expense_error"], ["feature_expense_submit"]),
        page_expense_approval: page("page_expense_approval", "审批处理页", "approval", "/expenses/:id/approval", "主管或财务审批报销单", [
          module("module_expense_approval_panel", "审批面板", "approval_panel", ["field_expense_amount", "field_expense_reason", "field_expense_status"])
        ], ["action_approve_expense", "action_reject_expense"], ["ui_state_expense_no_permission"], ["feature_expense_approval"]),
        page_expense_log: page("page_expense_log", "审批日志页", "log", "/expenses/:id/logs", "查看完整审批日志", [
          module("module_expense_log", "审批日志", "log_timeline", ["field_expense_status"])
        ], [], [], ["feature_expense_approval"])
      },
      order: ["page_expense_list", "page_expense_detail", "page_expense_create", "page_expense_approval", "page_expense_log"]
    },
    navigation: {
      byId: {
        navigation_list_to_create: {
          id: "navigation_list_to_create",
          fromPageId: "page_expense_list",
          toPageId: "page_expense_create",
          triggerActionId: "action_create_expense",
          description: "点击新建进入新建报销单页"
        },
        navigation_list_to_detail: {
          id: "navigation_list_to_detail",
          fromPageId: "page_expense_list",
          toPageId: "page_expense_detail",
          triggerActionId: "action_view_expense_detail",
          description: "点击查看详情进入报销详情"
        },
        navigation_detail_to_log: {
          id: "navigation_detail_to_log",
          fromPageId: "page_expense_detail",
          toPageId: "page_expense_log",
          description: "从详情页查看审批日志"
        }
      },
      order: ["navigation_list_to_create", "navigation_list_to_detail", "navigation_detail_to_log"]
    },
    permissions: {
      byId: Object.fromEntries(
        [
          permission("permission_employee_create_expense", "role_employee", "action", "action_create_expense", "allow", "self", "员工可以新建自己的报销单"),
          permission("permission_employee_submit_expense", "role_employee", "action", "action_submit_expense", "allow", "self", "员工可以提交自己的报销单"),
          permission("permission_employee_withdraw_expense", "role_employee", "action", "action_withdraw_expense", "allow", "self", "员工可以撤回自己的草稿或待审批报销单"),
          permission("permission_manager_approve_expense", "role_manager", "action", "action_approve_expense", "allow", "department", "主管审批负责员工的报销单"),
          permission("permission_manager_reject_expense", "role_manager", "action", "action_reject_expense", "allow", "department", "主管可以驳回负责员工的报销单"),
          permission("permission_finance_approve_expense", "role_finance", "action", "action_approve_expense", "allow", "all", "财务复核主管已通过的报销单"),
          permission("permission_finance_reject_expense", "role_finance", "action", "action_reject_expense", "allow", "all", "财务可以驳回复核中的报销单"),
          permission("permission_admin_export_expense", "role_admin", "action", "action_export_expense", "allow", "all", "管理员可以导出全部报销单"),
          permission("permission_employee_view_own_expense", "role_employee", "data", "object_expense_report", "allow", "self", "员工只能查看自己的报销单"),
          permission("permission_admin_view_all_expense", "role_admin", "data", "object_expense_report", "allow", "all", "管理员可以查看全部报销单")
        ].map((item) => [item.id, item])
      ),
      order: [
        "permission_employee_create_expense",
        "permission_employee_submit_expense",
        "permission_employee_withdraw_expense",
        "permission_manager_approve_expense",
        "permission_manager_reject_expense",
        "permission_finance_approve_expense",
        "permission_finance_reject_expense",
        "permission_admin_export_expense",
        "permission_employee_view_own_expense",
        "permission_admin_view_all_expense"
      ]
    },
    mockDataSets: {
      byId: {
        mock_expense_reports: {
          id: "mock_expense_reports",
          name: "报销单列表样例",
          targetPageId: "page_expense_list",
          records: [
            { applicant: "张三", amount: 1280, status: "待主管审批" },
            { applicant: "李四", amount: 360, status: "已完成" }
          ]
        }
      },
      order: ["mock_expense_reports"]
    }
  };

  state.flowSpec = {
    id: "flow_expense_approval",
    flows: {
      byId: {
        flow_expense_approval: {
          id: "flow_expense_approval",
          name: "费用报销审批流程",
          description: "草稿提交后经主管审批、财务复核，最终进入待打款或驳回。",
          relatedPageIds: ["page_expense_create", "page_expense_approval", "page_expense_detail"],
          relatedActionIds: ["action_submit_expense", "action_approve_expense", "action_reject_expense", "action_withdraw_expense"]
        }
      },
      order: ["flow_expense_approval"]
    },
    stateMachines: {
      byId: {
        state_machine_expense_report: {
          id: "state_machine_expense_report",
          name: "费用报销单状态机",
          businessObjectId: "object_expense_report",
          states: collection([
            businessState("business_state_draft", "草稿", "员工保存但未提交的报销单", "initial"),
            businessState("business_state_pending_manager_approval", "待主管审批", "等待直属主管审批", "intermediate"),
            businessState("business_state_pending_finance_review", "待财务复核", "主管通过后等待财务复核", "intermediate"),
            businessState("business_state_pending_payment", "待打款", "财务复核通过后等待打款", "intermediate"),
            businessState("business_state_completed", "已完成", "打款完成后的终态", "terminal"),
            businessState("business_state_rejected", "已驳回", "主管或财务驳回后的终态", "terminal"),
            businessState("business_state_withdrawn", "已撤回", "员工撤回后的终态", "terminal")
          ]),
          transitions: collection([
            transition("transition_submit_expense", "提交审批", "business_state_draft", "business_state_pending_manager_approval", "action_submit_expense", ["role_employee"]),
            transition("transition_manager_approve", "主管审批通过", "business_state_pending_manager_approval", "business_state_pending_finance_review", "action_approve_expense", ["role_manager"]),
            transition("transition_manager_reject", "主管驳回", "business_state_pending_manager_approval", "business_state_rejected", "action_reject_expense", ["role_manager"]),
            transition("transition_finance_approve", "财务复核通过", "business_state_pending_finance_review", "business_state_pending_payment", "action_approve_expense", ["role_finance"]),
            transition("transition_finance_reject", "财务驳回", "business_state_pending_finance_review", "business_state_rejected", "action_reject_expense", ["role_finance"]),
            transition("transition_withdraw_expense", "撤回报销单", "business_state_pending_manager_approval", "business_state_withdrawn", "action_withdraw_expense", ["role_employee"])
          ]),
          initialStateId: "business_state_draft",
          terminalStateIds: ["business_state_completed", "business_state_rejected", "business_state_withdrawn"]
        }
      },
      order: ["state_machine_expense_report"]
    }
  };

  state.htmlPrototype = {
    id: "html_expense_approval",
    packageType: "single_html",
    files: {
      byId: {
        html_index: {
          id: "html_index",
          fileName: "index.html",
          type: "html",
          content: expenseHtml()
        }
      },
      order: ["html_index"]
    },
    sourcePrototypeSpecId: "prototype_expense_approval",
    generatedAt: now,
    generatorVersion: "0.1.0",
    status: "review_ready",
    assumptions: [],
    pendingQuestions: []
  };

  state.prototypeMeta = createPrototypeMeta();
  state.prdSpec = createPrdSpec();
  state.testCaseSpec = createTestCaseSpec(now);
  state.prototypeAnnotationSpec = createAnnotationSpec(now);
  state.traceability.links = [
    trace("trace_feature_submit_to_page_create", "feature", "feature_expense_submit", "page", "page_expense_create"),
    trace("trace_feature_approval_to_page_approval", "feature", "feature_expense_approval", "page", "page_expense_approval"),
    trace("trace_feature_export_to_action_export", "feature", "feature_expense_export", "action", "action_export_expense")
  ];

  return state;
}

function page(id: string, name: string, type: "list" | "detail" | "create" | "approval" | "log", routePath: string, goal: string, modules: ReturnType<typeof module>[], actionIds: string[], uiStateIds: string[], featureIds: string[]) {
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
    roleVisibility: [
      { roleId: "role_employee", visible: true },
      { roleId: "role_manager", visible: true },
      { roleId: "role_finance", visible: true },
      { roleId: "role_admin", visible: true }
    ],
    sourceRefs: featureIds.map((featureId) => ({ entityType: "feature" as const, entityId: featureId }))
  };
}

function module(id: string, name: string, type: "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline", fieldIds: string[]) {
  return {
    id,
    name,
    type,
    fields: collection(fieldIds.map(field)),
    sourceRefs: [{ entityType: "feature" as const, entityId: type === "approval_panel" ? "feature_expense_approval" : "feature_expense_submit" }]
  };
}

function field(id: string) {
  const specs = {
    field_expense_amount: { name: "报销金额", fieldKey: "amount", type: "money" as const, required: true },
    field_expense_reason: { name: "报销事由", fieldKey: "reason", type: "textarea" as const, required: true },
    field_expense_status: { name: "审批状态", fieldKey: "status", type: "status" as const, required: true },
    field_expense_applicant: { name: "申请人", fieldKey: "applicant", type: "user" as const, required: true },
    field_expense_attachment: { name: "报销附件", fieldKey: "attachment", type: "file" as const, required: true }
  };
  return { id, ...specs[id as keyof typeof specs] };
}

function action(id: string) {
  const specs = {
    action_create_expense: ["新建报销单", "create", "toolbar", "button", "P0", ["permission_employee_create_expense"]],
    action_submit_expense: ["提交审批", "submit", "form_footer", "button", "P0", ["permission_employee_submit_expense"]],
    action_approve_expense: ["审批通过", "approve", "form_footer", "button", "P0", ["permission_manager_approve_expense", "permission_finance_approve_expense"]],
    action_reject_expense: ["驳回", "reject", "form_footer", "button", "P0", ["permission_manager_reject_expense", "permission_finance_reject_expense"]],
    action_withdraw_expense: ["撤回", "withdraw", "toolbar", "button", "P0", ["permission_employee_withdraw_expense"]],
    action_export_expense: ["导出", "export", "toolbar", "button", "P0", ["permission_admin_export_expense"]],
    action_view_expense_detail: ["查看详情", "view", "row", "link", "P1", []],
    action_search_expense: ["筛选", "search", "toolbar", "button", "P1", []],
    action_reset_expense_filter: ["重置", "reset", "toolbar", "button", "P1", []]
  } as const;
  const [name, type, placement, triggerComponent, priority, permissionRuleIds] = specs[id as keyof typeof specs];
  return {
    id,
    name,
    type,
    placement,
    triggerComponent,
    priority,
    permissionRuleIds: [...permissionRuleIds],
    sourceRefs: [{ entityType: "feature" as const, entityId: id === "action_export_expense" ? "feature_expense_export" : "feature_expense_approval" }]
  };
}

function uiState(id: string) {
  const specs = {
    ui_state_expense_empty: ["empty", "空态", "暂无符合条件的报销单"],
    ui_state_expense_error: ["error", "异常态", "报销单加载失败"],
    ui_state_expense_no_permission: ["no_permission", "无权限态", "当前角色无权访问该页面或操作"]
  } as const;
  const [type, name, description] = specs[id as keyof typeof specs];
  return { id, type, name, description };
}

function permission(id: string, roleId: string, targetType: "action" | "data", targetId: string, effect: "allow", dataScope: "self" | "department" | "all", reason: string) {
  return { id, roleId, targetType, targetId, effect, dataScope, reason };
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

function trace(id: string, fromType: "feature", fromId: string, toType: "page" | "action", toId: string) {
  return {
    id,
    from: { entityType: fromType, entityId: fromId },
    to: { entityType: toType, entityId: toId },
    confidence: "high" as const,
    status: "active" as const,
    createdBy: "generator" as const,
    reason: "规则版费用报销场景生成"
  };
}

function createPrototypeMeta() {
  return {
    id: "meta_expense_approval",
    sourcePrototypeSpecId: "prototype_expense_approval",
    pageMappings: ["page_expense_list", "page_expense_detail", "page_expense_create", "page_expense_approval", "page_expense_log"].map((id) => mapping(`mapping_${id}`, id, "page" as const, "data-page-id", `[data-page-id="${id}"]`, pageNames[id as keyof typeof pageNames])),
    moduleMappings: ["module_expense_filter", "module_expense_table", "module_expense_form", "module_expense_detail_card", "module_expense_approval_panel", "module_expense_log"].map((id) => mapping(`mapping_${id}`, id, "module" as const, "data-module-id", `[data-module-id="${id}"]`, moduleNames[id as keyof typeof moduleNames])),
    fieldMappings: ["field_expense_amount", "field_expense_reason", "field_expense_status", "field_expense_applicant", "field_expense_attachment"].map((id) => mapping(`mapping_${id}`, id, "field" as const, "data-field-id", `[data-field-id="${id}"].primary-field`, fieldNames[id as keyof typeof fieldNames])),
    actionMappings: ["action_create_expense", "action_submit_expense", "action_approve_expense", "action_reject_expense", "action_withdraw_expense", "action_export_expense", "action_view_expense_detail", "action_search_expense", "action_reset_expense_filter"].map((id) => mapping(`mapping_${id}`, id, "action" as const, "data-action-id", `[data-action-id="${id}"]`, actionNames[id as keyof typeof actionNames])),
    uiStateMappings: ["ui_state_expense_empty", "ui_state_expense_error", "ui_state_expense_no_permission"].map((id) => mapping(`mapping_${id}`, id, "ui_state" as const, "data-ui-state-id", `[data-ui-state-id="${id}"]`, uiStateNames[id as keyof typeof uiStateNames]))
  };
}

function mapping(id: string, entityId: string, entityType: "page" | "module" | "field" | "action" | "ui_state", dataAttribute: string, domSelector: string, name: string) {
  return { id, entityId, entityType, domSelector, dataAttribute, dataValue: entityId, name, mappingRole: "primary" as const };
}

function createPrdSpec() {
  const sections = [
    prd("prd_section_page_expense_list", "费用报销列表页", "page", "page", "page_expense_list", "列表页提供筛选、查看、新建和管理员导出入口。"),
    prd("prd_section_module_expense_filter", "筛选区", "module", "module", "module_expense_filter", "筛选区支持按状态、申请人和金额范围定位报销单。"),
    prd("prd_section_field_expense_status", "审批状态筛选", "field", "field", "field_expense_status", "审批状态下拉框支持按全部、待主管审批、待财务复核、已打款、已驳回筛选。"),
    prd("prd_section_field_expense_applicant", "申请人筛选", "field", "field", "field_expense_applicant", "申请人输入框默认为当前用户，管理员可修改为任意申请人。"),
    prd("prd_section_field_expense_amount", "报销金额字段", "field", "field", "field_expense_amount", "报销金额为必填金额字段，用于审批判断和导出。"),
    prd("prd_section_action_search_expense", "筛选操作", "action", "action", "action_search_expense", "点击筛选按钮按条件过滤表格数据。"),
    prd("prd_section_action_reset_expense_filter", "重置操作", "action", "action", "action_reset_expense_filter", "点击重置按钮清空筛选条件恢复默认值。"),
    prd("prd_section_module_expense_table", "报销单表格", "module", "module", "module_expense_table", "表格展示报销单列表，包含申请人、金额和状态信息。"),
    prd("prd_section_action_create_expense", "新建报销单", "action", "action", "action_create_expense", "点击跳转到新建报销单页面。"),
    prd("prd_section_action_view_expense_detail", "查看详情", "action", "action", "action_view_expense_detail", "点击某行跳转到该报销单详情页。"),
    prd("prd_section_module_expense_detail_card", "报销详情", "module", "module", "module_expense_detail_card", "详情卡片展示报销单完整信息。"),
    prd("prd_section_action_withdraw_expense", "撤回操作", "action", "action", "action_withdraw_expense", "提交者在主管审批前可撤回报销单。"),
    prd("prd_section_module_expense_form", "报销表单", "module", "module", "module_expense_form", "表单包含报销事由和报销附件两个必填字段。"),
    prd("prd_section_field_expense_reason", "报销事由", "field", "field", "field_expense_reason", "报销事由为必填文本域，最少5字最多500字。"),
    prd("prd_section_field_expense_attachment", "报销附件", "field", "field", "field_expense_attachment", "报销附件为必填文件上传，支持jpg/png/pdf，最大10MB。"),
    prd("prd_section_action_submit_expense", "提交审批", "action", "action", "action_submit_expense", "员工点击提交审批后，报销单进入待主管审批状态。"),
    prd("prd_section_module_expense_approval_panel", "审批面板", "module", "module", "module_expense_approval_panel", "审批面板包含审批通过和驳回两个操作按钮。"),
    prd("prd_section_action_approve_expense", "审批通过", "action", "action", "action_approve_expense", "审批通过后报销单流转到下一节点。"),
    prd("prd_section_action_reject_expense", "驳回操作", "action", "action", "action_reject_expense", "驳回后报销单状态变为已驳回。"),
    prd("prd_section_transition_manager_approve", "主管审批通过", "state_transition", "state_transition", "transition_manager_approve", "主管审批通过后，报销单进入待财务复核状态。"),
    prd("prd_section_permission_admin_export", "管理员导出权限", "permission", "permission", "permission_admin_export_expense", "只有管理员可以看到导出入口并导出全部报销单。")
  ];
  return {
    id: "prd_expense_approval",
    title: "费用报销审批 PRD",
    requirementLevel: "M" as const,
    toc: sections.map((section, index) => ({ id: `toc_${section.id}`, title: section.title, level: 2, sectionId: section.id, sortOrder: index + 1 })),
    sections: collection(sections),
    assumptions: [],
    pendingQuestions: []
  };
}

function prd(id: string, title: string, type: "page" | "module" | "field" | "action" | "state_transition" | "permission", entityType: "page" | "module" | "field" | "action" | "state_transition" | "permission", entityId: string, content: string) {
  return { id, parentId: null, title, type, target: { entityType, entityId }, content, sortOrder: Number(id.length), sourceRefs: [{ entityType, entityId }], assumptions: [], pendingQuestions: [] };
}

function createTestCaseSpec(now: string) {
  const cases = [
    testCase("test_case_submit_expense_success", "提交费用报销成功", ["员工已登录"], ["点击新建报销单", "填写报销金额、事由和附件", "点击提交审批"], ["报销单进入待主管审批状态"], ["action_create_expense", "action_submit_expense"], ["criterion_submit_expense"]),
    testCase("test_case_manager_approve_expense", "主管审批通过", ["报销单处于待主管审批"], ["主管点击审批通过"], ["报销单进入待财务复核状态"], ["action_approve_expense"], ["criterion_approve_expense"]),
    testCase("test_case_finance_reject_expense", "财务驳回报销单", ["报销单处于待财务复核"], ["财务填写驳回原因", "点击驳回"], ["报销单进入已驳回状态"], ["action_reject_expense"], ["criterion_reject_expense"]),
    testCase("test_case_employee_withdraw_expense", "员工撤回报销单", ["报销单处于待主管审批"], ["员工点击撤回"], ["报销单进入已撤回状态"], ["action_withdraw_expense"], ["criterion_submit_expense"]),
    testCase("test_case_admin_export_expense", "管理员导出报销单", ["管理员已登录"], ["筛选报销单", "点击导出"], ["系统导出全部符合条件的报销单"], ["action_search_expense", "action_export_expense"], ["criterion_export_expense"]),
    testCase("test_case_employee_no_export", "员工不可导出", ["员工已登录"], ["进入费用报销列表页"], ["页面不展示导出入口"], ["action_export_expense"], ["criterion_export_expense"])
  ];
  return {
    id: "test_spec_expense_approval",
    testSuites: collection([{ id: "test_suite_expense_approval", name: "费用报销审批测试", type: "functional" as const, cases: collection(cases) }]),
    sourceRefs: [{ entityType: "feature" as const, entityId: "feature_expense_submit" }],
    generatedAt: now
  };
}

function testCase(id: string, title: string, preconditions: string[], steps: string[], expectedResults: string[], relatedActionIds: string[], relatedAcceptanceCriterionIds: string[]) {
  return { id, title, preconditions, steps, expectedResults, relatedPageIds: ["page_expense_list", "page_expense_approval"], relatedActionIds, relatedAcceptanceCriterionIds, priority: "P0" as const };
}

function createAnnotationSpec(now: string) {
  const NL = "\n";
  const annotations = [
    {
      id: "annotation_module_expense_filter",
      annotationNumber: 1,
      title: "筛选区需求",
      targetSelector: '[data-module-id="module_expense_filter"]',
      targetDescription: "费用报销列表页 - 筛选区模块",
      prdSectionIds: ["prd_section_module_expense_filter", "prd_section_field_expense_status", "prd_section_field_expense_applicant", "prd_section_field_expense_amount", "prd_section_action_search_expense", "prd_section_action_reset_expense_filter"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: "筛选区位于报销单列表页顶部，包含审批状态（下拉框）、申请人（输入框）、报销金额（输入框）三个筛选字段，使用三列网格布局。筛选和重置按钮位于筛选区底部工具栏。" },
        { heading: "交互与排序", markdownContent: ["- 审批状态下拉框：可选“全部”、“待主管审批”、“待财务复核”、“已打款”、“已驳回”。", "- 申请人输入框：默认值为当前登录用户，支持手动修改。", "- 报销金额输入框：支持输入金额数值。", "- 筛选按钮：点击后按条件过滤表格数据。", "- 重置按钮：点击后清空筛选条件，恢复默认值。"].join(NL) },
        { heading: "业务定义", markdownContent: "筛选区用于快速定位报销单。多条件之间取交集。审批状态筛选只显示与当前用户角色权限匹配的状态选项。" },
        { heading: "权限控制", markdownContent: ["- 员工角色：申请人字段默认填入本人且不可修改。", "- 管理员角色：申请人字段可自由输入，支持查看全部报销单。"].join(NL) },
        { heading: "异常处理", markdownContent: ["- 筛选无结果时显示空态提示“暂无符合条件的报销单”。", "- 网络异常时显示“报销单加载失败”并提供重试按钮。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_expense_filter", label: "筛选区" },
        { entityType: "field" as const, entityId: "field_expense_status", label: "审批状态" },
        { entityType: "field" as const, entityId: "field_expense_applicant", label: "申请人" },
        { entityType: "field" as const, entityId: "field_expense_amount", label: "报销金额" },
        { entityType: "action" as const, entityId: "action_search_expense", label: "筛选" },
        { entityType: "action" as const, entityId: "action_reset_expense_filter", label: "重置" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_expense_table",
      annotationNumber: 2,
      title: "报销单表格需求",
      targetSelector: '[data-module-id="module_expense_table"]',
      targetDescription: "费用报销列表页 - 报销单表格模块",
      prdSectionIds: ["prd_section_module_expense_table", "prd_section_action_create_expense", "prd_section_action_view_expense_detail", "prd_section_permission_admin_export"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: "报销单表格位于筛选区下方，展示报销单列表。每行显示申请人、金额、状态。表格底部工具栏包含“新建报销单”按钮（主色调）、“查看详情”链接和“管理员导出”按钮。" },
        { heading: "交互与排序", markdownContent: ["- 新建报销单：点击跳转到新建报销单页。", "- 查看详情：点击某行跳转到该报销单详情页。", "- 管理员导出：点击导出当前筛选条件下的全部报销单为 Excel 文件。", "- 表格默认按创建时间倒序排列。"].join(NL) },
        { heading: "业务定义", markdownContent: "表格展示报销单的核心信息：申请人、金额、事由和当前审批状态。状态流转遵循：待主管审批 → 待财务复核 → 已打款，任一环节可驳回。" },
        { heading: "权限控制", markdownContent: ["- 员工：只能查看自己提交的报销单。", "- 主管：可查看自己负责审批的报销单。", "- 财务：可查看待复核和已复核的报销单。", "- 管理员：可查看全部报销单，并有导出权限。"].join(NL) },
        { heading: "状态流转", markdownContent: ["报销单状态机：", "- 初始态：草稿", "- 提交审批 → 待主管审批", "- 主管审批通过 → 待财务复核", "- 财务复核通过 → 已打款", "- 任一环节驳回 → 已驳回", "- 提交后可撤回 → 草稿"].join(NL) },
        { heading: "异常处理", markdownContent: ["- 表格数据加载失败时显示错误态“报销单加载失败”。", "- 无权限查看时显示“当前角色无权限查看全部报销单”。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_expense_table", label: "报销单表格" },
        { entityType: "action" as const, entityId: "action_create_expense", label: "新建报销单" },
        { entityType: "action" as const, entityId: "action_view_expense_detail", label: "查看详情" },
        { entityType: "action" as const, entityId: "action_export_expense", label: "管理员导出" },
        { entityType: "permission" as const, entityId: "permission_admin_export_expense", label: "管理员导出权限" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_expense_detail_card",
      annotationNumber: 3,
      title: "报销详情需求",
      targetSelector: '[data-module-id="module_expense_detail_card"]',
      targetDescription: "费用报销详情页 - 报销详情卡片模块",
      prdSectionIds: ["prd_section_module_expense_detail_card", "prd_section_action_withdraw_expense"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: "详情卡片展示报销单完整信息：申请人、金额、事由、附件和当前状态。底部包含“撤回”操作按钮。" },
        { heading: "交互与排序", markdownContent: ["- 撤回按钮：仅在报销单状态为“待主管审批”时可见。点击后报销单退回草稿状态，申请人可重新编辑后提交。", "- 附件区域：支持点击下载查看。"].join(NL) },
        { heading: "业务定义", markdownContent: "详情页用于审批人和申请人查看报销单全貌。撤回操作仅限提交者本人在主管审批前执行。" },
        { heading: "权限控制", markdownContent: ["- 撤回按钮：仅报销单提交者本人可见，且仅在“待主管审批”状态下可用。", "- 审批人和财务看到详情但无撤回按钮。"].join(NL) },
        { heading: "异常处理", markdownContent: ["- 撤回失败时显示“撤回失败，请稍后重试”。", "- 附件下载失败时显示“附件加载失败”。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_expense_detail_card", label: "报销详情" },
        { entityType: "action" as const, entityId: "action_withdraw_expense", label: "撤回" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_expense_form",
      annotationNumber: 4,
      title: "报销表单需求",
      targetSelector: '[data-module-id="module_expense_form"]',
      targetDescription: "新建报销单页 - 报销表单模块",
      prdSectionIds: ["prd_section_module_expense_form", "prd_section_field_expense_reason", "prd_section_field_expense_attachment", "prd_section_action_submit_expense"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: "报销表单包含两个必填字段：报销事由（文本域）和报销附件（文件上传）。底部有“提交审批”主按钮。" },
        { heading: "交互与排序", markdownContent: ["- 报销事由：文本域，必填，最少 5 个字，最多 500 个字。占位符“请描述报销事由”。", "- 报销附件：文件上传，必填，支持 jpg/png/pdf 格式，单文件最大 10MB。", "- 提交审批：点击后校验所有必填字段，通过后提交报销单进入“待主管审批”状态。"].join(NL) },
        { heading: "业务定义", markdownContent: "新建报销单页面是员工发起费用报销的入口。提交后系统自动将报销单流转至直属主管审批。金额从筛选页带入或在本页手动填写。" },
        { heading: "权限控制", markdownContent: ["- 仅员工角色可访问新建报销单页面。", "- 提交审批后报销单不可再编辑，只能撤回后修改。"].join(NL) },
        { heading: "验收条件", markdownContent: ["- 提交成功：报销单状态变为“待主管审批”，申请人收到提交成功通知。", "- 校验失败：表单字段标红并显示错误提示，不跳转。"].join(NL) },
        { heading: "异常处理", markdownContent: ["- 附件上传失败：显示“附件上传失败，请重试”。", "- 提交接口异常：显示“提交失败，请稍后重试”，保留表单内容。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_expense_form", label: "报销表单" },
        { entityType: "field" as const, entityId: "field_expense_reason", label: "报销事由" },
        { entityType: "field" as const, entityId: "field_expense_attachment", label: "报销附件" },
        { entityType: "action" as const, entityId: "action_submit_expense", label: "提交审批" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    },
    {
      id: "annotation_module_expense_approval_panel",
      annotationNumber: 5,
      title: "审批面板需求",
      targetSelector: '[data-module-id="module_expense_approval_panel"]',
      targetDescription: "审批处理页 - 审批面板模块",
      prdSectionIds: ["prd_section_module_expense_approval_panel", "prd_section_action_approve_expense", "prd_section_action_reject_expense", "prd_section_transition_manager_approve"],
      tooltipSections: [
        { heading: "显示样式", markdownContent: "审批面板展示报销单关键信息（金额、事由、附件）和两个操作按钮：“审批通过”（主按钮）和“驳回”（危险按钮）。" },
        { heading: "交互与排序", markdownContent: ["- 审批通过：点击后报销单流转到下一节点（主管→财务复核，财务→已打款）。", "- 驳回：点击后弹出驳回原因输入框，确认后报销单状态变为“已驳回”。", "- 按钮并排排列，审批通过在左，驳回在右。"].join(NL) },
        { heading: "业务定义", markdownContent: "审批面板是审批人处理报销单的核心操作区域。审批人需要确认金额、事由和附件后做出审批决定。主管审批通过后流转到财务复核节点。" },
        { heading: "状态流转", markdownContent: ["- 主管审批通过：待主管审批 → 待财务复核", "- 财务复核通过：待财务复核 → 已打款", "- 驳回：当前状态 → 已驳回"].join(NL) },
        { heading: "权限控制", markdownContent: ["- 审批通过按钮：仅主管角色在“待主管审批”状态下可见，仅财务角色在“待财务复核”状态下可见。", "- 驳回按钮：审批人和复核人在对应节点可见。"].join(NL) },
        { heading: "验收条件", markdownContent: ["- 主管审批通过：报销单状态变为“待财务复核”，申请人收到审批通过通知。", "- 驳回：报销单状态变为“已驳回”，申请人收到驳回通知及原因。"].join(NL) },
        { heading: "异常处理", markdownContent: ["- 审批接口异常：显示“操作失败，请稍后重试”。", "- 审批人无权限：按钮置灰并提示“无审批权限”。"].join(NL) }
      ],
      relatedEntities: [
        { entityType: "module" as const, entityId: "module_expense_approval_panel", label: "审批面板" },
        { entityType: "action" as const, entityId: "action_approve_expense", label: "审批通过" },
        { entityType: "action" as const, entityId: "action_reject_expense", label: "驳回" },
        { entityType: "state" as const, entityId: "transition_manager_approve", label: "主管审批通过流转" }
      ],
      position: { anchor: "top_right" as const, offsetX: -4, offsetY: -8 },
      severity: "info" as const
    }
  ];
  return {
    id: "annotation_spec_expense_approval",
    sourcePrdSpecId: "prd_expense_approval",
    sourcePrototypeMetaId: "meta_expense_approval",
    generatedAt: now,
    annotations: collection(annotations),
    brokenLinks: []
  };
}

const pageNames = {
  page_expense_list: "费用报销列表页",
  page_expense_detail: "费用报销详情页",
  page_expense_create: "新建报销单页",
  page_expense_approval: "审批处理页",
  page_expense_log: "审批日志页"
};
const moduleNames = {
  module_expense_filter: "筛选区",
  module_expense_table: "报销单表格",
  module_expense_form: "报销表单",
  module_expense_detail_card: "报销详情",
  module_expense_approval_panel: "审批面板",
  module_expense_log: "审批日志"
};
const fieldNames = {
  field_expense_amount: "报销金额",
  field_expense_reason: "报销事由",
  field_expense_status: "审批状态",
  field_expense_applicant: "申请人",
  field_expense_attachment: "报销附件"
};
const actionNames = {
  action_create_expense: "新建报销单",
  action_submit_expense: "提交审批",
  action_approve_expense: "审批通过",
  action_reject_expense: "驳回",
  action_withdraw_expense: "撤回",
  action_export_expense: "导出",
  action_view_expense_detail: "查看详情",
  action_search_expense: "筛选",
  action_reset_expense_filter: "重置"
};
const uiStateNames = {
  ui_state_expense_empty: "空态",
  ui_state_expense_error: "异常态",
  ui_state_expense_no_permission: "无权限态"
};

function expenseHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>费用报销审批原型</title>
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
  <header><strong>费用报销审批</strong></header>
  <main>
    <section data-page-id="page_expense_list">
      <h1>费用报销列表页</h1>
      <section data-module-id="module_expense_filter">
        <h2>筛选区</h2>
        <div class="grid">
          <label class="field"><span data-field-id="field_expense_status" class="primary-field">审批状态</span><select><option>全部</option><option>待主管审批</option></select></label>
          <label class="field"><span data-field-id="field_expense_applicant" class="primary-field">申请人</span><input value="张三" /></label>
          <label class="field"><span data-field-id="field_expense_amount" class="primary-field">报销金额</span><input value="1280.00" /></label>
        </div>
        <div class="toolbar"><button data-action-id="action_search_expense">筛选</button><button data-action-id="action_reset_expense_filter">重置</button></div>
      </section>
      <section data-module-id="module_expense_table">
        <h2>报销单表格</h2>
        <p><span data-field-id="field_expense_applicant">张三</span> 提交了 <span data-field-id="field_expense_amount">1280.00</span> 元报销，状态 <span data-field-id="field_expense_status">待主管审批</span></p>
        <div class="toolbar"><button data-action-id="action_create_expense" class="primary">新建报销单</button><a data-action-id="action_view_expense_detail" href="#detail">查看详情</a><button data-action-id="action_export_expense">管理员导出</button></div>
      </section>
      <div data-ui-state-id="ui_state_expense_empty" class="state">暂无符合条件的报销单</div>
      <div data-ui-state-id="ui_state_expense_error" class="state">报销单加载失败</div>
      <div data-ui-state-id="ui_state_expense_no_permission" class="state">当前角色无权限查看全部报销单</div>
    </section>

    <section data-page-id="page_expense_detail" id="detail">
      <h1>费用报销详情页</h1>
      <section data-module-id="module_expense_detail_card"><h2>报销详情</h2><p>申请人、金额、事由、附件和当前状态。</p><button data-action-id="action_withdraw_expense">撤回</button></section>
      <section data-module-id="module_expense_log_timeline"><h2>审批日志</h2><p>提交审批 -> 待主管审批</p></section>
    </section>

    <section data-page-id="page_expense_create">
      <h1>新建报销单页</h1>
      <section data-module-id="module_expense_form"><h2>报销表单</h2><label class="field"><span data-field-id="field_expense_reason" class="primary-field">报销事由</span><textarea>客户拜访交通费</textarea></label><label class="field"><span data-field-id="field_expense_attachment" class="primary-field">报销附件</span><input type="file" /></label><button data-action-id="action_submit_expense" class="primary">提交审批</button></section>
    </section>

    <section data-page-id="page_expense_approval">
      <h1>审批处理页</h1>
      <section data-module-id="module_expense_approval_panel"><h2>审批面板</h2><p>审批人确认金额、事由和附件后处理。</p><button data-action-id="action_approve_expense" class="primary">审批通过</button><button data-action-id="action_reject_expense" class="danger">驳回</button></section>
    </section>

    <section data-page-id="page_expense_log"><h1>审批日志页</h1><section data-module-id="module_expense_log"><h2>审批日志</h2><p>记录提交、审批、复核、驳回和撤回。</p></section></section>
  </main>
</body>
</html>`;
}
