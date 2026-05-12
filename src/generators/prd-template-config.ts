import type { RequirementLevel } from "../types/index.js";

export interface PrdSectionTemplate {
  type: string;
  title: string;
  sortOrder: number;
  required: boolean;
}

const S_SECTIONS: PrdSectionTemplate[] = [
  { type: "info", title: "基本信息", sortOrder: 0, required: true },
  { type: "background", title: "需求背景", sortOrder: 1, required: true },
  { type: "change_scope", title: "改动范围", sortOrder: 2, required: true },
  { type: "module", title: "具体需求说明", sortOrder: 3, required: true },
  { type: "field", title: "字段 / 枚举 / 文案说明", sortOrder: 4, required: false },
  { type: "acceptance", title: "验收标准", sortOrder: 5, required: true },
  { type: "deployment", title: "上线配置与依赖", sortOrder: 6, required: true },
  { type: "appendix", title: "风险与备注", sortOrder: 7, required: false },
  { type: "review", title: "评审确认", sortOrder: 8, required: false }
];

const M_SECTIONS: PrdSectionTemplate[] = [
  { type: "info", title: "文档信息", sortOrder: 0, required: true },
  { type: "background", title: "需求背景与目标", sortOrder: 1, required: true },
  { type: "role", title: "用户角色与使用场景", sortOrder: 2, required: true },
  { type: "scope", title: "需求范围与关联影响分析", sortOrder: 3, required: true },
  { type: "flow", title: "业务流程", sortOrder: 4, required: true },
  { type: "page", title: "页面与交互说明", sortOrder: 5, required: true },
  { type: "permission", title: "权限说明", sortOrder: 6, required: true },
  { type: "field", title: "字段说明与校验规则", sortOrder: 7, required: true },
  { type: "business_state", title: "业务规则", sortOrder: 8, required: false },
  { type: "state_transition", title: "状态流转", sortOrder: 9, required: false },
  { type: "data_processing", title: "数据处理说明", sortOrder: 10, required: false },
  { type: "interface_integration", title: "接口与外部系统", sortOrder: 11, required: false },
  { type: "notification", title: "消息通知与待办", sortOrder: 12, required: false },
  { type: "acceptance", title: "验收标准", sortOrder: 13, required: true },
  { type: "deployment", title: "上线配置与依赖", sortOrder: 14, required: true },
  { type: "appendix", title: "风险与待确认事项", sortOrder: 15, required: false },
  { type: "review", title: "评审记录", sortOrder: 16, required: false }
];

const L_SECTIONS: PrdSectionTemplate[] = [
  { type: "info", title: "文档信息", sortOrder: 0, required: true },
  { type: "background", title: "项目背景与业务目标", sortOrder: 1, required: true },
  { type: "current_state", title: "业务现状分析", sortOrder: 2, required: true },
  { type: "overall_design", title: "总体方案设计", sortOrder: 3, required: true },
  { type: "role", title: "用户角色与权限体系", sortOrder: 4, required: true },
  { type: "scope", title: "功能清单", sortOrder: 5, required: true },
  { type: "module", title: "详细功能说明", sortOrder: 6, required: true },
  { type: "page", title: "页面与原型", sortOrder: 7, required: true },
  { type: "field", title: "字段、校验与业务规则", sortOrder: 8, required: true },
  { type: "data_model", title: "数据模型与业务实体", sortOrder: 9, required: true },
  { type: "state_transition", title: "状态机与审批流", sortOrder: 10, required: true },
  { type: "interface_integration", title: "接口与系统集成", sortOrder: 11, required: true },
  { type: "data_processing", title: "导入、导出、打印与附件", sortOrder: 12, required: false },
  { type: "appendix", title: "报表、统计与数据口径", sortOrder: 13, required: false },
  { type: "notification", title: "消息、待办与通知", sortOrder: 14, required: false },
  { type: "non_functional", title: "非功能需求", sortOrder: 15, required: true },
  { type: "emergency", title: "故障应急与可用性方案", sortOrder: 16, required: true },
  { type: "deployment", title: "上线方案", sortOrder: 17, required: true },
  { type: "acceptance", title: "测试与验收", sortOrder: 18, required: true },
  { type: "appendix", title: "风险、问题与决策记录", sortOrder: 19, required: false },
  { type: "appendix", title: "附录", sortOrder: 20, required: false }
];

const SECTION_MAP: Record<RequirementLevel, PrdSectionTemplate[]> = {
  S: S_SECTIONS,
  M: M_SECTIONS,
  L: L_SECTIONS
};

export function getSectionsForLevel(level: RequirementLevel): PrdSectionTemplate[] {
  return SECTION_MAP[level];
}

export function getRequiredSectionTypes(level: RequirementLevel): string[] {
  return SECTION_MAP[level].filter((s) => s.required).map((s) => s.type);
}

export function getLevelDescription(level: RequirementLevel): string {
  switch (level) {
    case "S":
      return "S 级轻量需求卡：适用于小改动、小优化、小缺陷修复。核心目标是快速说明改什么、怎么验收、上线有没有配置依赖。";
    case "M":
      return "M 级功能版 PRD：适用于中等复杂度功能、模块迭代、业务流程局部调整。核心目标是讲清楚功能逻辑、关联影响、校验层级、权限边界。";
    case "L":
      return "L 级完整版 B 端 PRD：适用于大型项目、跨系统项目、核心业务流程重构。核心目标是从业务、系统、数据、权限、流程、风险、上线全链路讲清楚。";
  }
}
