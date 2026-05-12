import type { DomainTemplate } from "./domain-template.js";

export const procurementDomain: DomainTemplate = {
  domainId: "procurement",
  displayName: "采购管理",
  keywords: ["采购", "供应商", "招标", "比价", "询价", "入库", "出库", "库存", "物资", "物料", "采购单", "采购订单"],
  businessObjects: ["采购单", "采购订单", "供应商", "入库单", "出库单"],
  defaultRoles: [
    { id: "role_requester", name: "申请人", description: "提交采购需求申请" },
    { id: "role_department_leader", name: "部门主管", description: "审批部门内采购申请" },
    { id: "role_procurement", name: "采购员", description: "执行采购、比价、下单" },
    { id: "role_finance", name: "财务", description: "审核采购预算和付款" },
    { id: "role_warehouse", name: "仓管员", description: "确认入库、出库" },
    { id: "role_admin", name: "管理员", description: "管理采购规则和数据" }
  ],
  defaultFields: [
    { id: "field_order_no", name: "采购单号", fieldKey: "orderNo", type: "text", required: true },
    { id: "field_requester", name: "申请人", fieldKey: "requester", type: "user", required: true },
    { id: "field_department", name: "申请部门", fieldKey: "department", type: "text", required: true },
    { id: "field_item_name", name: "物资名称", fieldKey: "itemName", type: "text", required: true },
    { id: "field_item_category", name: "物资类别", fieldKey: "itemCategory", type: "select", required: true },
    { id: "field_quantity", name: "数量", fieldKey: "quantity", type: "number", required: true },
    { id: "field_unit", name: "单位", fieldKey: "unit", type: "text", required: true },
    { id: "field_unit_price", name: "单价", fieldKey: "unitPrice", type: "money", required: false },
    { id: "field_total_amount", name: "总金额", fieldKey: "totalAmount", type: "money", required: false },
    { id: "field_supplier", name: "供应商", fieldKey: "supplier", type: "text", required: false },
    { id: "field_expected_date", name: "期望到货日期", fieldKey: "expectedDate", type: "date", required: true },
    { id: "field_urgency", name: "紧急程度", fieldKey: "urgency", type: "select", required: true },
    { id: "field_status", name: "状态", fieldKey: "status", type: "status", required: true },
    { id: "field_reason", name: "采购原因", fieldKey: "reason", type: "textarea", required: true },
    { id: "field_attachment", name: "附件", fieldKey: "attachment", type: "file", required: false },
    { id: "field_approver_comment", name: "审批意见", fieldKey: "approverComment", type: "textarea", required: false }
  ],
  statePatterns: [
    {
      id: "state_pattern_procurement",
      name: "采购状态机",
      states: [
        { id: "business_state_draft", name: "草稿", description: "已创建但未提交", type: "initial" },
        { id: "business_state_pending_dept", name: "待部门审批", description: "等待部门主管审批", type: "intermediate" },
        { id: "business_state_pending_finance", name: "待财务审核", description: "等待财务审核预算（金额超过5万需财务审核）", type: "intermediate" },
        { id: "business_state_purchasing", name: "采购中", description: "采购员执行采购", type: "intermediate" },
        { id: "business_state_received", name: "已入库", description: "仓管员确认入库", type: "terminal" },
        { id: "business_state_rejected", name: "已驳回", description: "审批不通过", type: "terminal" },
        { id: "business_state_cancelled", name: "已取消", description: "申请人取消", type: "terminal" }
      ],
      transitions: [
        { id: "transition_submit", name: "提交申请", fromStateId: "business_state_draft", toStateId: "business_state_pending_dept", triggerActionId: "action_submit", allowedRoleIds: ["role_requester"] },
        { id: "transition_dept_approve", name: "部门审批通过", fromStateId: "business_state_pending_dept", toStateId: "business_state_purchasing", triggerActionId: "action_approve", allowedRoleIds: ["role_department_leader"] },
        { id: "transition_dept_approve_to_finance", name: "部门通过转财务", fromStateId: "business_state_pending_dept", toStateId: "business_state_pending_finance", triggerActionId: "action_approve", allowedRoleIds: ["role_department_leader"] },
        { id: "transition_finance_approve", name: "财务审核通过", fromStateId: "business_state_pending_finance", toStateId: "business_state_purchasing", triggerActionId: "action_approve", allowedRoleIds: ["role_finance"] },
        { id: "transition_receive", name: "确认入库", fromStateId: "business_state_purchasing", toStateId: "business_state_received", triggerActionId: "action_receive", allowedRoleIds: ["role_warehouse"] },
        { id: "transition_reject", name: "驳回", fromStateId: "business_state_pending_dept", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_department_leader"] },
        { id: "transition_finance_reject", name: "财务驳回", fromStateId: "business_state_pending_finance", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_finance"] },
        { id: "transition_cancel", name: "取消", fromStateId: "business_state_draft", toStateId: "business_state_cancelled", triggerActionId: "action_withdraw", allowedRoleIds: ["role_requester"] }
      ]
    }
  ],
  pagePatterns: [
    {
      id: "page_procurement_list",
      name: "采购列表页",
      type: "list",
      modules: [
        { id: "module_filter", name: "筛选区", type: "filter", fieldIds: ["field_order_no", "field_requester", "field_department", "field_item_category", "field_status", "field_urgency"] },
        { id: "module_table", name: "采购表格", type: "table", fieldIds: ["field_order_no", "field_requester", "field_item_name", "field_quantity", "field_total_amount", "field_supplier", "field_status", "field_expected_date"] }
      ],
      actionIds: ["action_create", "action_search", "action_reset", "action_export"]
    },
    {
      id: "page_procurement_detail",
      name: "采购详情页",
      type: "detail",
      modules: [
        { id: "module_detail_card", name: "采购详情", type: "detail_card", fieldIds: ["field_order_no", "field_requester", "field_department", "field_item_name", "field_item_category", "field_quantity", "field_unit", "field_unit_price", "field_total_amount", "field_supplier", "field_expected_date", "field_urgency", "field_status", "field_reason", "field_attachment", "field_approver_comment"] },
        { id: "module_timeline", name: "审批记录", type: "log_timeline", fieldIds: ["field_status"] }
      ],
      actionIds: ["action_withdraw"]
    },
    {
      id: "page_procurement_create",
      name: "采购申请页",
      type: "create",
      modules: [
        { id: "module_form", name: "采购表单", type: "form", fieldIds: ["field_item_name", "field_item_category", "field_quantity", "field_unit", "field_supplier", "field_expected_date", "field_urgency", "field_reason", "field_attachment"] }
      ],
      actionIds: ["action_submit"]
    }
  ],
  extraFilters: ["采购单号", "申请人", "部门", "物资类别", "紧急程度", "状态", "期望到货日期范围"],
  extraDetailModules: [],
  approvalRoles: ["role_department_leader", "role_finance"],
  specialRules: [
    "采购金额超过5万需要财务审核",
    "采购金额超过20万需要总经理审批",
    "紧急采购可跳过比价流程",
    "入库后自动更新库存数量"
  ]
};
