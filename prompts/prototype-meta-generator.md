请把用户需求整理为 prototype-meta-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "prototype-meta-agent"。
2. output 必须是合法 PrototypeMeta。
3. DOM selector 必须能唯一定位 HTML 原型中的关键页面、模块和操作。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## PrototypeMeta 结构要求

PrototypeMeta 建立 HTML 原型 DOM 元素与 ProjectState 实体之间的映射关系，确保标注、PRD 引用和一致性检查可以精确定位到原型中的 DOM 节点。

### 映射条目

每条映射必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| entityId | ProjectState 中的实体 ID（如 `page_list`、`module_filter`、`action_submit`） | 是 |
| entityType | 实体类型：`page` / `module` / `field` / `action` / `ui_state` | 是 |
| selector | CSS 选择器或 data 属性选择器，如 `[data-page-id="page_list"]` | 是 |
| label | 人类可读的描述（如"报销单列表页"） | 是 |
| containedBy | 父级实体 ID（如 module 的父级 page） | 否 |

### 选择器优先级

生成选择器时优先使用以下策略（按优先级排列）：

1. **data 属性选择器**（最优）：`[data-page-id="page_list"]`、`[data-module-id="module_filter"]`、`[data-action-id="action_submit"]`
2. **ID 选择器**：`#page_list`
3. **复合选择器**（最后手段）：`[data-page-id="page_list"] .filter-section`

禁止使用：
- 依赖文案内容的选择器（如 `:contains("提交")`）
- 依赖位置的选择器（如 `.btn:nth-child(3)`）
- 过深的嵌套选择器（超过 3 层）

### 良好输出示例

```json
{
  "mappings": [
    {
      "entityId": "page_expense_list",
      "entityType": "page",
      "selector": "[data-page-id=\"page_expense_list\"]",
      "label": "报销单列表页"
    },
    {
      "entityId": "module_filter",
      "entityType": "module",
      "selector": "[data-module-id=\"module_filter\"]",
      "label": "筛选区",
      "containedBy": "page_expense_list"
    },
    {
      "entityId": "action_submit",
      "entityType": "action",
      "selector": "[data-action-id=\"action_submit\"]",
      "label": "提交审批按钮",
      "containedBy": "page_expense_create"
    }
  ]
}
```

### 差劲输出（禁止）

```json
{
  "mappings": [
    { "entityId": "page1", "selector": "div.content > div:first-child" }
  ]
}
```

**问题**：ID 无业务语义，选择器依赖 DOM 结构位置，缺少 entityType 和 label。
