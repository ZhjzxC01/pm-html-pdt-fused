# Biz-PM 协同质量提升实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 biz-analysis 的结构化分析数据被 pm-html-pdt-fused 完整消费，产出全交互原型和全功能深度覆盖的 PRD。

**Architecture:** 三端改动——(1) biz-analysis 输出 schema 扩展 4 组设计级字段；(2) pm 消费层通过新增映射文档和提示词修改，将 analysis-data.json 的数据映射到 ProjectState；(3) 原型和 PRD 的生成提示词增加强制质量规则和自检清单。所有变更都是 Markdown 提示词/文档层面，不涉及 TypeScript 代码改动。

**Tech Stack:** Markdown 提示词文件、JSON Schema 定义、biz-analysis validate_schema.js

---

## Phase 1：biz-analysis 输出 schema 扩展

### Task 1: 修改 output-schema.md 增加设计级字段定义

**Files:**
- Modify: `/Users/skill/biz-analysis/biz-analysis/references/output-schema.md`

- [ ] **Step 1: 在 entity 属性中新增 frontendType 和 validation**

在 `business_model.entities[].` 的 schema 定义中，将 `key_attributes` 从简单字符串数组改为对象数组。

找到当前 entity schema（约第 40-46 行）：
```json
"entities": [
  {
    "name": "string",
    "description": "string",
    "key_attributes": ["string"],
    "confidence": "high|medium|low"
  }
]
```

替换为：
```json
"entities": [
  {
    "name": "string",
    "description": "string",
    "key_attributes": ["string"],
    "attributes": [
      {
        "name": "string",
        "type": "string (业务类型: int, decimal, varchar, date, enum, boolean, text)",
        "description": "string",
        "confidence": "high|medium|low",
        "frontendType": "text|number|money|date|datetime|select|multi_select|textarea|file|user|department|status (可选，pm 消费的前端字段类型)",
        "validation": {
          "required": "boolean",
          "min": "number|null (数值最小值或字符串最小长度)",
          "max": "number|null (数值最大值或字符串最大长度)",
          "pattern": "string|null (正则校验模式)",
          "enum": "string[]|null (可选值列表，用于 select 类型)",
          "rules": "string[] (业务校验规则描述)"
        }
      }
    ],
    "confidence": "high|medium|low"
  }
]
```

- [ ] **Step 2: 在 features 中新增 interactionPatterns 和 pageLayout**

找到当前 features schema（约第 86-96 行），在 `dependencies` 之后追加两个字段。

将 features 定义替换为：
```json
"features": [
  {
    "module": "string",
    "feature": "string",
    "role": "string",
    "priority": "P0|P1|P2",
    "user_story": "string",
    "acceptance_criteria": ["string (Gherkin BDD 格式: Given-When-Then)"],
    "dependencies": ["string"],
    "interactionPatterns": ["string (引用 b2b-interaction-patterns.md 中的模式 ID，可选)"],
    "pageLayout": {
      "pageType": "list|detail|create|edit|approval|config|dashboard|log",
      "modules": [
        {
          "type": "filter|table|form|tabs|wizard|actions|summary|chart|empty_state",
          "purpose": "string (模块用途描述)",
          "steps": "string[] (仅 wizard 类型需要)",
          "buttons": "string[] (仅 actions 类型需要)"
        }
      ]
    }
  }
]
```

- [ ] **Step 3: 在 state_machines transitions 中新增 uiAction**

找到当前 state_machines transitions schema（约第 61-65 行），在 `conditions` 之后追加 `uiAction`。

将 transitions 定义替换为：
```json
"transitions": [
  {
    "from": "string",
    "to": "string",
    "trigger": "string",
    "conditions": "string",
    "uiAction": {
      "buttonLabel": "string (按钮文案)",
      "buttonType": "primary|secondary|danger|ghost",
      "precondition": "string (按钮可用的前置条件描述)",
      "confirmMessage": "string|null (确认弹窗文案，null 表示无需确认)"
    }
  }
]
```

- [ ] **Step 4: 在 processes 中新增 uiMapping**

找到当前 processes schema（约第 70-76 行），在 `actors` 之后追加 `uiMapping`。

将 processes 定义替换为：
```json
"processes": [
  {
    "name": "string",
    "type": "main|branch|exception|approval",
    "steps": ["string"],
    "actors": ["string"],
    "uiMapping": {
      "pageId": "string (该流程对应的页面 ID)",
      "stepToModule": [
        {
          "step": "string (流程步骤描述)",
          "moduleId": "string (对应模块 ID)",
          "fieldId": "string|null (对应字段 ID)",
          "actionId": "string|null (对应操作 ID)"
        }
      ]
    }
  }
]
```

