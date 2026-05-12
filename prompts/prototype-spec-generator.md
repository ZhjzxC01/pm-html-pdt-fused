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
| pageType | 页面类型：`list` / `detail` / `form` / `approval` / `kanban` / `tree` / `dashboard` / `config` / `stepper` / `diff` | 是 |
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

### 字段（fields）

每个字段必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 字段 ID，格式 `field_<英文名>` | 是 |
| name | 字段中文名称 | 是 |
| fieldType | 字段类型：`text` / `number` / `money` / `select` / `date` / `file` / `textarea` / `switch` | 是 |
| required | 是否必填 | 是 |
| validation | 校验规则描述 | 否 |

### 操作（actions）

每个操作必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| id | 操作 ID，格式 `action_<英文名>` | 是 |
| name | 操作中文名称（如"提交审批"、"导出"） | 是 |
| actionType | 操作类型：`primary` / `secondary` / `danger` / `ghost` | 是 |
| allowedRoles | 允许执行的角色列表 | 否 |
| precondition | 前置条件（如"仅草稿状态可操作"） | 否 |

### ID 命名规则

- 页面：`page_<业务对象>_<页面类型>`，如 `page_expense_list`、`page_expense_create`
- 模块：`module_<功能名>`，如 `module_filter`、`module_table`、`module_approval_actions`
- 字段：`field_<字段名>`，如 `field_amount`、`field_expense_type`
- 操作：`action_<动作名>`，如 `action_submit`、`action_approve`、`action_export`

禁止使用无业务语义的 ID（如 `page_1`、`module_a`、`field_01`）。
