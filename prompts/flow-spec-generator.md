请把用户需求整理为 flow-spec-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "flow-spec-agent"。
2. output 必须是合法 FlowSpec。
3. 如需求包含审批、审核、驳回、撤回、流转等语义，必须包含状态机和状态流转。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。
