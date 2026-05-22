# B 端产品经理高保真 HTML 原型驱动智能工作流内核（融合版）

将中文 B 端需求自动转化为**高保真 HTML 原型**、**结构化 PRD** 和**标注评审页**的闭环工具。所有产物从统一的 `ProjectState` 渲染生成，确保原型、PRD、测试用例、标注之间完全可追溯。

## 核心能力

| 能力 | 说明 |
|------|------|
| **需求结构化** | 自然语言需求 → RequirementCard + 复杂度评估（S/M/L）+ Backlog 持久化（MVP / 增强 / 优化 / 排除） |
| **高保真 HTML 原型** | 含页面、模块、字段、状态、角色差异的可交互原型；支持设计体系方案对比 |
| **结构化 PRD** | S 级 9 章节 / M 级 17 章节 / L 级 21 章节；L 级支持分章节确认 |
| **PRD 标注原型** | 原型上挂载标注编号，含侧边栏需求清单、激活路径导航、markdown 表格、需求层级分类 |
| **状态机** | 自动推断业务状态、流转路径、非法流转拦截 |
| **审批流** | 检测审批语义自动启用，含节点、角色、驳回/撤回规则 |
| **多角色审查** | 6 个 AI 专家角色 × 5 个审查关口，在生成前提供结构化反馈 |
| **自然语言编辑** | 通过自然语言指令生成变更提案并应用 |
| **一致性检查** | 原型 ↔ PRD ↔ 测试用例 ↔ 标注的闭环校验；失败按严重程度分级回退（info / warning / critical） |
| **原始资料处理** | 支持图片/Word/Excel/PDF/Markdown 输入，自动提取信息并检测 5 类冲突（数值 / 角色 / 流程 / 字段 / 规则） |
| **非功能需求检查** | 数据量、并发、安全合规、导入导出、消息通知等非功能场景自动识别并记录 |
| **需求冻结** | 项目已交付后变更需确认原因，变更记录自动归档 |

## 工作方式

默认面向产品经理对话推进（在 Trae IDE 中使用）：

```
需求输入 → 自动初始化 → 原始资料处理（如有）→ 对话澄清（如有）→ 功能清单 → 复杂度评估 → 设计体系确认 → 原型 → PRD → 标注 → 一致性检查 → 业务确认单（可选）→ 上线交付包（可选）
```

每个关键节点（功能清单、原型、PRD、标注）完成后暂停等待用户确认，不会自动越级推进。

CLI 用于本地复现、批量生成、校验和调试，不是普通用户的默认入口。

## 开发命令

```bash
pnpm install           # 安装依赖
pnpm typecheck         # 类型检查
pnpm test              # 运行全部测试
pnpm build             # 编译 TypeScript
```

## CLI 命令

```bash
pnpm dev -- --help                                    # 查看所有命令
pnpm dev -- generate --input <需求文件路径>             # 从需求生成全部产物
pnpm dev -- generate --input <路径> --review            # 带多角色审查生成
pnpm dev -- generate --input <路径> --review --strict   # 严格模式（critical 发现阻断生成）
pnpm dev -- validate --project <project-state.json>    # 校验项目状态
pnpm dev -- render all --project <project-state.json>  # 从状态重新渲染全部产物
pnpm dev -- annotate --project <project-state.json>    # 生成/更新标注原型
pnpm dev -- check --project <project-state.json>       # 执行一致性检查
pnpm dev -- review --project <路径> --stage <阶段>      # 独立执行多角色审查
pnpm dev -- propose --project <路径> --instruction <指令>  # 自然语言生成变更提案
pnpm dev -- apply-proposal --project <路径> --proposal <路径> # 应用变更提案
pnpm dev -- undo --project <路径> --change <变更ID>      # 回滚指定变更
pnpm dev -- serve [--project <路径>] [--host <地址>] [--port <端口>] # 启动本地 Web UI
```

### 生成模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `llm`（默认） | 调用 LLM 大模型 | 日常产品工作，质量最高 |
| `auto` | 优先 LLM，失败回退规则 | 兼顾质量和稳定性 |
| `rule` | 基于规则模板 | 仅用于测试、CI/CD |

### 审查阶段（`--stage` 参数）

| 阶段 | 审查关口 | 参与角色 |
|------|---------|---------|
| `input` | 原始输入审查 | 业务分析师、UX 设计师 |
| `requirements` | 需求结构审查 | 业务分析师、QA 工程师 |
| `prototype` | 原型结构审查 | UX 设计师、UI 设计师、技术架构师 |
| `html_testcase` | HTML 和测试用例审查 | UI 设计师、前端开发、QA 工程师 |
| `prd` | PRD 审查 | 业务分析师、技术架构师 |

## 多角色审查系统

在生成流水线中引入 6 个 AI 模拟专家角色，在每个生成步骤**之前**进行结构化审查，提供反馈引导下一步生成，避免返工。

### 6 个专家角色