- [ ] **Step 5: 在交接协议表中补充新字段映射**

找到"### 交接内容映射"表格（约第 266 行），在现有 7 行映射之后追加 4 行：

```markdown
| entity.attributes (含 frontendType/validation) | 生成 prototypeSpec 字段定义和校验规则 |
| features.interactionPatterns | 生成 prototypeSpec 模块交互声明 |
| features.pageLayout | 生成 prototypeSpec 页面模块结构 |
| state_machines.transitions.uiAction | 生成 flowSpec 转换操作和页面按钮 |
```

- [ ] **Step 6: Commit**

```bash
cd /Users/skill/biz-analysis
git add biz-analysis/references/output-schema.md
git commit -m "feat(biz-analysis): expand output schema with design-level fields

Add frontendType/validation to entity attributes, interactionPatterns/pageLayout
to features, uiAction to state machine transitions, and uiMapping to processes.
These fields enable pm-html-pdt-fused to directly consume structured business
analysis data for prototype and PRD generation."
```

---

### Task 2: 修改 biz-analysis SKILL.md Phase 6 生成要求

**Files:**
- Modify: `/Users/skill/biz-analysis/biz-analysis/SKILL.md`

- [ ] **Step 1: 在 Phase 6 生成步骤中追加设计级字段要求**

打开 SKILL.md，找到 Phase 6（生成分析报告）的说明部分。在 Phase 6 的生成要求中追加以下规则：

```markdown
### 设计级字段生成要求（Phase 6 新增）

生成 analysis-data.json 时，以下字段**必须填写**，不能省略：

1. **entity.attributes**：每个核心实体必须有完整的属性列表（不能只有 key_attributes），每个属性包含：
   - `name`、`type`（业务数据类型）、`description`、`confidence`
   - `frontendType`：根据业务类型推断前端控件类型
   - `validation`：根据业务规则推断校验规则（required、min/max、enum 等）

   **frontendType 推断规则**：
   - 金额类（amount, price, cost, fee, money）→ `money`
   - 数量类（count, quantity, number, num）→ `number`
   - 日期（date）→ `date`，日期时间（datetime, timestamp）→ `datetime`
   - 状态/枚举（status, type, category, level, priority）→ `select`
   - 多选标签（tags, labels）→ `multi_select`
   - 长文本（description, remark, reason, comment, note）→ `textarea`
   - 文件（file, attachment, image）→ `file`
   - 人员（user, operator, creator, approver）→ `user`
   - 部门（department, org, team）→ `department`
   - 其他 → `text`

2. **features.interactionPatterns**：根据页面类型和功能特征推断交互模式
   - 列表页（list）→ 至少 `["advanced-filter", "hover-actions", "empty-state"]`
   - 详情页（detail）→ 至少 `["breadcrumb", "confirm-dialog"]`
   - 新建/编辑页（create/edit）→ 至少 `["conditional-display", "cross-field-validation", "toast-feedback"]`
   - 审批页（approval）→ 至少 `["confirm-dialog", "toast-feedback"]`
   - 有搜索框时 → 加 `"search-debounce"`
   - 有级联关系时 → 加 `"cascade-select"`
   - 有行内编辑时 → 加 `"inline-edit"`

3. **features.pageLayout**：根据功能描述推断页面模块组成，每个 feature 至少描述 pageType 和 2-3 个核心模块。

4. **state_machines.transitions.uiAction**：每个状态转换必须定义对应的界面操作，包括按钮文案、类型、前置条件和确认弹窗。

5. **processes.uiMapping**：每个主流程必须映射到对应的页面和模块。
```

- [ ] **Step 2: Commit**

```bash
cd /Users/skill/biz-analysis
git add biz-analysis/SKILL.md
git commit -m "feat(biz-analysis): add design-level field generation rules to Phase 6

Add requirements for frontendType, interactionPatterns, pageLayout, uiAction,
and uiMapping fields with inference rules and minimum requirements."
```

---

### Task 3: 更新 biz-analysis validate_schema.js 支持新字段

**Files:**
- Modify: `/Users/skill/biz-analysis/biz-analysis/scripts/validate_schema.js`

- [ ] **Step 1: 读取当前 validate_schema.js 了解结构**

```bash
head -100 /Users/skill/biz-analysis/biz-analysis/scripts/validate_schema.js
```

