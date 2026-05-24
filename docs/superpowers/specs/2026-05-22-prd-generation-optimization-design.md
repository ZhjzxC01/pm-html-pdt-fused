# PRD 生成阶段优化设计

日期：2026-05-22
状态：待实施

## 背景

PRD 生成系统由三层组成：模板（S/M/L）、提示词（LLM 引导）、渲染器（结构化数据→Markdown）。经审查发现 8 个不足，分为内容质量、流程交互、呈现三层问题。

## 不足清单

### 内容质量层
1. **无 PRD 专用校验器** — 10 个 validator 中无 PRD 专用。占位符、空 section、必要 section 缺失、内容过短无法自动检测。
2. **提示词示例不足** — 仅 field 和 state_transition 有 good/bad 示例。权限矩阵、验收标准、业务流程、部署配置无示例引导。
3. **跨 section 一致性无检查** — 角色在 role 和 permission 中是否一致、状态在 state_transition 和 field 中是否一致、验收点能否追溯到功能点。
4. **原型→PRD 覆盖度无追踪** — prototypeSpec 中的 module 是否都在 PRD 中有对应 section。

### 流程交互层
5. **渲染器过于简单** — 不区分嵌套层级、不渲染 metadata（assumptions/pendingQuestions/annotationNumber）、不生成目录、不展示复杂度评估因素。
6. **L 级分章节确认无代码强制** — 对话规则定义了分 3 批确认，但代码无分批机制。
7. **验收标准非结构化** — 存储为原始 markdown，无法机器解析，与 Gherkin 输出无桥梁。
8. **无变更历史** — PRD spec 没有 changeLog 字段。

## 优化设计

### 第一层：拦截层 — PRD 校验器

**新建文件**：`src/validators/prd-validator.ts`

#### 校验规则

| 检查项 | 级别 | 规则 |
|--------|------|------|
| 占位符检测 | error | 扫描所有 section.content，检测 TBD/TODO/待定/待补充/后续补充/暂不/略/添加适当的/处理边界/参考上述/同上/类似模块 |
| 空 section 检测 | error | content 为空或长度 < 20 字符 |
| 必要 section 缺失 | error | 根据 requirementLevel 检查 `getRequiredSectionTypes(level)` 中的 section 是否都存在 |
| 内容过短 | warning | required section 的 content 长度 < 100 字符 |
| 字段表完整性 | warning | type=field 的 section 包含表格时，检查是否有"字段标识""类型""必填""校验规则"列 |
| 状态机完整性 | warning | type=state_transition 的 section 包含表格时，检查是否有"当前状态""触发操作""目标状态""执行角色"列 |
| 权限矩阵完整性 | warning | type=permission 的 section 包含表格时，检查是否覆盖了 role section 中定义的所有角色 |
| 验收追溯 | info | type=acceptance 的 section 中的验收点是否能关联到 module section 中的功能点 |

#### 跨 section 一致性检查

| 检查项 | 级别 | 规则 |
|--------|------|------|
| 角色覆盖 | warning | role section 定义的角色列表 → 是否在 permission section 的矩阵中都出现 |
| 状态一致性 | warning | state_transition 中的状态枚举 → 是否在 field section 的状态字段枚举中一致 |
| 字段追溯 | info | module section 中提到的字段名 → 是否在 field section 的字段表中有定义 |

#### 原型→PRD 覆盖度

- 从 prototypeSpec 提取所有 page.module 的 id 和 title
- 对比 prdSpec 中 type=module 的 section 的 target 引用
- 未覆盖的 prototype module 报 warning

#### 输出

- 返回 `ValidationResult`，issues 合入 validation pipeline 的全局结果
- 输出 `output/prd-validation-report.md` 供人工审阅

#### 集成点

