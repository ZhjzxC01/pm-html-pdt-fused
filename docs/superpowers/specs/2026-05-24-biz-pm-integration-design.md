# Biz-PM 协同质量提升设计方案

> **日期**: 2026-05-24
> **状态**: Draft
> **涉及技能**: biz-analysis, pm-html-pdt-fused

## 1. 问题背景

pm-html-pdt-fused 生成的产物存在系统性质量缺陷：

**原型问题**：10 个页面中 6 个完全没有 JavaScript，其余 4 个只有半成品交互（tab 只切换样式不切换内容、筛选框无逻辑、按钮无响应、表单无校验）。本质上是静态 HTML/CSS 布局，不是可交互的高保真原型。

**PRD 问题**：41 个功能中只有 4 个有详细业务规则和异常场景，其余 37 个只有一行标题描述。PRD 有骨架但无血肉。

**根因**：biz-analysis 产出了 38KB 结构化分析数据（实体属性、状态机转换、业务规则、权限矩阵），但 pm-html-pdt-fused **完全没有消费**这些结构化数据。pm 用 94 行的骨架 project-state.json 去生成需要 38KB 分析数据才能支撑的原型和 PRD。

## 2. 设计目标

| 目标 | 验收标准 |
|---|---|
| 原型全交互 | 100% 页面有真实 JS 交互，0 个纯静态 HTML，0 个 alert() 占位 |
| PRD 全功能深度覆盖 | 100% P0+P1 功能有完整 5 板块规格（基本信息、操作流程、字段级规则、异常场景、关联依赖） |
| biz 数据被 pm 消费 | analysis-data.json 的 frontendType、interactionPatterns、validation 等字段直接驱动 pm 生成 |
| 向后兼容 | biz 未升级时，pm 通过降级推断仍能工作 |

## 3. 方案选型

采用**「厚交接」方案**：丰富 biz 输出 schema + pm 结构化消费。

对比其他方案：
- 「智能推断」（不改 biz，pm 用更强提示词推断）：LLM 推断质量不稳定，缺乏结构化约束
- 「桥接层」（新增 TypeScript mapper 模块）：维护成本高，biz schema 迭代时 mapper 容易过时

## 4. 设计详情

### 4.1 biz-analysis 输出 schema 扩展

在 `analysis-data.json` 的现有结构中增加 4 组设计级字段。

#### 4.1.1 entity.attributes 新增 frontendType 和 validation

**当前状态**：entity.attributes 只有 `name`、`type`（业务类型）、`description`、`confidence`。

**新增字段**：

```json
{
  "name": "unit_price",
  "type": "decimal",
  "description": "核减单价",
  "confidence": "green",
  "frontendType": "money",
  "validation": {
    "required": true,
    "min": 0.01,
    "max": 99999.99,
    "pattern": null,
    "enum": null,
    "rules": ["必须大于0", "精度保留两位小数"]
  }
}
```

**frontendType 枚举**：`text` / `number` / `money` / `date` / `datetime` / `select` / `multi_select` / `textarea` / `file` / `user` / `department` / `status`

**validation 字段说明**：
- `required`：是否必填
- `min` / `max`：数值范围或字符串长度
- `pattern`：正则校验模式
- `enum`：可选值列表（用于 select 类型）
- `rules`：业务校验规则描述数组

#### 4.1.2 features 新增 interactionPatterns 和 pageLayout

**当前状态**：features 只有 `module`、`feature`、`role`、`priority`、`user_story`、`acceptance_criteria`、`dependencies`。

**新增字段**：

```json
{
  "featureId": "F1.1",
  "module": "数据导入",
  "feature": "Excel批量导入",
  "role": "数据专员",
  "priority": "P0",
  "user_story": "作为数据专员，我希望通过上传 Excel 文件批量导入工单数据...",
  "acceptance_criteria": "...",
  "dependencies": ["F1.0"],
  "interactionPatterns": ["file-upload", "wizard-steps", "confirm-dialog", "toast-feedback"],
  "pageLayout": {
    "pageType": "create",
    "modules": [
      { "type": "wizard", "steps": ["上传文件", "数据校验", "确认导入"] },
      { "type": "table", "purpose": "异常数据预览" },
      { "type": "actions", "buttons": ["确认导入", "取消", "导出异常"] }
    ]
  }
}
```

**interactionPatterns**：引用 `references/b2b-interaction-patterns.md` 中定义的模式 ID。

