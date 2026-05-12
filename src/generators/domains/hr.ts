import type { DomainTemplate } from "./domain-template.js";

export const hrLeaveDomain: DomainTemplate = {
  domainId: "hr_leave",
  displayName: "人力资源（请假/调岗/入职）",
  keywords: ["请假", "调岗", "入职", "离职", "考勤", "加班", "年假", "人事", "HR", "员工管理", "转正"],
  businessObjects: ["请假单", "调岗单", "入职单", "离职单", "加班单"],
  defaultRoles: [
    { id: "role_employee", name: "员工", description: "提交请假、调岗等申请并跟进审批进度" },
    { id: "role_direct_leader", name: "直属主管", description: "审批下属的请假、调岗等申请" },
    { id: "role_hr", name: "HR", description: "审核人事相关申请并维护员工信息" },
    { id: "role_admin", name: "管理员", description: "管理人事规则、查看全部人事数据并导出报表" }
  ],
  defaultFields: [
    { id: "field_request_no", name: "申请编号", fieldKey: "requestNo", type: "text", required: true },
    { id: "field_employee_name", name: "申请人", fieldKey: "employeeName", type: "user", required: true },
    { id: "field_department", name: "部门", fieldKey: "department", type: "text", required: true },
    { id: "field_request_type", name: "申请类型", fieldKey: "requestType", type: "select", required: true },
    { id: "field_start_date", name: "开始日期", fieldKey: "startDate", type: "date", required: true },
    { id: "field_end_date", name: "结束日期", fieldKey: "endDate", type: "date", required: true },
    { id: "field_duration", name: "时长（天）", fieldKey: "duration", type: "number", required: true },
    { id: "field_reason", name: "申请原因", fieldKey: "reason", type: "textarea", required: true },
    { id: "field_status", name: "状态", fieldKey: "status", type: "status", required: true },
    { id: "field_attachment", name: "附件", fieldKey: "attachment", type: "file", required: false },
    { id: "field_approver_comment", name: "审批意见", fieldKey: "approverComment", type: "textarea", required: false }
  ],
  statePatterns: [
    {
      id: "state_pattern_leave",
      name: "请假状态机",
      states: [
        { id: "business_state_draft", name: "草稿", description: "已创建但未提交", type: "initial" },
        { id: "business_state_pending_leader", name: "待主管审批", description: "等待直属主管审批", type: "intermediate" },
        { id: "business_state_pending_hr", name: "待HR审批", description: "等待HR审核（超过3天假期需HR审批）", type: "intermediate" },
        { id: "business_state_approved", name: "已批准", description: "审批通过", type: "terminal" },
        { id: "business_state_rejected", name: "已驳回", description: "审批不通过", type: "terminal" },
        { id: "business_state_cancelled", name: "已撤回", description: "申请人撤回", type: "terminal" }
      ],
      transitions: [
        { id: "transition_submit", name: "提交申请", fromStateId: "business_state_draft", toStateId: "business_state_pending_leader", triggerActionId: "action_submit", allowedRoleIds: ["role_employee"] },
        { id: "transition_leader_approve", name: "主管审批通过", fromStateId: "business_state_pending_leader", toStateId: "business_state_approved", triggerActionId: "action_approve", allowedRoleIds: ["role_direct_leader"] },
        { id: "transition_leader_approve_to_hr", name: "主管通过转HR", fromStateId: "business_state_pending_leader", toStateId: "business_state_pending_hr", triggerActionId: "action_approve", allowedRoleIds: ["role_direct_leader"] },
        { id: "transition_hr_approve", name: "HR审批通过", fromStateId: "business_state_pending_hr", toStateId: "business_state_approved", triggerActionId: "action_approve", allowedRoleIds: ["role_hr"] },
        { id: "transition_reject", name: "驳回", fromStateId: "business_state_pending_leader", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_direct_leader"] },
        { id: "transition_hr_reject", name: "HR驳回", fromStateId: "business_state_pending_hr", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_hr"] },
        { id: "transition_cancel", name: "撤回", fromStateId: "business_state_pending_leader", toStateId: "business_state_cancelled", triggerActionId: "action_withdraw", allowedRoleIds: ["role_employee"] }
      ]
    }
  ],
  pagePatterns: [
    {
      id: "page_leave_list",
      name: "请假列表页",
      type: "list",
      modules: [
        { id: "module_filter", name: "筛选区", type: "filter", fieldIds: ["field_request_no", "field_employee_name", "field_department", "field_request_type", "field_status"] },
        { id: "module_table", name: "请假表格", type: "table", fieldIds: ["field_request_no", "field_employee_name", "field_department", "field_request_type", "field_start_date", "field_end_date", "field_duration", "field_status"] }
      ],
      actionIds: ["action_create", "action_search", "action_reset", "action_export"]
    },
    {
      id: "page_leave_detail",
      name: "请假详情页",
      type: "detail",
      modules: [
        { id: "module_detail_card", name: "请假详情", type: "detail_card", fieldIds: ["field_request_no", "field_employee_name", "field_department", "field_request_type", "field_start_date", "field_end_date", "field_duration", "field_reason", "field_status", "field_attachment", "field_approver_comment"] },
        { id: "module_timeline", name: "审批记录", type: "log_timeline", fieldIds: ["field_status"] }
      ],
      actionIds: ["action_withdraw"]
    },
    {
      id: "page_leave_create",
      name: "请假申请页",
      type: "create",
      modules: [
        { id: "module_form", name: "请假表单", type: "form", fieldIds: ["field_request_type", "field_start_date", "field_end_date", "field_duration", "field_reason", "field_attachment"] }
      ],
      actionIds: ["action_submit"]
    }
  ],
  extraFilters: ["申请编号", "申请人", "部门", "申请类型", "状态", "日期范围"],
  extraDetailModules: [],
  approvalRoles: ["role_direct_leader", "role_hr"],
  specialRules: [
    "请假超过3天需要HR审批",
    "请假天数自动计算（排除周末）",
    "年假余额不足时提示",
    "同一时间段不能重复请假"
  ]
};

export const hrTransferDomain: DomainTemplate = {
  domainId: "hr_transfer",
  displayName: "人力资源（调岗）",
  keywords: ["调岗", "转岗", "调动", "岗位变更"],
  businessObjects: ["调岗单"],
  defaultRoles: [
    { id: "role_employee", name: "员工", description: "发起或确认调岗申请" },
    { id: "role_direct_leader", name: "直属主管", description: "审批调岗申请" },
    { id: "role_target_leader", name: "目标部门主管", description: "确认接收调岗员工" },
    { id: "role_hr", name: "HR", description: "审核调岗流程并更新员工信息" },
    { id: "role_admin", name: "管理员", description: "管理调岗规则和数据" }
  ],
  defaultFields: [
    { id: "field_request_no", name: "申请编号", fieldKey: "requestNo", type: "text", required: true },
    { id: "field_employee_name", name: "申请人", fieldKey: "employeeName", type: "user", required: true },
    { id: "field_current_department", name: "当前部门", fieldKey: "currentDepartment", type: "text", required: true },
    { id: "field_current_position", name: "当前岗位", fieldKey: "currentPosition", type: "text", required: true },
    { id: "field_target_department", name: "目标部门", fieldKey: "targetDepartment", type: "text", required: true },
    { id: "field_target_position", name: "目标岗位", fieldKey: "targetPosition", type: "text", required: true },
    { id: "field_effective_date", name: "生效日期", fieldKey: "effectiveDate", type: "date", required: true },
    { id: "field_reason", name: "调岗原因", fieldKey: "reason", type: "textarea", required: true },
    { id: "field_status", name: "状态", fieldKey: "status", type: "status", required: true },
    { id: "field_attachment", name: "附件", fieldKey: "attachment", type: "file", required: false }
  ],
  statePatterns: [
    {
      id: "state_pattern_transfer",
      name: "调岗状态机",
      states: [
        { id: "business_state_draft", name: "草稿", description: "已创建但未提交", type: "initial" },
        { id: "business_state_pending_leader", name: "待主管审批", description: "等待直属主管审批", type: "intermediate" },
        { id: "business_state_pending_target", name: "待目标部门确认", description: "等待目标部门主管确认接收", type: "intermediate" },
        { id: "business_state_pending_hr", name: "待HR审核", description: "等待HR审核并更新信息", type: "intermediate" },
        { id: "business_state_approved", name: "已批准", description: "调岗完成", type: "terminal" },
        { id: "business_state_rejected", name: "已驳回", description: "调岗不通过", type: "terminal" }
      ],
      transitions: [
        { id: "transition_submit", name: "提交申请", fromStateId: "business_state_draft", toStateId: "business_state_pending_leader", triggerActionId: "action_submit", allowedRoleIds: ["role_employee"] },
        { id: "transition_leader_approve", name: "主管通过", fromStateId: "business_state_pending_leader", toStateId: "business_state_pending_target", triggerActionId: "action_approve", allowedRoleIds: ["role_direct_leader"] },
        { id: "transition_target_confirm", name: "目标部门确认", fromStateId: "business_state_pending_target", toStateId: "business_state_pending_hr", triggerActionId: "action_approve", allowedRoleIds: ["role_target_leader"] },
        { id: "transition_hr_approve", name: "HR审核通过", fromStateId: "business_state_pending_hr", toStateId: "business_state_approved", triggerActionId: "action_approve", allowedRoleIds: ["role_hr"] },
        { id: "transition_reject", name: "驳回", fromStateId: "business_state_pending_leader", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_direct_leader", "role_target_leader", "role_hr"] }
      ]
    }
  ],
  pagePatterns: [
    {
      id: "page_transfer_list",
      name: "调岗列表页",
      type: "list",
      modules: [
        { id: "module_filter", name: "筛选区", type: "filter", fieldIds: ["field_request_no", "field_employee_name", "field_current_department", "field_target_department", "field_status"] },
        { id: "module_table", name: "调岗表格", type: "table", fieldIds: ["field_request_no", "field_employee_name", "field_current_department", "field_current_position", "field_target_department", "field_target_position", "field_effective_date", "field_status"] }
      ],
      actionIds: ["action_create", "action_search", "action_reset", "action_export"]
    }
  ],
  extraFilters: ["申请编号", "申请人", "当前部门", "目标部门", "状态"],
  extraDetailModules: [],
  approvalRoles: ["role_direct_leader", "role_target_leader", "role_hr"],
  specialRules: [
    "调岗需要原部门主管和目标部门主管双重确认",
    "HR审核通过后自动更新员工部门和岗位信息",
    "生效日期不能早于当前日期"
  ]
};