- [ ] **Step 2: 新增 entity.attributes 校验逻辑**

在 entity 校验部分，追加对 `attributes` 数组的校验。找到校验 entity 的位置（遍历 `business_model.entities` 的循环），追加：

```javascript
// entity.attributes 校验（新增设计级字段）
if (entity.attributes && Array.isArray(entity.attributes)) {
  entity.attributes.forEach((attr, ai) => {
    if (!attr.name) {
      errors.push(`business_model.entities[${ei}].attributes[${ai}].name 缺失`);
    }
    if (!attr.type) {
      errors.push(`business_model.entities[${ei}].attributes[${ai}].type 缺失`);
    }
    const validFrontendTypes = ['text', 'number', 'money', 'date', 'datetime', 'select', 'multi_select', 'textarea', 'file', 'user', 'department', 'status'];
    if (attr.frontendType && !validFrontendTypes.includes(attr.frontendType)) {
      errors.push(`business_model.entities[${ei}].attributes[${ai}].frontendType 非法值: ${attr.frontendType}，合法值: ${validFrontendTypes.join(', ')}`);
    }
    if (attr.validation) {
      if (typeof attr.validation.required !== 'boolean') {
        warnings.push(`business_model.entities[${ei}].attributes[${ai}].validation.required 应为 boolean`);
      }
      if (attr.validation.enum && !Array.isArray(attr.validation.enum)) {
        errors.push(`business_model.entities[${ei}].attributes[${ai}].validation.enum 应为数组`);
      }
    }
  });
}
```

- [ ] **Step 3: 新增 features 新字段校验**

在 features 校验部分，追加对 `interactionPatterns` 和 `pageLayout` 的校验：

```javascript
// features.interactionPatterns 校验
if (feature.interactionPatterns) {
  if (!Array.isArray(feature.interactionPatterns)) {
    errors.push(`features[${fi}].interactionPatterns 应为数组`);
  }
}

// features.pageLayout 校验
if (feature.pageLayout) {
  const validPageTypes = ['list', 'detail', 'create', 'edit', 'approval', 'config', 'dashboard', 'log'];
  if (!validPageTypes.includes(feature.pageLayout.pageType)) {
    errors.push(`features[${fi}].pageLayout.pageType 非法值: ${feature.pageLayout.pageType}`);
  }
  if (!feature.pageLayout.modules || !Array.isArray(feature.pageLayout.modules) || feature.pageLayout.modules.length === 0) {
    errors.push(`features[${fi}].pageLayout.modules 应为非空数组`);
  }
}
```

- [ ] **Step 4: 新增 transitions.uiAction 校验**

在 state_machines 校验部分，追加对 `uiAction` 的校验：

```javascript
// transitions.uiAction 校验
if (transition.uiAction) {
  if (!transition.uiAction.buttonLabel) {
    warnings.push(`state_machines[${si}].transitions[${ti}].uiAction.buttonLabel 缺失`);
  }
  const validButtonTypes = ['primary', 'secondary', 'danger', 'ghost'];
  if (transition.uiAction.buttonType && !validButtonTypes.includes(transition.uiAction.buttonType)) {
    errors.push(`state_machines[${si}].transitions[${ti}].uiAction.buttonType 非法值: ${transition.uiAction.buttonType}`);
  }
}
```

- [ ] **Step 5: 新增 processes.uiMapping 校验**

在 processes 校验部分，追加对 `uiMapping` 的校验：

```javascript
// processes.uiMapping 校验
if (process.uiMapping) {
  if (!process.uiMapping.pageId) {
    warnings.push(`processes[${pi}].uiMapping.pageId 缺失`);
  }
  if (!process.uiMapping.stepToModule || !Array.isArray(process.uiMapping.stepToModule)) {
    warnings.push(`processes[${pi}].uiMapping.stepToModule 应为数组`);
  }
}
```

- [ ] **Step 6: 测试校验脚本**

```bash
cd /Users/skill/biz-analysis
node scripts/validate_schema.js /Users/个人项目/测试项目1/workload-deduction/analysis-data.json
```

预期：由于测试项目的 analysis-data.json 还没有新字段，应该仍然通过（新字段为可选）。

- [ ] **Step 7: Commit**

```bash
cd /Users/skill/biz-analysis
git add biz-analysis/scripts/validate_schema.js
git commit -m "feat(biz-analysis): add validation for design-level fields

Add validation rules for entity.attributes (frontendType, validation),
features (interactionPatterns, pageLayout), transitions.uiAction, and
processes.uiMapping. All new fields are optional — existing data still passes."
```