**pageLayout**：描述页面类型和模块组成，供 pm 生成 prototypeSpec 时直接使用。

#### 4.1.3 state_machines 新增 uiActions

**当前状态**：state_machines 的 transitions 只有 `from`、`to`、`trigger`、`conditions`。

**新增字段**：

```json
{
  "from": "草稿",
  "to": "待审核",
  "trigger": "提交审核",
  "conditions": ["明细金额必须已填写", "至少一条核减记录"],
  "uiAction": {
    "buttonLabel": "提交审核",
    "buttonType": "primary",
    "precondition": "所有必填字段已填写",
    "confirmMessage": "确认提交后将进入审核流程，无法修改，是否继续？"
  }
}
```

#### 4.1.4 processes 新增 uiMapping

**当前状态**：processes 的 steps 只有 `step_number`、`actor`、`action`、`system_response`。

**新增字段**：

```json
{
  "process": "P1",
  "name": "明细核减流程",
  "type": "main",
  "steps": [...],
  "uiMapping": {
    "pageId": "page_deduction_list",
    "stepToModule": [
      { "step": "选择账期", "moduleId": "module_filter", "fieldId": "field_billing_period" },
      { "step": "确认核减", "moduleId": "module_actions", "actionId": "action_batch_confirm" }
    ]
  }
}
```

### 4.2 pm 侧消费层

#### 4.2.1 整体数据流

```
analysis-data.json (biz 产出)
        │
        ▼
┌─────────────────────────────┐
│  结构化映射路径              │
│  (analysis-data-mapping.md) │
└─────────────────────────────┘
        │
        ├─→ requirementCard     (业务规则、实体、角色、状态机)
        ├─→ prototypeSpec       (页面、模块、字段、交互)
        ├─→ flowSpec            (状态流转、触发条件、UI操作)
        └─→ prdSpec             (功能规格骨架)
```

#### 4.2.2 映射规则

| biz-analysis 字段 | → ProjectState 字段 | 映射逻辑 |
|---|---|---|
| `business_context` | `requirementCard.background` | 直接映射：目标、痛点、现状 |
| `business_model.entities[].attributes[]` (含 frontendType) | `prototypeSpec.pages[].modules[].fields[]` | 每个 entity 的属性 → 对应页面模块的字段定义，frontendType 直接映射 fieldType |
| `business_model.state_machines[].transitions[]` (含 uiActions) | `flowSpec.stateMachines[].transitions[]` | 状态转换 → flowSpec 转换定义，uiAction → 页面操作按钮 |
| `business_model.roles[]` | `requirementCard.roles[]` | 角色直接映射 |
| `business_model.processes[]` (含 uiMapping) | `prototypeSpec.pages[]` | process 的 uiMapping.pageId → 页面 ID，stepToModule → 模块分配 |
| `features[]` (含 interactionPatterns, pageLayout) | `prototypeSpec.pages[].modules[].interactions` | pageLayout.modules → 模块列表，interactionPatterns → interactions 字段 |
| `features[].acceptance_criteria` | `prdSpec.chapters[].features[].businessRules` | Gherkin 格式转为结构化业务规则 |
| `features[].user_story` | `prdSpec.chapters[].features[].description` | 直接映射 |
| `business_model.entities[].attributes[].validation` | `prototypeSpec.pages[].modules[].fields[].validation` | 校验规则直接映射 |

#### 4.2.3 实现位置

1. 新增 `references/analysis-data-mapping.md`：定义上述映射规则，作为 LLM agent 的消费指南
2. 修改 `SKILL.md` 的 raw material processing 步骤：增加判断——如果输入包含 `analysis-data.json`，走结构化映射路径
3. 修改 `prototype-spec-generator.md` 和 `prd-generator.md`：增加引用 `analysis-data.json` 的 instruction

#### 4.2.4 降级策略

如果 analysis-data.json 中某个新增字段缺失，pm 的 LLM agent 按以下规则降级：

| 缺失字段 | 降级逻辑 |
|---|---|
| `frontendType` | 根据 attribute.type 推断：decimal→money, varchar→text, date→date, enum→select |
| `interactionPatterns` | 根据 feature 的 pageType 推断：list→[advanced-filter, hover-actions, empty-state]，create→[conditional-display, cross-field-validation] |
| `validation` | LLM 根据属性描述和业务规则自行推断 |
| `pageLayout` | LLM 根据 feature 列表自行组织页面结构 |

