---
name: pm-html-pdt-fused
version: 2.1.0
description: 用户要求写 PRD、产品需求、功能清单、B 端原型、高保真 HTML 原型、页面标注、PRD 标注原型、根据原型生成 PRD、根据需求生成原型、检查 PRD 与原型一致性、设计体系生成、品牌设计、Logo/Icon、演示文稿、Banner 设计时使用。支持消费 biz-analysis 的 analysis-data.json 自动生成全交互原型和深度 PRD。
metadata:
  short-description: B 端 PRD / 原型 / 标注 / 设计智能闭环
---

# 融合版 B 端产品经理闭环技能（含设计智能）

这是一个融合版产品经理闭环技能：保留 TypeScript 工程的 `ProjectState`、校验器、渲染器和测试体系，同时吸收 UI/UX Pro Max 的设计智能引擎（BM25 搜索、161 色板、57 字体、67 风格、99 UX 规则、设计体系生成器）和全套设计资产能力（品牌、Logo、Icon、演示文稿、Banner）。

## 默认行为

1. 默认以对话驱动，不把 CLI 当成普通用户的主入口。
2. 一次只推进一个节点；完成 `功能清单`、原型、`PRD`、标注后都要停下，等待用户确认。
3. 新项目少追问；只有缺失信息会阻塞当前节点时才补问。
4. 主交付物只强调三类：产品原型、`PRD`、`PRD` 标注原型。
5. 测试用例、流程图、一致性报告、`prototype-meta` 和 `project-state.json` 是质量支撑产物，不抢主线。
6. 状态机默认必做；审批流只在需求出现审批、审核、流转、驳回、撤回等语义时启用。
7. 生成或修改任何产物时，优先维护 `ProjectState` 的实体、引用、版本和产物清单，再渲染输出文件。
8. 首次收到用户需求时，自动从需求中推断项目目录名（英文短横线命名，如 `contract-approval`），在当前工作目录下创建 `<project-name>/`、`<project-name>/output/` 和 `<project-name>/raw-materials/` 目录，生成空的 `<project-name>/input.md`（写入用户原始需求）和 `<project-name>/project-state.json`（空状态），无需用户手动准备目录。如果推断的目录已存在，直接复用，不覆盖已有文件。初始化目录后，询问用户本次项目的审查模式，写入 `<project-name>/project-config.json`：
   - **none**（默认）：不启用多角色审查，直接生成。
   - **review**：启用 6 角色审查，发现问题仅提醒，不阻断生成。
   - **strict**：启用 6 角色审查，发现 critical 问题时阻断生成。
   用户选择后，后续所有 generate 调用自动读取该配置，无需重复指定。如果用户未明确选择，默认使用 `none`。
9. 如果用户提供了参考资料（聊天截图、Word、Excel、PDF、Markdown 等），将其保存到 `<project-name>/raw-materials/` 目录，然后逐份读取并提取关键业务信息（角色、流程、规则、字段、阈值等），整理成结构化摘要后向用户确认，再进入功能清单。支持的文件类型：`.png`/`.jpg`/`.jpeg`/`.gif`/`.webp`（图片，由 AI 视觉识别）、`.docx`/`.doc`（Word）、`.xlsx`/`.xls`（Excel）、`.pdf`、`.md`/`.txt`（纯文本）。如果用户在对话中直接粘贴了截图或附件，也视为原始资料，保存到 `raw-materials/` 后同样处理。如果 `raw-materials/` 中包含 `analysis-data.json`（来自 biz-analysis 产出），自动识别并走结构化映射路径：读取 `references/analysis-data-mapping.md`，按照映射规则将 analysis-data.json 中的结构化数据直接映射到 ProjectState 的 requirementCard、prototypeSpec、flowSpec 和 prdSpec 字段，而不是作为普通文本提取信息。映射完成后向用户展示映射摘要（实体→字段数量、状态机→转换数量、功能→页面数量），等待用户确认。

### HARD-GATE 硬门控机制

在以下四个关键节点，必须等待用户明确确认后才能继续，不可跳过或自动推进：