---

## Phase 2：pm 消费层

### Task 4: 创建 analysis-data-mapping.md 映射规则文档

**Files:**
- Create: `/Users/skill/pm-html-pdt-fused/references/analysis-data-mapping.md`

- [ ] **Step 1: 创建映射规则文档**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add references/analysis-data-mapping.md
git commit -m "feat(pm): add analysis-data.json → ProjectState mapping rules

New reference document defining how biz-analysis structured output maps to
ProjectState fields (requirementCard, prototypeSpec, flowSpec, prdSpec).
Includes degradation strategy for missing fields."
```

---

### Task 5: 修改 SKILL.md 增加结构化映射路径

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/SKILL.md`

- [ ] **Step 1: 在阶段规则表中追加 analysis-data-mapping 条目**

找到"## 阶段规则（按需读取）"表格（约第 96 行），在现有行之后追加一行：

```markdown
| 原始资料映射 | `references/analysis-data-mapping.md` | 输入包含 biz-analysis 的 analysis-data.json 时，需要理解结构化映射规则时 |
```

- [ ] **Step 2: 在默认行为规则 9 中追加 analysis-data.json 判断逻辑**

找到默认行为规则 9（约第 27 行，关于原始资料处理的规则）。在该规则末尾追加：

```markdown
如果 `raw-materials/` 中包含 `analysis-data.json`（来自 biz-analysis 产出），自动识别并走结构化映射路径：读取 `references/analysis-data-mapping.md`，按照映射规则将 analysis-data.json 中的结构化数据直接映射到 ProjectState 的 requirementCard、prototypeSpec、flowSpec 和 prdSpec 字段，而不是作为普通文本提取信息。映射完成后向用户展示映射摘要（实体→字段数量、状态机→转换数量、功能→页面数量），等待用户确认。
```

- [ ] **Step 3: 在 Anti-Pattern 自查清单中追加映射检查项**

找到"## Anti-Pattern 自查清单"（约第 162 行），在最后一行之后追加：

```markdown
- [ ] **充分利用 biz 分析数据**：如果输入包含 analysis-data.json，是否通过结构化映射路径消费了其中的实体属性、交互模式、状态机和业务规则？（不能忽略结构化数据只当文本处理）
```

- [ ] **Step 4: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add SKILL.md
git commit -m "feat(pm): add structured mapping path for analysis-data.json

When analysis-data.json is provided as raw material, use structured mapping
from analysis-data-mapping.md instead of text extraction. Add reference to
stage rules table and anti-pattern checklist."
```

---

### Task 6: 修改 prototype-spec-generator.md 引用 analysis-data.json

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/prompts/prototype-spec-generator.md`

- [ ] **Step 1: 在提示词中追加 analysis-data.json 消费指引**

在文件末尾追加以下章节：

```markdown
## analysis-data.json 消费指引

当输入中包含 biz-analysis 的 analysis-data.json 数据时，按以下规则直接消费：

### 页面来源
- `features[].pageLayout` 定义了每个功能对应的页面结构。每个 feature 的 pageLayout 就是一个页面。
- `pageLayout.pageType` → `page.pageType`
- `pageLayout.modules[]` → `page.modules[]`，每个 module 的 type 映射为 moduleType

### 字段来源
- `business_model.entities[].attributes[]` 定义了实体的完整字段列表。
- 将实体属性映射到使用该实体的页面模块中：
  - `attr.frontendType` → `field.fieldType`
  - `attr.validation.required` → `field.required`
  - `attr.name` → `field.name`（英文名）
  - `attr.description` → `field.name`（中文名，如果 description 比 name 更适合做显示名）
- 如果 `frontendType` 缺失，按 attribute.type 推断：decimal→money, int→number, varchar→text, date→date, enum→select

### 交互模式来源
- `features[].interactionPatterns` 直接映射到页面模块的 `interactions` 字段。
- 按模块类型分配交互模式：
  - filter 模块 → advanced-filter, search-debounce
  - table 模块 → hover-actions, empty-state（如有行内编辑加 inline-edit）
  - form 模块 → conditional-display, cross-field-validation（如有级联加 cascade-select）
- 如果 `interactionPatterns` 缺失，根据 pageType 推断默认交互

### 操作来源
- `state_machines[].transitions[].uiAction` 定义了状态转换对应的界面操作。
- 将 uiAction 映射到页面模块的 actions：
  - `uiAction.buttonLabel` → `action.name`
  - `uiAction.buttonType` → 辅助判断 action 的视觉层级
  - `uiAction.precondition` → `action.precondition`

### 禁止忽略结构化数据
如果 analysis-data.json 包含完整的设计级字段（frontendType、interactionPatterns、pageLayout、uiAction），**必须**使用这些结构化数据，不能忽略后让 LLM 自行推断。
```