### 4.3 原型生成质量规则

#### 4.3.1 交互强制清单

在 `html-prototype-generator.md` 中增加硬性约束：

| 编号 | 规则 |
|---|---|
| R1 | 每个 list 页面必须有可工作的筛选逻辑（至少筛选下拉框能过滤表格行） |
| R2 | 每个有 tab 的页面必须有 tab 内容切换（点击 tab 切换显示不同内容区域） |
| R3 | 每个 create/edit 页面必须有表单校验（必填项为空时显示错误提示） |
| R4 | 每个涉及状态流转的页面必须有操作按钮反馈（确认弹窗 → 操作结果 toast） |
| R5 | 每个涉及数据展开/折叠的组件必须有完整的展开/折叠逻辑 |
| R6 | 分页组件必须有页码切换逻辑（至少切换高亮和内容区域变化） |
| R7 | 禁止出现 onclick="alert(...)" 占位——要么实现逻辑，要么不加按钮 |
| R8 | 向导类页面必须有步骤前进/后退逻辑 |

#### 4.3.2 交互模式 JS 实现指引

在 `references/b2b-interaction-patterns.md` 中为每种交互模式补充 JS 实现要求：

| 交互模式 | JS 实现要求 |
|---|---|
| `search-debounce` | 输入框 debounce 300ms，过滤表格行，无匹配时显示 empty state |
| `advanced-filter` | 筛选下拉框 change 事件，组合筛选条件，重置按钮清空所有筛选 |
| `inline-edit` | 行内双击或编辑按钮切换为 input，blur 时保存，Esc 取消 |
| `hover-actions` | 行 hover 显示操作按钮组，鼠标移出 300ms 后隐藏 |
| `confirm-dialog` | 操作按钮点击弹出自定义 modal（不用 alert），确认/取消回调 |
| `cascade-select` | 级联下拉框：父级 change 时清空子级选项并加载新选项 |
| `conditional-display` | 根据字段值显示/隐藏其他字段（如选择"其他"时显示文本输入框） |
| `cross-field-validation` | 字段 blur 时校验关联字段（如结束日期不能早于开始日期） |
| `tab-memory` | tab 切换时更新 URL hash，刷新页面恢复上次选中的 tab |
| `toast-feedback` | 操作成功/失败后显示 toast 消息（自动消失，可手动关闭） |
| `empty-state` | 表格无数据时显示空状态插图 + 引导文案 |
| `undo-action` | 删除操作后显示"撤销"按钮，5 秒后自动消失 |

#### 4.3.3 Mock 数据注入

每个页面必须有内嵌的 mock 数据（3-5 条示例记录），用于驱动交互。mock 数据定义在 `<script>` 标签顶部，供筛选、排序、分页等交互使用。

#### 4.3.4 交互完整性自检

生成完成后，LLM agent 必须执行自检：
- 列出每个页面的所有交互组件（筛选框、tab、按钮、表单等）
- 检查每个交互组件是否绑定了 JS 事件处理
- 检查是否有 alert() 占位符（有则删除或实现）
- 检查是否有纯展示的"假按钮"（无 onclick 的按钮）
- 确认 mock 数据量足够驱动所有交互（至少 3 条）

### 4.4 PRD 生成深度规则

#### 4.4.1 功能规格展开标准

在 `prd-generator.md` 中增加强制展开规则。每个功能（feature）必须包含以下 5 个板块：

| 板块 | 内容 |
|---|---|
| 基本信息 | 功能编号、名称、所属模块、角色、优先级 |
| 操作流程 | 逐步骤拆解（步骤序号 → 用户操作 → 系统处理 → 界面反馈） |
| 字段级业务规则 | 每个涉及的字段：字段名、类型、是否必填、校验规则（正向/反向/边界），规则用编号标注（如 R1.1-01） |
| 异常场景 | 每个异常：触发条件 → 系统行为 → 用户提示 |
| 关联依赖 | 依赖的其他功能、影响的其他模块、涉及的状态流转 |

#### 4.4.2 深度分层标准

| 优先级 | 展开深度 | 要求 |
|---|---|---|
| P0（核心功能） | 完整 5 板块 + 字段级规则编号 + 状态机映射 | 必须全覆盖 |
| P1（重要功能） | 完整 5 板块 + 字段级规则（可省略编号） | 必须全覆盖 |
| P2（增强功能） | 基本信息 + 操作流程 + 关键异常（可省略字段级规则） | 建议覆盖 |

