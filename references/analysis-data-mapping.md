# analysis-data.json 映射规则

本文件定义 biz-analysis 的 analysis-data.json 如何映射到 pm-html-pdt-fused 的 ProjectState。
当用户提供 analysis-data.json 作为原始资料时，按以下规则进行结构化映射。

## 判断：是否走结构化映射路径

在 raw material processing 步骤中，检查 `<project>/raw-materials/` 或用户输入中是否存在 `analysis-data.json`。
如果存在且包含 `business_model` 字段，走结构化映射路径。否则走常规文本处理路径。

## 映射规则

### 1. business_context → requirementCard.background

| analysis-data.json 字段 | → ProjectState 字段 | 映射逻辑 |
|---|---|---|
| `business_context.background` | `requirementCard.background.description` | 直接映射 |
| `business_context.goals` | `requirementCard.background.goals` | 数组直接映射 |
| `business_context.pain_points` | `requirementCard.background.painPoints` | 数组直接映射 |
| `business_context.existing_systems` | `requirementCard.background.existingSystems` | 数组直接映射 |

### 2. business_model.roles → requirementCard.roles

直接映射：角色名、描述、权限列表。

### 3. business_model.entities[].attributes[] → prototypeSpec 字段

每个实体的属性列表映射到对应页面模块的 fields[]：
- `attr.name` → `field.name`
- `attr.frontendType` → `field.fieldType`（如果 frontendType 缺失，按以下规则推断：decimal→money, int→number, varchar→text, date→date, enum→select, boolean→status, text→textarea）
- `attr.validation.required` → `field.required`
- `attr.validation` → `field.validation`（直接映射）

### 4. features[].pageLayout → prototypeSpec.pages[]

pageLayout 定义了页面结构：
- `pageLayout.pageType` → `page.pageType`
- `pageLayout.modules[]` → `page.modules[]`
  - `module.type` → `module.moduleType`（filter→filter, table→table, form→form, tabs→tabs, wizard→steps, actions→actions, summary→summary, chart→chart, empty_state→empty_state）
  - `module.purpose` → `module.description`
  - `module.buttons` → `module.actions[]`

### 5. features[].interactionPatterns → prototypeSpec.pages[].modules[].interactions

interactionPatterns 数组直接映射到页面模块的 interactions 字段。
需要根据模块类型分配：
- filter 类型模块 → 分配 advanced-filter、search-debounce
- table 类型模块 → 分配 hover-actions、empty-state
- form 类型模块 → 分配 conditional-display、cross-field-validation
- 其他模式根据功能特征分配

### 6. state_machines → flowSpec

- `state_machines[].entity` → `flowSpec.stateMachines[].id`
- `state_machines[].states` → `flowSpec.stateMachines[].states[]`
- `state_machines[].transitions[]` → `flowSpec.stateMachines[].transitions[]`
  - `transition.from` → `transition.fromStateId`
  - `transition.to` → `transition.toStateId`
  - `transition.trigger` → `transition.triggerActionId`
  - `transition.conditions` → `transition.guardCondition`
  - `transition.uiAction` → 映射到页面操作按钮

### 7. processes[].uiMapping → 页面导航和操作

- `uiMapping.pageId` → 确定该流程对应的页面
- `uiMapping.stepToModule[]` → 确定流程步骤和模块/字段/操作的对应关系

### 8. features[].acceptance_criteria → PRD 异常场景

Gherkin 格式的验收标准转换为 PRD 中的异常场景：
- Given → 触发条件
- When → 系统行为
- Then → 用户预期结果

### 9. features[].user_story → PRD 功能描述

直接映射到对应功能模块的描述字段。

### 10. business_model.processes[].steps → PRD 操作流程

流程步骤映射到 PRD 中对应功能的操作流程板块。

## 降级策略

如果 analysis-data.json 中某个新增字段缺失（biz 侧还没升级），按以下规则降级：

| 缺失字段 | 降级逻辑 |
|---|---|
| `frontendType` | 根据 attribute.type 推断：decimal→money, int→number, varchar→text, date→date, enum→select |
| `interactionPatterns` | 根据 feature 的 pageType 推断默认交互模式 |
| `validation` | LLM 根据属性描述和业务规则自行推断 |
| `pageLayout` | LLM 根据 feature 列表自行组织页面结构 |
| `uiAction` | LLM 根据状态转换的 trigger 推断按钮文案和类型 |
| `uiMapping` | LLM 根据 process steps 自行映射到页面 |

## 完整映射示例

输入（analysis-data.json 片段）：
```json
{
  "business_model": {
    "entities": [{
      "name": "核减明细",
      "attributes": [
        { "name": "unit_price", "type": "decimal", "frontendType": "money", "validation": { "required": true, "min": 0.01, "rules": ["必须大于0"] } }
      ]
    }]
  },
  "features": [{
    "featureId": "F1.1",
    "feature": "Excel批量导入",
    "priority": "P0",
    "interactionPatterns": ["file-upload", "wizard-steps", "confirm-dialog"],
    "pageLayout": {
      "pageType": "create",
      "modules": [
        { "type": "wizard", "purpose": "导入步骤引导", "steps": ["上传文件", "数据校验", "确认导入"] },
        { "type": "table", "purpose": "异常数据预览" },
        { "type": "actions", "purpose": "操作按钮", "buttons": ["确认导入", "取消"] }
      ]
    }
  }]
}
```

输出（prototypeSpec 片段）：
```json
{
  "pages": [{
    "id": "page_import",
    "name": "数据导入",
    "pageType": "create",
    "modules": [
      { "id": "module_wizard", "name": "导入步骤引导", "moduleType": "steps", "interactions": ["wizard-steps"] },
      { "id": "module_preview", "name": "异常数据预览", "moduleType": "table", "interactions": ["empty-state"], "fields": [...] },
      { "id": "module_actions", "name": "操作按钮", "actions": [
        { "id": "action_confirm_import", "name": "确认导入", "actionType": "submit" },
        { "id": "action_cancel", "name": "取消", "actionType": "view" }
      ]}
    ]
  }]
}
```