- [ ] **Step 2: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add prompts/prototype-spec-generator.md
git commit -m "feat(pm): add analysis-data.json consumption guide to prototype-spec-generator

Direct LLM to consume frontendType, interactionPatterns, pageLayout, and
uiAction from analysis-data.json when available."
```

---

### Task 7: 修改 prd-generator.md 引用 analysis-data.json

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/prompts/prd-generator.md`

- [ ] **Step 1: 在提示词中追加 analysis-data.json 消费指引**

在文件末尾追加以下章节：

```markdown
## analysis-data.json 消费指引

当输入中包含 biz-analysis 的 analysis-data.json 数据时，按以下规则直接消费：

### 功能描述来源
- `features[].user_story` → 对应功能模块的描述字段
- `features[].acceptance_criteria` → 转换为异常场景板块（Given=触发条件, When=系统行为, Then=预期结果）

### 字段级业务规则来源
- `business_model.entities[].attributes[].validation` → 字段级业务规则板块
  - `validation.required` → 是否必填
  - `validation.min/max` → 数值范围或长度限制
  - `validation.pattern` → 格式校验
  - `validation.enum` → 可选值列表
  - `validation.rules` → 业务校验规则描述

### 操作流程来源
- `business_model.processes[].steps` → 对应功能的操作流程板块
- `business_model.processes[].uiMapping.stepToModule` → 确定每个步骤对应的模块和操作

### 状态流转来源
- `state_machines[].transitions[]` → 状态流转章节
  - `transition.conditions` → 前置条件
  - `transition.uiAction.confirmMessage` → 操作确认提示
  - `transition.uiAction.precondition` → 按钮可用条件

### 风险来源
- `risks[]` → PRD 尾部的风险与应对章节

### 禁止忽略结构化数据
如果 analysis-data.json 包含完整的业务规则、验收标准和流程定义，**必须**使用这些数据展开每个功能的详细规格，不能忽略后只写一行标题。
```

- [ ] **Step 2: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add prompts/prd-generator.md
git commit -m "feat(pm): add analysis-data.json consumption guide to prd-generator

Direct LLM to consume user_story, acceptance_criteria, validation, processes,
state_machines, and risks from analysis-data.json for deep PRD generation."
```

---

## Phase 3：原型交互质量

### Task 8: 在 b2b-interaction-patterns.md 补充 JS 实现指引

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/references/b2b-interaction-patterns.md`

- [ ] **Step 1: 在文件末尾追加 JS 实现参考章节**

在文件末尾（交互模式选择规则之后）追加：