<HARD-GATE>
**功能清单节点**：完成功能清单后，必须停下等待用户确认。用户确认前，不得开始生成原型。
</HARD-GATE>

<HARD-GATE>
**原型节点**：完成原型后，必须停下等待用户确认。用户确认前，不得开始生成 PRD。
</HARD-GATE>

<HARD-GATE>
**PRD 节点**：完成 PRD 后，必须停下等待用户确认。用户确认前，不得开始标注原型。
</HARD-GATE>

<HARD-GATE>
**标注节点**：完成标注后，必须停下等待用户确认。用户确认前，不得开始一致性检查。
</HARD-GATE>

违反 HARD-GATE 的行为包括：
- 自动跳过确认步骤
- 在用户未回复时继续生成下一节点产物
- 假设用户会同意而提前准备后续内容
- 用"如果您没有意见，我将继续..."等话术规避确认

## 工作流

默认闭环：

1. 自动初始化项目目录（从需求推断目录名，创建目录、`input.md`、`raw-materials/` 和空 `project-state.json`）
2. 原始资料处理（如有）：读取 `raw-materials/` 中的文件，提取关键信息，整理摘要并确认
3. 对话澄清（如有）：基于原始资料和需求文本，补问缺失的关键信息
4. 需求整理与功能清单
5. 复杂度评估：自动评估需求级别（S/M/L），向用户展示评估结果并等待确认
6. 设计体系确认 + 生成业务原型
   - 6a. 基于产品类型和行业，调用 `python3 scripts/design-search/search.py "<产品类型> <行业> <关键词>" --design-system -f markdown` 自动生成设计体系（风格、配色、字体、组件规范）
   - 6b. 向用户展示 2-3 个风格方案对比（每个方案含：风格名、配色方向、适用场景、参考产品），标注推荐方案及推荐理由，等待用户选择
   - 6c. 确认后将设计体系写入 `<project>/design-system/MASTER.md`
   - 6d. 基于确认的设计体系生成 HTML 原型（S 级只生成核心页面原型，M 级生成完整模块原型，L 级生成全量页面原型）
7. 设计资产扩展（可选）：如果用户需要品牌设计、Logo、Icon、演示文稿、Banner 等，在此步骤按需调用对应脚本生成
8. 根据确认的级别和原型生成 `PRD`（S 级 9 章节 / M 级 17 章节 / L 级 21 章节）
9. 根据 `PRD` 反向标注原型
10. 执行一致性检查 + UX 质量审查（参考 `references/ux-quality-rules.md`）；必要时补充测试用例和流程图
11. 业务确认单（可选）：面向业务方，非技术语言
12. 上线交付包（可选）：权限配置清单、字典配置清单、上线 Checklist、培训大纲

默认使用 LLM 大模型模式生成原型和 PRD。`rule` 模式仅用于内部测试、CI/CD 打通等必要场景，不建议用于正式产品交付。

### 多角色审查（可选）

生成流水线支持 `--review` 选项启用多角色审查。6 个 AI 专家角色（业务分析师、UX 设计师、UI 设计师、技术架构师、前端开发、QA 工程师）在 5 个审查关口对中间产物进行结构化审查，提供 guidance 引导下一步生成。

审查关口：

- **Gate 1 原始输入审查**：业务分析师 + UX 设计师，审查用户原始需求
- **Gate 2 需求结构审查**：业务分析师 + 技术架构师 + QA 工程师，审查结构化需求、状态机和复杂度评估
- **Gate 3 原型结构审查**：业务分析师 + UX 设计师 + UI 设计师 + 技术架构师，审查需求覆盖、原型规格和流程规格
- **Gate 4 HTML 和测试用例审查**：UI 设计师 + 前端开发 + QA 工程师，审查 HTML 原型和测试用例（UI 设计师审查时参考 `references/ux-quality-rules.md` 中的 UX 质量标准和项目设计体系）
- **Gate 5 PRD 审查**：业务分析师 + 技术架构师 + QA 工程师，审查 PRD 追溯完整性、技术约束和验收标准可测试性

审查发现分三级：`critical`（必须修复）、`warning`（建议修复）、`suggestion`（优化建议）。`--strict` 模式下 `critical` 发现阻断生成。