| 角色 | 审查维度 |
|------|---------|
| **业务分析师** | 业务闭环、角色覆盖、审批逻辑、需求追溯 |
| **UX 设计师** | 信息架构、页面结构、导航流、操作路径 |
| **UI 设计师** | 组件选型、视觉层级、状态色彩、设计系统一致性 |
| **技术架构师** | 状态机完备性、权限模型、数据模型、扩展性 |
| **前端开发** | HTML 语义化、无障碍性、响应式设计、组件实现质量 |
| **QA 工程师** | 测试覆盖、边界值、异常流、权限测试 |

### 5 个审查关口

```
Gate 1（原始输入审查）     → 业务分析师 + UX 设计师
  ↓
Gate 2（需求结构审查）     → 业务分析师 + QA 工程师
  ↓
Gate 3（原型结构审查）     → UX 设计师 + UI 设计师 + 技术架构师
  ↓
Gate 4（HTML/测试审查）    → UI 设计师 + 前端开发 + QA 工程师
  ↓
Gate 5（PRD 审查）         → 业务分析师 + 技术架构师 + QA 工程师
```

审查结果分为三级：`critical`（必须修复）、`warning`（建议修复）、`suggestion`（优化建议）。`--strict` 模式下 `critical` 发现会阻断生成。

## 产物清单

### 主交付物

| 文件 | 说明 |
|------|------|
| `index.html` | 高保真 HTML 原型，浏览器直接打开 |
| `prd.md` | 结构化 PRD 文档 |
| `prototype-review.html` | 带标注编号的原型 |

### 支撑产物

| 文件 | 说明 |
|------|------|
| `project-state.json` | 单一事实源，所有产物的源头数据 |
| `prototype-spec.json` | 页面/模块/字段/动作/权限规格 |
| `prototype-meta.json` | DOM 与实体映射 |
| `prototype-annotations.json` | 标注映射数据 |
| `test-cases.md` | 手工测试用例 |
| `gherkin.feature` | BDD 验收场景 |
| `flow.mermaid` | 状态流转图 |
| `consistency-report.md` | 一致性检查报告 |
| `业务确认单.md` | 业务方签字确认单（可选） |
| `上线交付包.md` | 权限/字典配置清单、上线 Checklist、培训大纲（可选） |

## 项目结构

```
pm-html-pdt-fused/
├── src/
│   ├── agents/              # 15 个 LLM Agent（每种产物一个）
│   ├── cli/                 # CLI 命令定义
│   ├── generators/          # 规则生成器 + 领域模板
│   ├── llm/                 # LLM Provider（OpenAI / Ollama / Mock）
│   ├── nl-edit/             # 自然语言编辑（PatchProposal）
│   ├── renderers/           # 产物渲染器（HTML / Markdown / Mermaid / Gherkin）
│   ├── reviews/             # 多角色审查系统（6 角色 × 5 关口）
│   ├── schemas/             # Zod 校验 Schema
│   ├── server/              # 本地 Web UI 服务
│   ├── state/               # ProjectState 管理 + JSON Patch
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   ├── validators/          # 校验器（一致性、图、HTML、规格）
│   └── workflow/            # 工作流管道（生成/渲染/标注/检查/回滚）
├── prompts/                 # 16 个 Prompt 文件（7 生成 + 6 审查 + 3 支撑）
├── examples/                # 示例项目及生成产物
├── references/              # 参考文档、业务规则、PRD 模板
├── tests/                   # 测试（23 个测试文件）
├── bin/                     # CLI 入口
├── web/                     # Web UI 前端
└── docs/                    # 文档
```

## 技术栈

- **语言**：TypeScript 5.x
- **运行时**：Node.js >= 20
- **包管理**：pnpm 10
- **CLI**：Commander.js
- **校验**：Zod
- **HTML 解析**：Cheerio
- **JSON Patch**：fast-json-patch (RFC 6902)
- **ID 生成**：nanoid
- **测试**：Vitest

## LLM Provider

| Provider | 说明 |
|----------|------|
| `openai` | OpenAI 兼容接口（默认） |
| `ollama` | 本地 Ollama 模型 |
| `mock` | 测试用 Mock（自动返回结构化数据） |

## 示例项目

- **`examples/expense-approval/`** — 费用报销审批管理（专用模板）
- **`examples/contract-approval/`** — 合同审批管理（通用生成器）

每个示例包含完整的 `input.md`、`project-state.json` 和 `output/` 目录下的全部产物。

## 参考文档

- [references/conversation-core.md](references/conversation-core.md) — 对话工作流（核心规则）
- [references/conversation-modes.md](references/conversation-modes.md) — 入口模式（变更/配置/Bug/迁移/对接/恢复）
- [references/delivery-loop.md](references/delivery-loop.md) — 交付闭环
- [references/b2b-product-rules.md](references/b2b-product-rules.md) — B 端产品规则
- [references/quality-checks.md](references/quality-checks.md) — 质量标准
- [references/self-review.md](references/self-review.md) — 自审清单

## 使用方式

详见 [SKILL.md](SKILL.md)（技能定义）和 [使用手册.md](docs/使用手册.md)（完整实战教程）。