```markdown
## JS 实现参考

以下是每种交互模式在 HTML 原型中的 JavaScript 实现要求。生成原型时，必须为每个声明了交互模式的模块实现对应的 JS 逻辑。

### 行内编辑 (inline-edit)

```javascript
// 双击 td 进入编辑态，blur 保存，Esc 取消
document.querySelectorAll('[data-interaction="inline-edit"]').forEach(function(cell) {
  cell.addEventListener('dblclick', function() {
    var original = cell.textContent;
    cell.innerHTML = '<input type="text" value="' + original + '" class="inline-input">';
    var input = cell.querySelector('input');
    input.focus();
    input.addEventListener('blur', function() { cell.textContent = input.value || original; });
    input.addEventListener('keydown', function(e) { if (e.key === 'Escape') cell.textContent = original; });
  });
});
```

### 快捷操作 (hover-actions)

```css
.row-actions { opacity: 0; transition: opacity 0.15s; }
.data-table tbody tr:hover .row-actions { opacity: 1; }
.data-table tbody tr:hover { background: var(--color-surface-container-low, #f9fafb); }
.row-actions button { height: 28px; padding: 0 8px; font-size: 12px; }
```

### 二次确认 (confirm-dialog)

```javascript
function showConfirm(title, message, onConfirm, isDanger) {
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = '<div class="confirm-box"><h3>' + title + '</h3><p>' + message + '</p>'
    + '<div class="confirm-actions"><button class="btn-cancel">取消</button>'
    + '<button class="btn-confirm ' + (isDanger ? 'btn-danger' : '') + '">确认</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.btn-cancel').onclick = function() { overlay.remove(); };
  overlay.querySelector('.btn-confirm').onclick = function() { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}
```

### 级联选择 (cascade-select)

```javascript
// 父级 change 时清空子级并加载新选项
document.getElementById('parentSelect').addEventListener('change', function() {
  var child = document.getElementById('childSelect');
  child.innerHTML = '<option value="">请选择</option>';
  var options = CASCADE_DATA[this.value] || [];
  options.forEach(function(opt) { child.innerHTML += '<option value="' + opt + '">' + opt + '</option>'; });
});
```

### 条件显隐 (conditional-display)

```javascript
document.querySelectorAll('[data-condition-trigger]').forEach(function(trigger) {
  trigger.addEventListener('change', function() {
    var target = document.getElementById(trigger.dataset.conditionTarget);
    var showValues = trigger.dataset.conditionShow.split(',');
    target.style.display = showValues.includes(trigger.value) ? '' : 'none';
  });
});
```

### 联动校验 (cross-field-validation)

```javascript
// 结束日期不能早于开始日期
document.getElementById('endDate').addEventListener('blur', function() {
  var start = document.getElementById('startDate').value;
  var end = this.value;
  var errEl = document.getElementById('endDateError');
  if (start && end && end < start) {
    errEl.textContent = '结束日期不能早于开始日期';
    errEl.style.display = '';
  } else {
    errEl.style.display = 'none';
  }
});
```

### 搜索防抖 (search-debounce)

```javascript
var debounceTimer;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  var keyword = this.value.toLowerCase();
  debounceTimer = setTimeout(function() {
    var rows = document.querySelectorAll('.data-table tbody tr');
    var visible = 0;
    rows.forEach(function(row) {
      var show = !keyword || row.textContent.toLowerCase().includes(keyword);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('emptyState');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  }, 300);
});
```

### 高级筛选 (advanced-filter)

```javascript
function applyFilters() {
  var filters = {};
  document.querySelectorAll('[data-filter]').forEach(function(el) {
    filters[el.dataset.filter] = el.value;
  });
  var rows = document.querySelectorAll('.data-table tbody tr');
  var visible = 0;
  rows.forEach(function(row) {
    var show = true;
    Object.keys(filters).forEach(function(key) {
      if (filters[key] && !row.dataset[key]?.includes(filters[key])) show = false;
    });
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  var empty = document.getElementById('emptyState');
  if (empty) empty.style.display = visible === 0 ? '' : 'none';
}
document.querySelectorAll('[data-filter]').forEach(function(el) { el.addEventListener('change', applyFilters); });
document.getElementById('resetFilters')?.addEventListener('click', function() {
  document.querySelectorAll('[data-filter]').forEach(function(el) { el.value = ''; });
  applyFilters();
});
```

### 空状态引导 (empty-state)

```html
<div id="emptyState" style="display:none; text-align:center; padding:60px 0; color:#999;">
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style="margin-bottom:16px">
    <rect x="8" y="12" width="48" height="40" rx="4" stroke="#d1d5db" stroke-width="2" fill="none"/>
    <line x1="20" y1="26" x2="44" y2="26" stroke="#d1d5db" stroke-width="2"/>
    <line x1="20" y1="34" x2="36" y2="34" stroke="#d1d5db" stroke-width="2"/>
  </svg>
  <p>暂无数据</p>
  <p style="font-size:12px; margin-top:4px;">请调整筛选条件或新建数据</p>
</div>
```

### Toast 反馈 (toast-feedback)

```javascript
function showToast(message, type) {
  var t = document.createElement('div');
  t.className = 'proto-toast';
  var colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  t.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:6px;color:#fff;font-size:14px;z-index:10000;opacity:0;transition:opacity 0.3s;border-left:4px solid ' + (colors[type] || colors.info);
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.style.opacity = '1'; });
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 3000);
}
```

### 撤销操作 (undo-action)

```javascript
function showUndo(message, onUndo) {
  var bar = document.createElement('div');
  bar.className = 'undo-bar';
  bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 20px;background:#1f2937;color:#fff;border-radius:6px;font-size:14px;z-index:10000;display:flex;align-items:center;gap:12px;';
  bar.innerHTML = '<span>' + message + '</span><button style="background:#3b82f6;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer">撤销</button>';
  document.body.appendChild(bar);
  bar.querySelector('button').onclick = function() { onUndo(); bar.remove(); };
  setTimeout(function() { bar.remove(); }, 5000);
}
```

### 标签页记忆 (tab-memory)

```javascript
// 页面加载时恢复上次选中的 tab
var savedTab = localStorage.getItem(location.pathname + '-active-tab');
if (savedTab) {
  var btn = document.querySelector('[data-tab="' + savedTab + '"]');
  if (btn) btn.click();
}
// tab 切换时保存
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    localStorage.setItem(location.pathname + '-active-tab', btn.dataset.tab);
  });
});
```

### 面包屑导航 (breadcrumb)

```html
<nav class="breadcrumb" style="font-size:13px;color:#6b7280;margin-bottom:16px;">
  <a href="index.html" style="color:#3b82f6;text-decoration:none">首页</a>
  <span style="margin:0 6px">/</span>
  <a href="javascript:void(0)" onclick="history.back()" style="color:#3b82f6;text-decoration:none">列表页</a>
  <span style="margin:0 6px">/</span>
  <span style="color:#374151;font-weight:500">当前页</span>
