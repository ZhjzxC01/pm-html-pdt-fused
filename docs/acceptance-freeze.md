# 验收冻结记录

日期：2026-04-26

## 目标

确认融合版 Skill 已从“开发完成”进入“可验收、可复现、可冻结”的状态。冻结标准不是代码存在，而是核心质量门、标准样例链路和关键交付物都能稳定产出。

## 本轮通过项

基础质量门：

- `pnpm typecheck`：通过
- `pnpm test`：通过，17 个测试文件、50 个测试全部通过
- `pnpm build`：通过

费用报销标准链路：

- `pm-html-skill generate --input examples/expense-approval/input.md`：通过
- `pm-html-skill validate --project examples/expense-approval/project-state.json`：通过
- `pm-html-skill render --project examples/expense-approval/project-state.json`：通过
- `pm-html-skill annotate --project examples/expense-approval/project-state.json`：通过
- `pm-html-skill check --project examples/expense-approval/project-state.json`：通过

关键交付物：

- `examples/expense-approval/project-state.json`
- `examples/expense-approval/output/index.html`
- `examples/expense-approval/output/prd.md`
- `examples/expense-approval/output/prototype-review.html`
- `examples/expense-approval/output/test-cases.md`
- `examples/expense-approval/output/gherkin.feature`
- `examples/expense-approval/output/flow.mermaid`
- `examples/expense-approval/output/consistency-report.md`

## 冻结判断

当前版本具备进入验收冻结的条件。费用报销样例已经覆盖标准链路，合同审批样例已经覆盖通用 B 端规则生成器的真实试跑，并验证了金额阈值、多角色审批、退回修改、驳回后复制、角色数据权限和一致性检查。

## 后续执行计划

1. 新增一个真实 B 端试跑样例，优先选择合同审批、客户分层、权限配置或数据看板这类中等复杂度需求。
2. 使用同一 CLI 链路生成 `project-state.json` 和所有输出产物。
3. 检查该样例的原型、PRD、评审标注、测试用例和一致性报告。
4. 若无阻断问题，将费用报销样例和真实 B 端样例作为 Golden Samples。
5. 后续只修复 A 类阻断问题和 C 类一致性问题，暂缓 LLM API、Web 前端、多人协作和数据库能力。

## 真实 B 端试跑结果

样例：`examples/contract-approval/input.md`

链路结果：

- `pm-html-skill generate --input examples/contract-approval/input.md`：通过
- `pm-html-skill validate --project examples/contract-approval/project-state.json`：通过
- `pm-html-skill render --project examples/contract-approval/project-state.json`：通过
- `pm-html-skill annotate --project examples/contract-approval/project-state.json`：通过
- `pm-html-skill check --project examples/contract-approval/project-state.json`：通过

关键交付物：

- `examples/contract-approval/project-state.json`
- `examples/contract-approval/output/index.html`
- `examples/contract-approval/output/prd.md`
- `examples/contract-approval/output/prototype-review.html`
- `examples/contract-approval/output/test-cases.md`
- `examples/contract-approval/output/gherkin.feature`
- `examples/contract-approval/output/flow.mermaid`
- `examples/contract-approval/output/consistency-report.md`

一致性检查结果：未发现一致性问题。

发现的问题：

- 已处理的 B 类质量问题：合同审批 PRD 和原型最初偏通用模板，未充分表达 50 万金额阈值、多角色审批差异、退回修改、驳回后复制为新合同、附件规则配置等关键业务规则。已增强通用 B 端结构化生成器，并重新生成合同审批样例。

处理建议：

- 当前已具备冻结候选条件。
- 冻结前建议人工打开 `examples/expense-approval/output/index.html`、`examples/expense-approval/output/prototype-review.html`、`examples/contract-approval/output/index.html` 和 `examples/contract-approval/output/prototype-review.html` 做视觉与标注核验。
- 下一轮不要扩大到 LLM API 或 Web 前端，优先把费用报销和合同审批作为 Golden Samples，并为后续客户分层、权限配置、数据看板补充样例。

## 增强后复验

本轮已增强通用 B 端生成器：

- 识别合同金额审批阈值，例如 50 万元。
- 识别销售主管、法务、财务等审批角色。
- 生成超过阈值和未超过阈值的审批路径。
- 生成退回修改、重新提交、驳回后复制为新合同等异常分支。
- 在列表、详情、审批面板、PRD、测试用例和流程图中表达当前审批节点、风险提示、附件和角色权限。
- 增加场景测试，防止合同审批重新退化为通用模板。

复验结果：

- `pnpm typecheck`：通过
- `pnpm test`：通过，17 个测试文件、50 个测试全部通过
- `pnpm build`：通过
- 合同审批 `generate / validate / render / annotate / check`：全部通过
- 合同审批一致性检查：未发现一致性问题

## 冻结 HTML 核验

人工核验清单见 `docs/manual-freeze-checklist.md`。

已完成自动 DOM 核验：

- `examples/expense-approval/output/index.html`：通过
- `examples/expense-approval/output/prototype-review.html`：通过
- `examples/contract-approval/output/index.html`：通过
- `examples/contract-approval/output/prototype-review.html`：通过

自动核验覆盖：

- HTML 可解析并包含 `html/body`。
- 关键业务文本存在。
- 关键 `data-page-id`、`data-action-id`、`data-field-id`、`data-annotation-id` 和 `data-review-target` 追踪属性存在。
- 评审原型包含 `PRD 标注` 面板。
- 未发现 `undefined`、`null`、`[object Object]` 等明显生成痕迹。

本轮修复：

- 费用报销干净原型的导出入口从 `导出` 调整为 `管理员导出`，避免干净原型无法直接体现导出权限归属。

## 问题分级

- A 类：系统跑不通、文件生成失败、HTML 打不开、Validator 误报导致流程中断。
- B 类：原型不像真实 B 端、PRD 表达弱、测试用例太泛。
- C 类：PRD 标注对不上组件、测试用例引用缺失、Traceability 断链。
- D 类：命令不顺手、README 不清楚、输出目录不符合使用习惯。

优先级：先修 A，再修 C，再修 B，最后修 D。
