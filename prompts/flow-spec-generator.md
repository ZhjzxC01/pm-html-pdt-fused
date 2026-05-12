请把用户需求整理为 flow-spec-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "flow-spec-agent"。
2. output 必须是合法 FlowSpec。
3. 如需求包含审批、审核、驳回、撤回、流转等语义，必须包含状态机和状态流转。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## FlowSpec 结构要求

FlowSpec 必须包含以下部分：

### 状态集合

每个业务对象的完整状态集合，至少包含：
- **初始态**：如 `draft`（草稿）
- **中间态**：如 `pending_approval`（待审批）、`processing`（处理中）
- **终态**：至少 1 个正向终态（如 `completed`）和 1 个负向终态（如 `rejected`/`cancelled`）

### 状态流转表

每条流转必须包含：

| 字段 | 说明 | 必须 |
|------|------|------|
| fromState | 当前状态 | 是 |
| toState | 目标状态 | 是 |
| trigger | 触发动作（如 submit、approve、reject） | 是 |
| allowedRoles | 允许执行的角色列表 | 是 |
| precondition | 前置条件（如"必填字段已填写"） | 否 |

### 非法流转

明确列出不允许的状态流转路径，以及对应的拦截规则（如"已完成状态不可退回草稿"）。

### 审批流（如有）

当需求包含审批语义时，额外包含：
- 审批节点列表（节点名称、审批人角色、可执行动作）
- 条件分支规则（如"金额 > 5000 需额外审批"）
- 驳回规则：驳回后退回哪个状态
- 撤回规则：什么条件下允许撤回
- 转审规则：是否支持转交他人审批

## 良好输出示例

```json
{
  "states": [
    { "id": "draft", "label": "草稿", "type": "initial" },
    { "id": "pending_manager", "label": "待主管审批", "type": "intermediate" },
    { "id": "approved", "label": "已通过", "type": "terminal_positive" },
    { "id": "rejected", "label": "已驳回", "type": "terminal_negative" }
  ],
  "transitions": [
    { "fromState": "draft", "toState": "pending_manager", "trigger": "submit", "allowedRoles": ["employee"], "precondition": "必填字段已填写" },
    { "fromState": "pending_manager", "toState": "approved", "trigger": "approve", "allowedRoles": ["manager"] },
    { "fromState": "pending_manager", "toState": "rejected", "trigger": "reject", "allowedRoles": ["manager"], "precondition": "必须填写驳回原因" }
  ]
}
```

## 差劲输出（禁止）

```json
{
  "states": ["草稿", "审批中", "完成"],
  "transitions": ["草稿→审批→完成"]
}
```

**问题**：状态缺少 ID 和类型标注，流转缺少触发动作、角色和前置条件，无法被下游消费。