- 在 `validation-pipeline.ts` 的 `prdSpec` 存在时调用，复用已有的 `if (state.prdSpec)` 判断模式
- 复用 `getRequiredSectionTypes(level)` 从 `src/generators/prd-template-config.ts` 获取必要 section 列表
- 返回 `ValidationResult`，issues 自动合入全局 validation 结果，通过 dirty policy 传递给下游

---

### 第二层：生成层 — 提示词增强

**修改文件**：`prompts/prd-generator.md`

#### 新增 4 个 good/bad 示例

| 示例 | 覆盖 section | good 要点 | bad 典型问题 |
|------|-------------|-----------|-------------|
| 权限矩阵 | permission | 角色×功能×数据维度矩阵表 + 字段级权限说明 | "不同角色有不同权限" |
| 验收标准 | acceptance | 功能验收/异常验收/权限验收分组，每条有验证方式+预期结果 | "功能正常" |
| 业务流程 | flow | 主流程步骤表 + 异常流程分支表 + mermaid 流程图 | 一段文字描述 |
| 部署配置 | deployment | 字典配置清单表 + 权限配置表 + SQL 变更清单 + 定时任务 | "配置相关字典和权限" |

---

### 第三层：呈现层 — 渲染器增强

**修改文件**：`src/renderers/prd-markdown-renderer.ts`

#### 3.1 目录生成

读取 `prdSpec.toc`（已有字段），在文档头部生成 Markdown 目录，每项链接到对应 section heading。

#### 3.2 嵌套层级渲染

利用 `parentId` 字段区分父子 section：
- 父 section（parentId 为空）→ `##`（H2）
- 子 section（parentId 非空）→ `###`（H3）

替换当前 `sortOrder > 0 ? 2 : 1` 逻辑。

#### 3.3 Metadata 展示

每个 section 末尾追加元数据（如有）：
- `assumptions` → 引用块（`> **假设**：...`）
- `pendingQuestions` → 引用块（`> **待确认**：...`）
- `annotationNumber` → 标注编号（`> **标注**：#[N]`）

#### 3.4 复杂度评估摘要

在文档头部（现有 blockquote 区域）追加评估因素表：
```
> 复杂度评估：M 级
> 评估因素：页面数 5 个（中）| 角色 3 个（低）| 审批流 1 条（低）
```

---

## 实施顺序

| 序号 | 变更 | 文件 | 依赖 |
|------|------|------|------|
| 1 | PRD 校验器（占位符/空 section/必要 section/内容过短） | prd-validator.ts（新建） | 无 |
| 2 | 跨 section 一致性检查 | prd-validator.ts | #1 |
| 3 | 原型→PRD 覆盖度检查 | prd-validator.ts | #1 |
| 4 | 校验器集成到 pipeline | validation-pipeline.ts | #1 |
| 5 | 提示词新增 4 个示例 | prd-generator.md | 无 |
| 6 | 渲染器目录生成 | prd-markdown-renderer.ts | 无 |
| 7 | 渲染器嵌套层级 | prd-markdown-renderer.ts | 无 |
| 8 | 渲染器 metadata 展示 | prd-markdown-renderer.ts | 无 |
| 9 | 渲染器复杂度评估摘要 | prd-markdown-renderer.ts | 无 |

## 未覆盖项（留后续迭代）

- **L 级分章节确认代码化**：需要修改 agent runner 支持分批生成，改动较大，留后续。
- **验收标准结构化**：需要定义 PRD acceptance → Gherkin 的转换规则，留后续。
- **变更历史**：需要在 prdSpec schema 新增 changeLog 字段，留后续。
- **PRD 反哺原型**：PRD 生成后自动更新 prototypeSpec 中的业务规则，留后续。

## 验证方式

1. `pnpm typecheck` — 确认新增 validator 不破坏类型
2. `pnpm test` — 确认测试通过
3. 对现有示例项目运行 PRD 校验器，确认输出合理的校验报告
4. 人工审阅渲染器输出，确认目录、嵌套、metadata 正确
