# 工资计费系统 — 全流程测试问题日志

> 测试时间：2026-05-10
> 引擎版本：b2b-pm-html-prototype-skill@0.1.0
> 运行模式：rule（无 LLM API key）
> Node：v24.14.0 / pnpm：10.31.0
> 项目目录：`salary-billing/`

---

## 流程总览

| 步骤 | 命令 | 退出码 | 状态 |
|------|------|--------|------|
| init | `init --name salary-billing` | 0 | ✅ 成功 |
| generate | `generate --input salary-billing/input.md --mode rule` | 0 | ✅ 成功（第3次，前2次失败） |
| validate | `validate --project salary-billing/project-state.json` | 0 | ✅ 通过 |
| render | `render all --project salary-billing/project-state.json` | 0 | ✅ 成功 |
| annotate | `annotate --project salary-billing/project-state.json` | 0 | ✅ 成功 |
| check | `check --project salary-billing/project-state.json` | 0 | ✅ 通过（有1个warning） |
| review input | `review --stage input` | 0 | ✅ 通过（mock） |
| review requirements | `review --stage requirements` | 0 | ✅ 通过（mock） |
| review prototype | `review --stage prototype` | 0 | ✅ 通过（mock） |
| review html_testcase | `review --stage html_testcase` | 0 | ✅ 通过（mock） |
| review prd | `review --stage prd` | 0 | ✅ 通过（mock） |

---

## 卡点与问题

### Issue #1 [CRITICAL] — Domain Template 角色 ID 与权限规则不匹配

**影响**: generate 命令直接失败，exit code 1

**现象**: 当输入文本匹配到某个领域模板（如 HR 请假模板）时，`createGenericB2BProjectState` 会使用领域模板的角色 ID（如 `role_employee`、`role_direct_leader`、`role_hr`），但权限规则和状态流转仍引用通用角色 ID（如 `role_operator`、`role_manager`）。校验器检测到不一致后报错。

**根因**: `src/generators/generic-b2b-state.ts` 中，`buildDomainRoles()` 替换了角色集合，但权限规则（line 298-316）和状态流转（line 364-417）仍然硬编码通用角色 ID。

**复现方式**: 在 input.md 中包含 HR 领域关键词（如"人事"、"HR"、"加班"、"入职"等），运行 `generate --mode rule`。

**绕过方式**: 修改输入文本，避免任何领域关键词匹配。

**建议修复**: 权限规则和状态流转中的角色 ID 应动态引用 `requirementCard.roles` 中的实际 ID，而非硬编码。

---

### Issue #2 [CRITICAL] — 领域关键词子串匹配误触发

**影响**: 导致 Issue #1 被触发，generate 失败

**现象**: 输入文本"录入职员"中，"录**入职**员"跨越词边界匹配了"入职"关键词，触发 HR 领域模板。匹配逻辑使用 `String.includes()` 做子串匹配，不考虑词边界。

**根因**: `src/generators/domains/registry.ts` 中 `matchDomain()` 使用 `normalized.includes(kw)` 进行子串匹配，不进行分词或词边界检查。

**复现方式**: 在输入中使用"录入职员"、"转入职级"等包含领域关键词子串的表达。

**绕过方式**: 避免使用可能跨越词边界形成领域关键词的表达（如用"填写职员"替代"录入职员"）。

**建议修复**: 使用分词库（如 `jieba` 的 JS 版本）进行词级别匹配，或至少在关键词周围添加词边界断言。

---

### Issue #3 [WARNING] — 领域模板 `matchDomain` 无置信度过滤

**影响**: 即使只有一个低置信度关键词匹配，也会触发领域模板替换

**现象**: `matchDomain()` 返回 `{ confidence: "low", matchedKeywords: ["入职"] }`，但 `createGenericB2BProjectState` 不检查置信度就使用了领域模板。

**根因**: `src/generators/generic-b2b-state.ts` line 131: `const domainMatch = matchDomain(normalized)` 直接使用结果，不区分 high/medium/low。

**建议修复**: 仅在 `confidence !== "low"` 时使用领域模板，低置信度匹配应降级为通用模板。

---

### Issue #4 [WARNING] — 产物内容高度泛化，未反映具体业务领域

**影响**: 产物可用性低，需大量人工修改