</nav>
```
```

- [ ] **Step 2: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add references/b2b-interaction-patterns.md
git commit -m "feat(pm): add JS implementation guides for all 12 interaction patterns

Each interaction pattern now has concrete JavaScript/CSS reference code that
the prototype generator must use. Covers inline-edit, hover-actions,
confirm-dialog, cascade-select, conditional-display, cross-field-validation,
search-debounce, advanced-filter, empty-state, toast-feedback, undo-action,
tab-memory, and breadcrumb."
```

---

### Task 9: 强化 html-prototype-generator.md 交互强制规则

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/prompts/html-prototype-generator.md`

- [ ] **Step 1: 在"其他交互要求"之后追加 Mock 数据注入规则**

找到"### 其他交互要求"章节（约第 218 行），在第 6 条之后追加：

```markdown
7. **Mock 数据注入**：每个页面必须在 `<script>` 标签顶部定义 MOCK_DATA 数组（3-5 条示例记录），包含该页面列表或表单所需的全部字段。筛选、排序、分页、搜索等交互基于 MOCK_DATA 运行。示例：
```javascript
var MOCK_DATA = [
  { id: 1, employee: "张三", dept: "技术部", amount: 1200.00, status: "待审核", date: "2024-03-15" },
  { id: 2, employee: "李四", dept: "产品部", amount: 800.50, status: "已确认", date: "2024-03-14" },
  { id: 3, employee: "王五", dept: "运营部", amount: 2100.00, status: "已驳回", date: "2024-03-13" }
];
```
8. **向导步骤前进/后退**：向导类页面（wizard）必须有步骤前进和后退逻辑。点击"下一步"显示当前步骤内容并切换到下一步，点击"上一步"返回上一步，步骤指示器同步更新。
9. **表单失焦校验**：create/edit 页面的必填字段在 blur 时校验（空值显示红色错误提示），提交时全量校验。
10. **禁止纯展示按钮**：页面中不能出现无 onclick 事件的按钮或链接。如果某个操作在原型中不需要展示，就不应该出现该按钮。
```

- [ ] **Step 2: 在输出自检清单中追加 Mock 数据和向导检查项**

找到"## 输出自检清单"（约第 228 行），在最后一行之后追加：

```markdown
- [ ] 每个页面都有 MOCK_DATA 数组（至少 3 条记录），且 MOCK_DATA 字段与表格列一致
- [ ] 向导页面有步骤前进/后退逻辑，步骤指示器同步更新
- [ ] 没有无 onclick 的"假按钮"（如果不需要该操作，就不要放这个按钮）
- [ ] 筛选器 change/input 事件绑定了实际的表格行过滤逻辑
```

- [ ] **Step 3: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add prompts/html-prototype-generator.md
git commit -m "feat(pm): strengthen prototype interaction quality rules

Add mock data injection requirement (3-5 records per page), wizard
step navigation, form blur validation, and no-decorative-button rules.
Extend self-check checklist with mock data and button audit items."
```

---

## Phase 4：PRD 深度

### Task 10: 强化 prd-generator.md 深度规则

**Files:**
- Modify: `/Users/skill/pm-html-pdt-fused/prompts/prd-generator.md`

- [ ] **Step 1: 修改"逐功能深度规则"扩展为 P0+P1 都必须覆盖**

找到"## 逐功能深度规则（M/L 级）"章节（约第 26 行），将标题和开头改为：

```markdown
## 逐功能深度规则（M/L 级）

对于 M 级和 L 级 PRD，`scope`（功能清单）section 列出了所有功能点。`module`（详细功能说明）section 必须为 scope 中的**每一个 P0 和 P1 功能点**都提供完整的详细规格，不能只详写前几个功能而其余功能一笔带过。

