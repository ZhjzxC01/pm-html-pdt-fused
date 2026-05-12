import type { ReviewGateConfig, ReviewRoleConfig } from "./review-types.js";

export const REVIEW_ROLES: ReviewRoleConfig[] = [
  {
    roleId: "business-analyst",
    agentName: "business-analyst-reviewer",
    roleName: "业务分析师",
    systemPromptName: "system",
    description: "审查业务流程闭环、角色覆盖、审批逻辑和需求追溯"
  },
  {
    roleId: "ux-designer",
    agentName: "ux-designer-reviewer",
    roleName: "UX 设计师",
    systemPromptName: "system",
    description: "审查信息架构、页面结构、导航流和操作路径"
  },
  {
    roleId: "ui-designer",
    agentName: "ui-designer-reviewer",
    roleName: "UI 设计师",
    systemPromptName: "system",
    description: "审查组件选型、视觉层级、状态色彩和设计系统一致性"
  },
  {
    roleId: "tech-architect",
    agentName: "tech-architect-reviewer",
    roleName: "技术架构师",
    systemPromptName: "system",
    description: "审查状态机完备性、权限模型、数据模型和扩展性"
  },
  {
    roleId: "frontend-developer",
    agentName: "frontend-developer-reviewer",
    roleName: "前端开发",
    systemPromptName: "system",
    description: "审查 HTML 语义化、无障碍性、响应式设计和组件实现质量"
  },
  {
    roleId: "qa-engineer",
    agentName: "qa-engineer-reviewer",
    roleName: "QA 工程师",
    systemPromptName: "system",
    description: "审查测试覆盖、边界值、异常流和权限测试"
  }
];

export const REVIEW_GATES: ReviewGateConfig[] = [
  {
    gate: "gate_1_input",
    name: "原始输入审查",
    description: "对用户原始需求进行业务和体验层面审查",
    roleIds: ["business-analyst", "ux-designer"]
  },
  {
    gate: "gate_2_requirements",
    name: "需求结构审查",
    description: "对结构化需求和复杂度评估进行完整性和质量审查",
    roleIds: ["business-analyst", "qa-engineer"]
  },
  {
    gate: "gate_3_prototype",
    name: "原型结构审查",
    description: "对原型规格、流程规格进行交互、视觉和架构审查",
    roleIds: ["ux-designer", "ui-designer", "tech-architect"]
  },
  {
    gate: "gate_4_html_testcase",
    name: "HTML 和测试用例审查",
    description: "对 HTML 原型质量和测试用例覆盖进行审查",
    roleIds: ["ui-designer", "frontend-developer", "qa-engineer"]
  },
  {
    gate: "gate_5_prd",
    name: "PRD 审查",
    description: "对 PRD 追溯完整性和技术约束进行审查",
    roleIds: ["business-analyst", "tech-architect"]
  }
];

export function getReviewRole(roleId: string): ReviewRoleConfig | undefined {
  return REVIEW_ROLES.find((r) => r.roleId === roleId);
}

export function getReviewGate(gate: string): ReviewGateConfig | undefined {
  return REVIEW_GATES.find((g) => g.gate === gate);
}

export function getRolesForGate(gate: string): ReviewRoleConfig[] {
  const gateConfig = getReviewGate(gate);
  if (!gateConfig) return [];
  return gateConfig.roleIds.map((id) => getReviewRole(id)).filter((r): r is ReviewRoleConfig => r !== undefined);
}
