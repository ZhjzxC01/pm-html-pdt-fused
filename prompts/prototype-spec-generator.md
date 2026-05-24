请把用户需求整理为 prototype-spec-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "prototype-spec-agent"。
2. output 必须是合法 PrototypeSpec。
3. assumptions、pendingQuestions、warnings 必须存在。
4. 不要输出 JSON Patch。
5. 不要输出 Markdown。

## PrototypeSpec 结构要求

PrototypeSpec 是 HTML 原型的结构化规格说明，定义了原型包含哪些页面、模块、字段、操作和权限规则。它是原型生成器的输入，也是 PRD 和标注的追溯基础。

### 页面（pages）

每个页面必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 页面 ID，格式 `page_<英文名>`（如 `page_expense_list`） | 是 |
| name | 页面中文名称 | 是 |
| pageType | 页面类型：`list` / `detail` / `create` / `edit` / `approval` / `config` / `dashboard` / `log` | 是 |
| description | 页面目标描述（一句话说明这个页面用来做什么） | 是 |
| modules | 页面包含的模块列表 | 是 |
| roleVisibility | 哪些角色可以访问此页面 | 否 |

### 模块（modules）

每个模块必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 模块 ID，格式 `module_<英文名>` | 是 |
| name | 模块中文名称（如"筛选区"、"操作按钮区"、"数据表格"） | 是 |
| fields | 模块包含的字段列表 | 否 |
| actions | 模块包含的操作列表 | 否 |
| interactions | 该模块需要的交互模式 ID 列表（来自 `references/b2b-interaction-patterns.md`） | 否 |

### 交互模式（interactions）

每个涉及用户交互的模块**必须**声明其交互模式。交互模式 ID 来自 `references/b2b-interaction-patterns.md` 中定义的 14 种模式：

- 数据操作：`inline-edit`、`hover-actions`、`confirm-dialog`
- 表单交互：`cascade-select`、`conditional-display`、`cross-field-validation`
- 搜索筛选：`search-debounce`、`advanced-filter`
- 状态反馈：`empty-state`、`skeleton-loading`、`toast-feedback`、`undo-action`
- 导航效率：`keyboard-shortcut`、`breadcrumb`、`tab-memory`

按模块类型的最低交互要求：

| 模块类型 | 必须声明的 interactions |
|----------|----------------------|
| filter | `["advanced-filter", "search-debounce"]` |
| table | `["hover-actions", "empty-state"]`（如涉及行内编辑再加 `"inline-edit"`） |
| form | `["conditional-display", "cross-field-validation"]`（如涉及级联选择再加 `"cascade-select"`） |
| tabs | `["tab-memory"]` |
| approval_panel | `["confirm-dialog", "toast-feedback"]` |
| detail_card | 根据实际交互按需添加 |

### 字段（fields）

每个字段必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 字段 ID，格式 `field_<英文名>` | 是 |
| name | 字段中文名称 | 是 |
| fieldType | 字段类型：`text` / `number` / `money` / `date` / `datetime` / `select` / `multi_select` / `textarea` / `file` / `user` / `department` / `status` | 是 |
| required | 是否必填 | 是 |
| validation | 校验规则描述 | 否 |

### 操作（actions）

每个操作必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 操作 ID，格式 `action_<英文名>` | 是 |
| name | 操作中文名称（如"提交审批"、"导出"） | 是 |
| actionType | 操作类型：`create` / `edit` / `delete` / `submit` / `approve` / `reject` / `withdraw` / `export` / `import` / `batch` / `view` / `search` / `reset` | 是 |
| allowedRoles | 允许执行的角色列表 | 否 |
| precondition | 前置条件（如"仅草稿状态可操作"） | 否 |

### ID 命名规则

- 页面：`page_<业务对象>_<页面类型>`，如 `page_expense_list`、`page_expense_create`
- 模块：`module_<功能名>`，如 `module_filter`、`module_table`、`module_approval_actions`
- 字段：`field_<字段名>`，如 `field_amount`、`field_expense_type`
- 操作：`action_<动作名>`，如 `action_submit`、`action_approve`、`action_export`

禁止使用无业务语义的 ID（如 `page_1`、`module_a`、`field_01`）。

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