**关键变化**：从"只有 P0 详写"变为"P0 和 P1 都必须详写"。P2 可以简写但不能只有一行标题。

#### 4.4.3 biz 数据直接注入

PRD 生成时，从 biz 产出中提取数据直接注入对应功能的规格：

| biz 数据源 | → PRD 注入位置 |
|---|---|
| `features[].acceptance_criteria` (Gherkin) | → 异常场景板块（Given-When-Then 直接转为触发条件+系统行为+用户提示） |
| `entity.attributes[].validation` | → 字段级业务规则板块 |
| `state_machines[].transitions[].conditions` | → 操作流程中状态转换步骤 |
| `state_machines[].transitions[].uiAction` | → 操作流程中按钮操作描述 |
| `business_model.processes[].steps` | → 操作流程板块 |
| `risks[]` | → PRD 尾部的风险与应对章节 |

#### 4.4.4 PRD 分篇输出

当功能数量较多时（超过 15 个功能），PRD 自动分篇：

- **Part 1**：文档概述（背景、目标、术语、架构）+ P0 功能详写
- **Part 2**：P1 功能详写
- **Part 3**：P2 功能简写 + 非功能需求 + 风险与应对

每篇独立成文件，避免单文件过长导致 LLM 截断。

#### 4.4.5 PRD 深度自检

生成完成后，LLM agent 必须执行自检：
- 统计所有 P0+P1 功能数量
- 检查每个 P0/P1 功能是否包含完整的 5 个板块
- 检查是否有功能只有一行标题描述（有则标记并展开）
- 检查字段级规则是否覆盖了该功能涉及的所有字段
- 检查异常场景是否至少列出 2 个（正常异常 + 边界异常）
- 检查操作流程是否有逐步骤拆解（而非一段文字概述）

## 5. 实施分阶段

### Phase 1：biz 输出扩展（基础）

| 变更 | 文件 |
|---|---|
| 新增设计级字段定义 | `biz-analysis/references/output-schema.md` |
| 修改 Phase 6 生成要求 | `biz-analysis/SKILL.md` |
| 补充示例数据 | `biz-analysis/examples/` |

### Phase 2：pm 消费层（核心）

| 变更 | 文件 |
|---|---|
| 新增映射规则文档 | `pm-html-pdt-fused/references/analysis-data-mapping.md` |
| 修改 raw material processing 步骤 | `pm-html-pdt-fused/SKILL.md` |
| 修改生成提示词引用 | `pm-html-pdt-fused/prompts/prototype-spec-generator.md` |
| 修改生成提示词引用 | `pm-html-pdt-fused/prompts/prd-generator.md` |

### Phase 3：原型交互质量（体验）

| 变更 | 文件 |
|---|---|
| 增加交互强制清单 + 自检规则 | `pm-html-pdt-fused/prompts/html-prototype-generator.md` |
| 每种模式增加 JS 实现指引 | `pm-html-pdt-fused/references/b2b-interaction-patterns.md` |

### Phase 4：PRD 深度（体验）

| 变更 | 文件 |
|---|---|
| 增加功能展开标准 + 分篇规则 + 自检 | `pm-html-pdt-fused/prompts/prd-generator.md` |

## 6. 验证标准

| 验证项 | 通过标准 |
|---|---|
| biz 输出完整性 | analysis-data.json 包含 frontendType、interactionPatterns、validation 等新字段 |
| pm 映射正确性 | project-state.json 的 requirementCard 和 prototypeSpec 包含从 biz 映射来的结构化数据 |
| 原型交互率 | 100% 页面有 JS 交互，0 个纯静态 HTML 页面，0 个 alert() 占位 |
| PRD 覆盖率 | 100% P0+P1 功能有完整 5 板块规格，字段级规则覆盖所有涉及字段 |
| 端到端验证 | 从 biz 分析 → pm 原型/PRD 全流程跑通，测试项目重新生成后质量达标 |

## 7. 不在本次范围内

- biz-analysis 的实体验证脚本（validate_schema.js）扩展——后续迭代
- pm 的 HTML renderer 代码层面改造——提示词层面解决即可
- 原型的 mock 数据动态化（从静态数组升级为更复杂的数据模拟）——当前 mock_data 驱动交互已足够
- 多项目复用——先在 workload-deduction 项目验证，后续再考虑通用化