审查推荐场景：L 级需求建议开启全部 5 个关口；M 级需求建议仅开启 Gate 1 + Gate 5；S 级需求通常不需要开启。

## 阶段规则（按需读取）

以下文件仅在执行到对应阶段时读取，不要在启动时预加载：

| 阶段 | 文件 | 触发时机 |
|------|------|----------|
| 对话与模式 | `references/conversation-core.md` | 需要理解对话推进规则、自动初始化、澄清规则、增量修改时 |
| 入口模式 | `references/conversation-modes.md` | 需要变更模式、配置变更、Bug修复、数据迁移、系统对接、跳步、恢复等非默认流程时 |
| 交付闭环 | `references/delivery-loop.md` | 需要确认主交付物、支撑产物边界、业务确认单或上线交付包时 |
| 设计体系生成 | `scripts/design-search/search.py` | 步骤 5a 自动生成设计体系时 |
| Token 架构 | `references/design-intelligence/token-architecture.md` | 需要理解三层 Token 架构（Primitive→Semantic→Component）时 |
| 组件规格 | `references/design-intelligence/component-specs.md` | 生成原型的组件样式时 |
| UX 质量规则 | `references/ux-quality-rules.md` | Gate 4 审查或原型自查时 |
| 品牌设计 | `references/design-intelligence/brand/` | 用户需要品牌相关设计（品牌指南、语音、视觉身份）时 |
| 演示文稿 | `references/design-intelligence/design/slides-*.md` | 用户需要生成 HTML 演示文稿时 |
| Banner 设计 | `references/design-intelligence/banner/` | 用户需要 Banner 创意设计时 |
| Logo/Icon 设计 | `references/design-intelligence/design/` | 用户需要 Logo 或 Icon 设计时 |
| B 端业务规则 | `references/b2b-product-rules.md` | 需要主数据管理、数据权限、批量操作、操作日志、编码规则、报表、导入导出等 B 端通用规则时 |
| B 端页面模式 | `references/b2b-page-patterns.md` | 生成原型时需要选择页面模式（列表/看板/树形/多Tab/步骤表单等）时 |
| B 端异常场景 | `references/b2b-exception-scenarios.md` | 生成 PRD 或原型时需要覆盖异常场景时 |
| B 端交互模式 | `references/b2b-interaction-patterns.md` | 生成原型时需要选择交互模式（行内编辑/级联选择/搜索防抖等）时 |
| PRD S 级模板 | `references/prd-templates/s-lightweight-card.md` | 生成 S 级轻量需求卡时 |
| PRD M 级模板 | `references/prd-templates/m-feature-prd.md` | 生成 M 级功能版 PRD 时 |
| PRD L 级模板 | `references/prd-templates/l-enterprise-prd.md` | 生成 L 级完整版 B 端 PRD 时 |
| 质量校验 | `references/quality-checks.md` | 执行一致性检查或质量校验时 |
| 自查清单 | `references/self-review.md` | 交付前自查时 |
| 原始资料映射 | `references/analysis-data-mapping.md` | 输入包含 biz-analysis 的 analysis-data.json 时，需要理解结构化映射规则时 |

## 对话模式 vs CLI 模式

| 场景 | 使用方式 |
|------|---------|
| 用户提出新需求，需要生成原型和 PRD | 对话模式，按工作流逐节点推进 |
| 用户说"帮我做个XX系统" | 对话模式，从自动初始化开始 |
| 用户说"帮我跑一下一致性检查" | CLI 模式 `pnpm dev -- check` |
| 用户说"重新渲染全部产物" | CLI 模式 `pnpm dev -- render all` |
| 用户说"帮我出一个变更提案" | CLI 模式 `pnpm dev -- propose` |
| 用户说"校验一下项目状态" | CLI 模式 `pnpm dev -- validate` |

CLI 命令参考：