### 深度分层标准

| 优先级 | 展开深度 | 要求 |
|---|---|---|
| P0（核心功能） | 完整 5 板块 + 字段级规则编号 + 状态机映射 | 必须全覆盖 |
| P1（重要功能） | 完整 5 板块 + 字段级规则（可省略编号） | 必须全覆盖 |
| P2（增强功能） | 基本信息 + 操作流程 + 关键异常（可省略字段级规则） | 建议覆盖，不能只有一行标题 |

每个 P0/P1 功能点的"详细规格"必须包含：
```

- [ ] **Step 2: 在每个功能点的详细规格中增加板块 5"关联依赖"**

在现有的 4 个板块之后追加第 5 个：

```markdown
5. **关联依赖**：该功能依赖的其他功能编号、影响的其他模块、涉及的状态流转节点
```

- [ ] **Step 3: 在输出自检中增加 P0+P1 覆盖率统计**

找到"### 输出自检"（约第 47 行），将现有的 3 条自检规则替换为更严格的版本：

```markdown
### 输出自检

在输出 PRD JSON 之前，执行以下自检：

1. 计数 `scope` section 中的 P0+P1 功能点数量（记为 A）
2. 计数 `module` section 中有完整 5 板块详细规格的 P0/P1 功能点数量（记为 B）
3. 如果 A ≠ B，必须补全缺失的详细规格后再输出
4. 对每个 P0/P1 功能点，检查：
   - 是否有操作步骤流（不能只有文字概述）
   - 是否有业务规则表（不能只有标题）
   - 是否有异常场景（至少 2 个：正常异常 + 边界异常）
   - 是否有字段级校验规则（涉及的字段逐一列出）
   - 是否有关联依赖说明
5. 检查是否有"参考上述说明""同上""类似功能 X"等替代写法（有则必须展开具体内容）
```

- [ ] **Step 4: 在文件末尾追加分篇输出规则**

在"## analysis-data.json 消费指引"之前追加：

```markdown
## PRD 分篇输出规则

当功能数量超过 15 个时，PRD 自动分篇输出，避免单文件过长导致 LLM 截断：

- **Part 1**（prd-part1.md）：文档概述（背景、目标、术语、架构）+ P0 功能详写
- **Part 2**（prd-part2.md）：P1 功能详写
- **Part 3**（prd-part3.md）：P2 功能简写 + 非功能需求 + 风险与应对

分篇规则：
- 每篇独立成文件，可独立阅读
- 每篇开头有目录概览（列出本篇包含的功能编号和名称）
- 功能编号全局连续（不因分篇而重新编号）
- 如果功能数量 ≤ 15 个，不需要分篇，全部写入一个 PRD 文件
```

- [ ] **Step 5: Commit**

```bash
cd /Users/skill/pm-html-pdt-fused
git add prompts/prd-generator.md
git commit -m "feat(pm): strengthen PRD depth requirements

Upgrade depth rules: P0+P1 both require full 5-section specs (was P0 only).
Add 5th section 'related dependencies'. Stricten self-check to verify
P0+P1 coverage rate. Add split-output rule for 15+ feature PRDs."
```

---

## 验证

### Task 11: 端到端验证

- [ ] **Step 1: 验证 biz-analysis 校验脚本**

```bash
cd /Users/skill/biz-analysis
node scripts/validate_schema.js /Users/个人项目/测试项目1/workload-deduction/analysis-data.json
```

预期：通过（新字段为可选，现有数据不受影响）。

- [ ] **Step 2: 验证 pm-html-pdt-fused typecheck**

```bash
cd /Users/skill/pm-html-pdt-fused
pnpm typecheck
```

预期：无错误（本次变更只涉及 Markdown 文件）。

- [ ] **Step 3: 验证 pm-html-pdt-fused 测试**

```bash
cd /Users/skill/pm-html-pdt-fused
pnpm test
```

预期：与改动前一致（无新增失败）。

- [ ] **Step 4: 检查所有变更文件完整性**

```bash
# biz-analysis 侧
git -C /Users/skill/biz-analysis diff --stat
# pm-html-pdt-fused 侧
git -C /Users/skill/pm-html-pdt-fused diff --stat
```

确认：
- biz-analysis: output-schema.md, SKILL.md, validate_schema.js
- pm-html-pdt-fused: analysis-data-mapping.md (新增), SKILL.md, prototype-spec-generator.md, prd-generator.md, b2b-interaction-patterns.md, html-prototype-generator.md
