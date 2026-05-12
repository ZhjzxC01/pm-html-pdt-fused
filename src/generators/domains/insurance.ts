import type { DomainTemplate } from "./domain-template.js";

export const insuranceClaimDomain: DomainTemplate = {
  domainId: "insurance_claim",
  displayName: "保险理赔",
  keywords: ["理赔", "保险", "报案", "定损", "核赔", "赔付", "保单", "出险", "查勘", "理算"],
  businessObjects: ["理赔单", "报案单", "保单", "定损单"],
  defaultRoles: [
    { id: "role_claimant", name: "报案人", description: "提交理赔申请并跟进理赔进度" },
    { id: "role_surveyor", name: "查勘员", description: "现场查勘、拍照取证并提交查勘报告" },
    { id: "role_assessor", name: "定损员", description: "评估损失金额并确定赔付方案" },
    { id: "role_underwriter", name: "核赔人", description: "审核理赔材料、定损结果并决定是否赔付" },
    { id: "role_admin", name: "管理员", description: "管理理赔规则、查看全部理赔数据并导出报表" }
  ],
  defaultFields: [
    { id: "field_claim_no", name: "理赔编号", fieldKey: "claimNo", type: "text", required: true },
    { id: "field_policy_no", name: "保单号", fieldKey: "policyNo", type: "text", required: true },
    { id: "field_claimant_name", name: "报案人", fieldKey: "claimantName", type: "text", required: true },
    { id: "field_accident_date", name: "出险日期", fieldKey: "accidentDate", type: "date", required: true },
    { id: "field_accident_type", name: "出险类型", fieldKey: "accidentType", type: "select", required: true },
    { id: "field_claim_amount", name: "索赔金额", fieldKey: "claimAmount", type: "money", required: true },
    { id: "field_assessed_amount", name: "定损金额", fieldKey: "assessedAmount", type: "money", required: false },
    { id: "field_approved_amount", name: "赔付金额", fieldKey: "approvedAmount", type: "money", required: false },
    { id: "field_status", name: "理赔状态", fieldKey: "status", type: "status", required: true },
    { id: "field_description", name: "事故描述", fieldKey: "description", type: "textarea", required: true },
    { id: "field_evidence", name: "理赔材料", fieldKey: "evidence", type: "file", required: true },
    { id: "field_survey_report", name: "查勘报告", fieldKey: "surveyReport", type: "textarea", required: false },
    { id: "field_reject_reason", name: "拒赔原因", fieldKey: "rejectReason", type: "textarea", required: false }
  ],
  statePatterns: [
    {
      id: "state_pattern_claim",
      name: "理赔状态机",
      states: [
        { id: "business_state_reported", name: "已报案", description: "报案人提交理赔申请", type: "initial" },
        { id: "business_state_surveying", name: "查勘中", description: "查勘员进行现场查勘", type: "intermediate" },
        { id: "business_state_assessing", name: "定损中", description: "定损员评估损失金额", type: "intermediate" },
        { id: "business_state_underwriting", name: "核赔中", description: "核赔人审核理赔材料和定损结果", type: "intermediate" },
        { id: "business_state_approved", name: "已赔付", description: "核赔通过并完成赔付", type: "terminal" },
        { id: "business_state_rejected", name: "已拒赔", description: "核赔不通过", type: "terminal" },
        { id: "business_state_closed", name: "已结案", description: "理赔流程结束", type: "terminal" }
      ],
      transitions: [
        { id: "transition_submit_claim", name: "提交报案", fromStateId: "business_state_reported", toStateId: "business_state_surveying", triggerActionId: "action_submit", allowedRoleIds: ["role_claimant"] },
        { id: "transition_complete_survey", name: "完成查勘", fromStateId: "business_state_surveying", toStateId: "business_state_assessing", triggerActionId: "action_complete_survey", allowedRoleIds: ["role_surveyor"] },
        { id: "transition_complete_assessment", name: "完成定损", fromStateId: "business_state_assessing", toStateId: "business_state_underwriting", triggerActionId: "action_complete_assessment", allowedRoleIds: ["role_assessor"] },
        { id: "transition_approve", name: "核赔通过", fromStateId: "business_state_underwriting", toStateId: "business_state_approved", triggerActionId: "action_approve", allowedRoleIds: ["role_underwriter"] },
        { id: "transition_reject", name: "拒赔", fromStateId: "business_state_underwriting", toStateId: "business_state_rejected", triggerActionId: "action_reject", allowedRoleIds: ["role_underwriter"] },
        { id: "transition_close", name: "结案", fromStateId: "business_state_approved", toStateId: "business_state_closed", triggerActionId: "action_close", allowedRoleIds: ["role_admin"] }
      ]
    }
  ],
  pagePatterns: [
    {
      id: "page_claim_list",
      name: "理赔列表页",
      type: "list",
      modules: [
        { id: "module_filter", name: "筛选区", type: "filter", fieldIds: ["field_claim_no", "field_policy_no", "field_claimant_name", "field_status", "field_accident_type"] },
        { id: "module_table", name: "理赔表格", type: "table", fieldIds: ["field_claim_no", "field_policy_no", "field_claimant_name", "field_claim_amount", "field_status", "field_accident_date"] }
      ],
      actionIds: ["action_create", "action_search", "action_reset", "action_export"]
    },
    {
      id: "page_claim_detail",
      name: "理赔详情页",
      type: "detail",
      modules: [
        { id: "module_detail_card", name: "理赔详情", type: "detail_card", fieldIds: ["field_claim_no", "field_policy_no", "field_claimant_name", "field_accident_date", "field_accident_type", "field_claim_amount", "field_assessed_amount", "field_approved_amount", "field_status", "field_description", "field_evidence", "field_survey_report", "field_reject_reason"] },
        { id: "module_timeline", name: "理赔记录", type: "log_timeline", fieldIds: ["field_status"] }
      ],
      actionIds: ["action_withdraw"]
    },
    {
      id: "page_claim_create",
      name: "报案页",
      type: "create",
      modules: [
        { id: "module_form", name: "报案表单", type: "form", fieldIds: ["field_policy_no", "field_claimant_name", "field_accident_date", "field_accident_type", "field_claim_amount", "field_description", "field_evidence"] }
      ],
      actionIds: ["action_submit"]
    }
  ],
  extraFilters: ["理赔编号", "保单号", "报案人", "出险类型", "理赔状态", "出险日期范围"],
  extraDetailModules: [
    { id: "module_survey_panel", name: "查勘面板", type: "approval_panel", fieldIds: ["field_survey_report", "field_evidence"] },
    { id: "module_assessment_panel", name: "定损面板", type: "approval_panel", fieldIds: ["field_assessed_amount", "field_description"] }
  ],
  approvalRoles: ["role_surveyor", "role_assessor", "role_underwriter"],
  specialRules: [
    "查勘员完成现场查勘后才能进入定损环节",
    "定损金额不得超过索赔金额",
    "核赔通过后自动生成赔付单",
    "拒赔必须填写拒赔原因"
  ]
};