```bash
pnpm install
pnpm dev -- --help
pnpm dev -- generate --input <需求文件路径>
pnpm dev -- generate --input <路径> --review
pnpm dev -- validate --project <project-state.json>
pnpm dev -- render all --project <project-state.json>
pnpm dev -- annotate --project <project-state.json>
pnpm dev -- check --project <project-state.json>
pnpm dev -- review --project <路径> --stage <阶段>
pnpm dev -- propose --project <路径> --instruction <指令>
pnpm dev -- serve --project <项目目录>
```

如果用户只是要产品分析或产物草稿，优先直接在对话中完成并写入合理文件；只有用户要求本地复现、批量生成、校验或调试时才展示 CLI。

## 参考示例

当生成产物时，如果不确定格式或质量标准，先读取 `examples/expense-approval/` 或 `examples/contract-approval/` 中的对应产物作为参考，然后生成当前项目的产物。

## 当前边界

1. 费用报销审批仍走专用模板。
2. 其他中文 B 端需求会走通用规则生成器，自动推断项目名、核心业务对象和审批流开关。
3. PRD 支持 S/M/L 三级模板：AI 自动评估需求复杂度并建议级别，用户确认后使用对应模板生成 PRD。
4. 当前通用生成器仍是保守模板，不等同于完整大模型需求理解；复杂行业字段、项目类型泛化和旧版模板迁移仍是后续增强任务。
5. biz-analysis 产出的 `analysis-data.json` 可作为原始资料自动消费——通过结构化映射将实体属性（含 frontendType）、交互模式（interactionPatterns）、页面布局（pageLayout）、状态机操作（uiAction）直接注入原型和 PRD 生成。
6. 原型要求全交互可用：每个页面必须有真实 JS 交互（Mock 数据驱动筛选/表单/Tab 切换），不允许纯静态 HTML 输出。
7. PRD 要求全功能深度覆盖：P0+P1 功能必须有完整 5 板块规格（基本信息、操作流程、字段级业务规则、异常场景、关联依赖），不能只有一行标题。

## Anti-Pattern 自查清单

每个节点交付前执行以下检查。违反任何一条都必须在交付前修复：

- [ ] **禁止跳步**：是否跳过了功能清单直接写原型或 PRD？（S 级也不例外）
- [ ] **禁止越级**：是否在用户未确认时就开始了下一个 HARD-GATE 节点？
- [ ] **禁止占位符**：产物中是否存在 TBD、TODO、待定、待补充、后续补充、暂不、略？
- [ ] **禁止半成品**：是否有 section 只有标题没有实质内容？（信息不足请标注"不适用"并说明原因）
- [ ] **禁止笼统描述**：是否有"添加适当的校验""处理边界情况"等无法执行的描述？
- [ ] **禁止互相替代**：PRD 中是否用"参见原型"代替了具体规则？原型中是否用"参见 PRD"代替了具体交互？
- [ ] **禁止过度假设**：是否在需求未提及的地方编造了业务规则而不是列入 pendingQuestions？
- [ ] **禁止过度设计（YAGNI）**：是否为假设的未来需求预留了接口、字段、扩展点？每个字段和功能必须有当前需求支撑，不能因为"将来可能需要"而添加。
- [ ] **禁止歧义遗漏**：是否有规则可被两种方式理解但未标记为 pendingQuestion？（参考 self-review.md 歧义扫描）
- [ ] **确认检查**：至少检查了核心业务对象、状态机终态、审批流开关、角色范围？
- [ ] **充分利用 biz 分析数据**：如果输入包含 analysis-data.json，是否通过结构化映射路径消费了其中的实体属性、交互模式、状态机和业务规则？（不能忽略结构化数据只当文本处理）

## 增量修改与回退机制

当用户在 HARD-GATE 确认后提出修改意见，或在后续节点发现上游产物有问题时，使用以下回退机制。

### 依赖关系图

```
功能清单 → 复杂度评估 → 原型 → PRD → 标注 → 一致性检查 → 业务确认单（可选） → 上线交付包（可选）
```

上游产物修改时，下游产物自动标记为 **dirty**（需重新生成）。

### 回退规则

1. **修改功能清单**：原型、PRD、标注、一致性检查全部 dirty，需按顺序重新生成。
2. **修改原型**：PRD、标注、一致性检查 dirty，需重新生成。功能清单不回退。
3. **修改 PRD**：标注、一致性检查 dirty，需重新生成。原型不回退。
4. **修改标注**：一致性检查 dirty，需重新执行。PRD 不回退。