**现象**:
- PRD 标题为"总经理额外审批系统 PRD"，内容全部使用"业务单据"而非"工资单"
- Gherkin 文件头部写"费用报销审批"（来自模板残留）
- 测试用例中引用"销售主管"（来自合同审批模板）
- HTML 原型标题为"总经理额外审批系统原型"
- 状态机只有 4 个状态（draft→pending_approval→completed/rejected/withdrawn），缺少需求中要求的"总经理额外审批"分支

**根因**: rule 模式使用 `createGenericB2BProjectState()` 做模板扩展，不理解具体业务语义。推断出的 `businessObject` 为"业务单据"而非"工资单"，`projectName` 为"总经理额外审批系统"而非"工资计费系统"。

**建议修复**: 改进 `inferBusinessObject()` 和 `inferProjectName()` 的推断逻辑，或在 rule 模式中也引入基本的 NLP 理解。

---

### Issue #5 [WARNING] — PRD 重复章节

**影响**: PRD 质量下降

**现象**: PRD.md 中"业务单据详情页"和"详情页展示业务单据基本信息、状态和操作记录"两个 section 内容完全相同。

**根因**: `src/generators/prd-generator.ts` 在生成章节时对 detail 页面重复生成了同名 section。

---

### Issue #6 [WARNING] — complexityAssessment 未生成

**影响**: PRD 级别不确定

**现象**: `project-state.json` 中 `complexityAssessment` 为 `undefined`，但 PRD 标注为"M 级功能版"。rule 模式的 `buildRuleSteps()` 不包含 `complexityAssessor` 步骤。

**根因**: `src/workflow/generation-pipeline.ts` line 168-182 的 `buildRuleSteps()` 列表中没有 `runComplexityAssessorAgent`。

---

### Issue #7 [WARNING] — testSuites 未生成

**影响**: project-state.json 中 `testCaseSpec.suites` 为 undefined

**现象**: 虽然 `test-cases.md` 文件被生成，但 `testCaseSpec.suites` 字段为 undefined，说明测试用例是从其他数据源渲染的，而非存储在结构化状态中。

---

### Issue #8 [OBSERVATION] — lifecycleStatus 始终为 "draft"

**影响**: 无法通过状态追踪生成进度

**现象**: generate 完成后 `lifecycleStatus` 仍为 "draft"，未更新为 "annotated_ready" 或其他进度状态。

---

### Issue #9 [OBSERVATION] — review 使用 mock provider 自动通过

**影响**: 无 LLM API key 时审查无实质价值

**现象**: 所有 review 阶段都输出 "Mock xxx 审查通过，未发现明显问题"，不提供真实的审查意见。

---

### Issue #10 [OBSERVATION] — consistency-report 在 render 后产生 stale 警告

**影响**: check 命令报告一个 warning

**现象**: generate → render → check 流程中，check 报告 `prd.md` 的 sourceHash 与当前 ProjectState 不一致。这是因为 render 重新渲染了文件，改变了 hash。

---

## 产出物清单

| 文件 | 大小 | 说明 |
|------|------|------|
| `project-state.json` | ~210KB | 项目状态（单一事实源） |
| `output/index.html` | 35KB | HTML 原型（Meridian 设计体系） |
| `output/prd.md` | 1.7KB | PRD 文档（M 级，14 章节） |
| `output/prototype-review.html` | 50KB | 标注原型 |
| `output/prototype-spec.json` | 31KB | 原型规格 |
| `output/prototype-meta.json` | 11KB | DOM 映射 |
| `output/prototype-annotations.json` | 9KB | 标注映射（6 个标注） |
| `output/test-cases.md` | 994B | 测试用例（6 个） |
| `output/gherkin.feature` | 1.1KB | BDD 场景（6 个） |
| `output/flow.mermaid` | 313B | 状态流转图（4 个状态） |
| `output/consistency-report.md` | 53B | 一致性报告（1 个 warning） |

---

## 改进建议（优先级排序）

1. **修复 Issue #1**: 权限规则和状态流转中的角色 ID 必须动态引用，不能硬编码。这是阻断性 bug。
2. **修复 Issue #3**: `matchDomain()` 应有过滤低置信度匹配的机制。
3. **修复 Issue #2**: 领域关键词匹配应使用分词或词边界检查。
4. **改进 Issue #4**: rule 模式应更好地推断业务对象名称和项目名称。
5. **改进 Issue #6**: rule 模式应包含复杂度评估步骤。
6. **修复 Issue #5**: PRD 生成器应去重章节。