### 回退执行方式

当用户提出修改意见时：

1. **识别影响范围**：告诉用户"修改 X 会导致以下产物需要重新生成：Y、Z"。
2. **等待确认**：询问用户是否接受回退范围，或只想修改当前产物（不自动重新生成下游）。
3. **执行修改**：修改指定产物后，自动重新生成所有 dirty 产物。
4. **跳过 HARD-GATE**：回退产生的重新生成不需要每个节点都等待用户确认，但最终产物（标注完成后）需要用户确认。

详细的增量修改对话示例见 `references/conversation-core.md`。

## 存档与恢复

### 存档退出

如果用户需要中断当前流程：

1. **保存当前状态**：所有已生成的产物保留在项目目录中，`project-state.json` 记录当前进度。
2. **记录断点**：在 `project-state.json` 的 `lifecycleStatus` 中记录当前节点。

`lifecycleStatus` 合法值：

| 值 | 含义 |
|----|------|
| `draft` | 刚初始化，尚未开始 |
| `feature_list_done` | 功能清单已确认 |
| `complexity_assessed` | 复杂度评估已确认 |
| `prototype_done` | 原型已确认 |
| `prd_done` | PRD 已确认 |
| `annotation_done` | 标注已确认 |
| `consistency_checked` | 一致性检查已完成 |
| `delivered` | 全部交付完成 |

### 恢复模式

**触发条件**（满足任一）：
- 用户说"继续上次的项目"或"继续 XX 项目"
- 用户进入一个已存在 `project-state.json` 且 `lifecycleStatus` 非 `draft` 的项目目录
- 用户提到一个当前工作目录下已存在的项目名

**恢复流程**：
1. 读取 `<project>/project-state.json`
2. 向用户展示进度摘要：当前 `lifecycleStatus`、已完成的产物清单、上次修改时间
3. 从断点继续：跳过已完成并确认过的 HARD-GATE 节点
4. 如果有 dirty 产物，提示用户是否需要先重新生成

## 入口模式

除默认的"从零新建"全流程外，skill 根据用户输入自动识别以下入口模式。详细流程见 `references/conversation-modes.md`。

| 模式 | 触发关键词 | 一句话说明 |
|------|-----------|-----------|
| 变更模式 | 修改、调整、增加XX节点、去掉、改为 | 已有项目的功能变更，只修改受影响的产物 |
| 配置变更模式 | 新增选项、修改阈值、调整权限、变更默认值 | 仅涉及枚举/阈值/权限的精简变更，不生成原型和 PRD |
| 需求接入模式 | 我已有 PRD、根据 PRD 生成原型、只需要测试用例 | 用户带着已有产物进入，从中间节点开始 |
| Bug 修复模式 | XX不对、XX报错、修复、fix | 生成 Bug 修复需求卡 + 影响评估 + 回归测试点 |
| 数据迁移模式 | 迁移、历史数据、批量导入、旧系统 | 生成字段映射 + 清洗规则 + 验证方案 + 回滚方案 |
| 系统对接模式 | 对接、同步、推送、集成、XX系统 | 生成接口方案 + 字段映射 + 异常处理 |
| 恢复模式 | 继续上次、继续XX项目 | 读取已有 project-state.json，从断点继续 |

## 生成失败处理

当生成过程中遇到异常时，按以下策略处理：

| 异常类型 | 处理方式 |
|----------|----------|
| Zod Schema 校验失败 | 向用户展示具体的校验错误字段，调整输入或手动修正后重试 |
| LLM 返回非 JSON 格式 | 尝试从返回文本中提取 JSON 块重新解析；失败则降级到 rule 模式 |
| LLM 请求超时或网络错误 | 提示用户检查网络和 API Key，支持重试 |
| 产物渲染失败 | 检查 `project-state.json` 完整性，修复后重新渲染 |
| 一致性检查发现错误 | 如实报告错误清单，不得声称"通过"；定位到具体产物后修复 |
