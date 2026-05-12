# 校验规则

本文档定义融合版 Skill 的校验边界、错误格式、规则清单和验收方式。运行时单一事实来源仍是 `src/schemas/project-state.schema.ts` 与 `src/validators/*`，本文档用于让实现、测试、验收和后续维护保持一致。

## 目标

校验体系要保证三件事：

1. `ProjectState` 结构合法，可以被后续生成器、渲染器和补丁系统稳定消费。
2. 原型、PRD、测试用例、流程图、标注页之间的引用关系不断链。
3. 用户可见问题能用中文定位到具体实体、路径和修复方向。

校验不负责判断“业务方案是否最好”，也不负责替代人工评审。B 类质量问题可以通过样例、生成器和人工检查改善；A 类阻断问题和 C 类一致性问题必须由 validator 或 consistency checker 拦截。

## 命令边界

### `validate`

`validate` 面向结构合法性和局部引用正确性，入口是 `validateProjectFile(projectPath)`。

执行顺序：

1. 读取 `project-state.json`。
2. 执行 `validateSchema`。
3. 执行 `validateProjectState`。
4. 如果存在 `prototypeSpec`，执行 `validatePrototypeSpec`。
5. 如果存在 `htmlPrototype`，执行 `validateHtmlPrototype`。
6. 如果存在 `prototypeMeta`，执行 `validatePrototypeMeta`。
7. 如果存在 `flowSpec`，执行 `validateGraph`。
8. 如果存在 `testCaseSpec`，执行 `validateTestCoverage`。
9. 如果存在 `prototypeAnnotationSpec`，执行 `validatePrototypeAnnotation`。

返回规则：

- 只要存在 `severity = "error"`，`valid` 必须为 `false`。
- 只有 `warning` 或 `info` 时，`valid` 可以为 `true`。
- 所有 validator 必须返回统一 `ValidationResult`。
- 用户可见 `message`、`fixSuggestion` 必须使用中文。

### `check`

`check` 面向跨产物一致性，入口是 `checkProjectFile(projectPath)`。

执行规则：

1. 读取 `project-state.json`。
2. 执行 `runConsistencyCheck(state)`。
3. 将一致性问题写回 `/issues`。
4. 重新渲染 `consistency-report.md`。
5. 保存更新后的 `project-state.json`。

`check` 可以产生 `warning`。例如产物 `sourceHash` 过期时，不一定阻断流程，但必须提醒用户重新渲染。

## 统一结果格式

所有 validator 必须返回：

```ts
type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};
```

问题对象必须符合：

```ts
type ValidationIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  entityRef?: {
    entityType: EntityType;
    entityId: string;
  };
  path?: string;
  fixSuggestion?: string;
};
```

字段要求：

- `id`：稳定、可读、可追踪。建议格式为 `issue_<rule>_<entityId>`。
- `severity`：阻断问题使用 `error`；不阻断但影响质量或可维护性的问题使用 `warning`；提示性信息使用 `info`。
- `code`：机器可读错误码，必须稳定，测试和报告可以依赖它。
- `message`：用户可见中文说明，必须包含具体对象名称或 ID。
- `entityRef`：能定位到业务实体时必须填写。
- `path`：能定位到 JSON 路径时应填写，以 `/` 开头。
- `fixSuggestion`：跨产物一致性问题应填写中文修复建议。

## 严重级别

`error` 用于阻断继续验收的问题：

- schema 不合法。
- 必填基础字段缺失。
- 引用了不存在的页面、操作、权限、角色、状态、PRD 章节或 DOM 节点。
- P0 核心操作缺少测试用例覆盖。
- HTML 缺少可追踪页面容器。
- PrototypeMeta selector 不能唯一命中 DOM。

`warning` 用于不阻断但需要处理的问题：

- 页面缺少 `sourceRefs`。
- P0 操作缺少显式权限规则。
- 权限规则缺少对应测试覆盖。
- ArtifactManifest 中产物的 `sourceHash` 与当前状态不一致。

`info` 预留给后续提示类检查。当前实现不依赖 `info`。

## EntityCollection 规则

适用于所有 `{ byId, order }` 结构。

规则：

- `order` 中每个 ID 必须存在于 `byId`。
- `byId` 中每个实体都必须出现在 `order`。
- `byId` 的 key 必须等于实体自身的 `id`。
- `order` 负责渲染顺序，`byId` 负责引用定位，二者不能漂移。

错误码：

- `entity_collection_order_missing_by_id`
- `entity_collection_id_mismatch`
- `entity_collection_by_id_missing_order`

实现位置：`src/validators/entity-collection-validator.ts`。

## Schema 校验

`ProjectState` 必须通过 `projectStateSchema.safeParse`。

规则：

- 枚举值必须属于 schema 定义范围。
- 必填字段必须存在。
- `id` 类字段不能为空字符串。
- 数组、对象、布尔值、数字等基础类型必须匹配 schema。
- `ValidationIssue`、`ConsistencyIssue`、`ArtifactManifest` 等内部结构也必须满足 schema。

错误码：

- `schema_validation_failed`

实现位置：`src/validators/schema-validator.ts`。

## ProjectState 基础规则

规则：

- `schemaVersion` 不能为空。
- `version` 必须是非负整数。
- `dirtyArtifacts` 只能包含合法的结构化产物类型。

合法结构化产物类型：

- `requirementCard`
- `prototypeSpec`
- `htmlPrototype`
- `prototypeMeta`
- `flowSpec`
- `prdSpec`
- `testCaseSpec`
- `prototypeAnnotationSpec`
- `artifactManifest`
- `issues`

错误码：

- `missing_schema_version`
- `invalid_project_version`
- `invalid_dirty_artifact`

实现位置：`src/validators/project-state-validator.ts`。

## PrototypeSpec 规则

页面规则：

- 页面建议至少有一个 `sourceRefs`，否则返回 `warning`。
- 页面引用的 Feature 必须存在于 `requirementCard.features`。

操作规则：

- 操作的 `targetPageId` 如果存在，必须指向已有页面。
- 操作引用的 `permissionRuleIds` 必须存在于 `prototypeSpec.permissions`。
- P0 核心操作如果没有显式权限规则，返回 `warning`。

导航规则：

- 导航边的 `fromPageId` 与 `toPageId` 必须都指向已有页面。

权限规则：

- 权限规则引用的 `roleId` 必须存在于 `requirementCard.roles`。
- 当 `targetType = "action"` 时，`targetId` 必须指向已有操作。
- 同一 `roleId + targetType + targetId` 不能出现互相冲突的 `effect`。

错误码：

- `page_missing_source_refs`
- `page_unknown_feature_ref`
- `action_unknown_target_page`
- `action_unknown_permission_rule`
- `p0_action_missing_permission_rule`
- `navigation_invalid_page_ref`
- `permission_unknown_role`
- `permission_unknown_action`
- `permission_effect_conflict`

实现位置：`src/validators/prototype-spec-validator.ts`。

## HTMLPrototype 规则

基础规则：

- 必须存在 `type = "html"` 的 HTML 文件内容。
- HTML 中必须至少存在一个带 `data-page-id` 的页面容器。
- `data-page-id`、`data-module-id`、`data-action-id` 在同一 HTML 中必须唯一。

带 Meta 校验时的规则：

- `prototypeSpec.pages.order` 中每个页面都必须在 HTML 中有且仅有一个对应 `data-page-id`。
- `prototypeMeta` 中所有 page/module/field/action/uiState mapping 的 `domSelector` 都必须唯一命中一个 DOM 节点。

错误码：

- `missing_html_file`
- `missing_page_container`
- `duplicate_data_attribute`
- `missing_data_page_id`
- `mapping_selector_not_unique`

实现位置：`src/validators/html-prototype-validator.ts`。

## PrototypeMeta 规则

规则：

- 存在 `prototypeMeta`、`prototypeSpec`、`htmlPrototype` 时才执行完整检查。
- 每个 `prototypeSpec` 字段必须至少有一个 `mappingRole = "primary"` 的 DOM 映射。
- 每个 mapping 的 `dataValue` 必须等于 `entityId`。
- 每个 mapping 的 `domSelector` 必须唯一命中一个 DOM 节点。

错误码：

- `missing_html_file`
- `field_missing_primary_mapping`
- `mapping_data_value_mismatch`
- `mapping_selector_not_unique`

实现位置：`src/validators/prototype-meta-validator.ts`。

## FlowSpec 规则

状态机规则：

- `initialStateId` 必须指向状态机内已有状态。
- `terminalStateIds` 中每个状态都必须存在。
- 每条 transition 的 `fromStateId` 和 `toStateId` 必须存在。
- 如果存在 `prototypeSpec`，transition 的 `triggerActionId` 必须指向已有操作。

错误码：

- `missing_initial_state`
- `missing_terminal_state`
- `invalid_transition_ref`
- `invalid_action_transition_ref`

实现位置：`src/validators/graph-validator.ts`。

## TestCaseSpec 规则

规则：

- 如果同时存在 `prototypeSpec` 与 `testCaseSpec`，每个 P0 操作都必须被至少一个测试用例覆盖。
- 覆盖关系来自 `testCase.relatedActionIds`。

错误码：

- `p0_action_missing_test_case`

实现位置：`src/validators/test-coverage-checker.ts`。

## PrototypeAnnotationSpec 规则

规则：

- 如果存在 HTML，标注的 `domSelector` 必须至少命中一个 DOM 节点。
- 标注引用的 `prdSectionIds` 必须存在于 `prdSpec.sections`。
- `brokenLinks` 中的 `reason` 与 `fixSuggestion` 必须包含中文。

错误码：

- `annotation_selector_missing`
- `annotation_unknown_prd_section`
- `broken_link_message_not_chinese`

实现位置：`src/validators/prototype-annotation-validator.ts`。

## 一致性检查规则

一致性检查由 `runConsistencyCheck(state)` 执行，结果写入 `state.issues` 并渲染为 `output/consistency-report.md`。

### PrototypeSpec 与 HTML

规则：

- `prototypeSpec.pages.order` 中每个页面都必须出现在 HTML 的 `data-page-id` 中。

错误码：

- `prototype_page_missing_in_html`

### PRD 目标引用

规则：

- PRD section 的 `target` 如果存在，必须指向已有实体。
- 支持检查的实体包括 page、module、field、action、permission、state_transition、feature、acceptance_criterion。
- 未识别的实体类型默认放行，避免阻断未来扩展。

错误码：

- `prd_section_target_missing`

### 标注引用

规则：

- 标注引用的 PRD 章节必须存在。
- 标注 selector 必须能在 HTML 中找到对应节点。

错误码：

- `annotation_prd_section_missing`
- `annotation_selector_missing_in_html`

### 测试用例引用

规则：

- 测试用例引用的页面必须存在于 `prototypeSpec.pages`。
- 测试用例引用的操作必须存在于页面 actions。

错误码：

- `test_case_page_missing`
- `test_case_action_missing`

### 流程操作引用

规则：

- 流程 transition 的 `triggerActionId` 必须指向已有操作。

错误码：

- `flow_transition_action_missing`

### 权限测试覆盖

规则：

- 权限规则如果作用于 action，该 action 建议被测试用例覆盖。
- 该规则返回 `warning`，不直接阻断冻结。

错误码：

- `permission_without_test_case`

### ArtifactManifest 新鲜度

规则：

- 每个产物的 `sourceHash` 必须等于当前 `ProjectState` 源切片和 renderer version 计算出的 hash。
- 不一致时说明产物可能过期，应重新运行 `render`。
- 该规则返回 `warning`。

错误码：

- `artifact_source_hash_stale`

实现位置：`src/validators/consistency-checker.ts`。

## 冻结验收规则

正式冻结前必须执行：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm dev -- generate --input examples/expense-approval/input.md
pnpm dev -- validate --project examples/expense-approval/project-state.json
pnpm dev -- render all --project examples/expense-approval/project-state.json
pnpm dev -- annotate --project examples/expense-approval/project-state.json
pnpm dev -- check --project examples/expense-approval/project-state.json
```

必须确认以下产物存在：

- `examples/expense-approval/project-state.json`
- `examples/expense-approval/output/index.html`
- `examples/expense-approval/output/prd.md`
- `examples/expense-approval/output/prototype-review.html`
- `examples/expense-approval/output/test-cases.md`
- `examples/expense-approval/output/gherkin.feature`
- `examples/expense-approval/output/flow.mermaid`
- `examples/expense-approval/output/consistency-report.md`

冻结允许条件：

- `typecheck`、`test`、`build` 全部通过。
- `validate` 无 `error`。
- `check` 无 A 类阻断问题和 C 类一致性错误。
- 干净原型和评审原型都能打开。
- 评审原型包含 PRD 标注面板和可追踪标注。

冻结暂缓条件：

- HTML 打不开或缺少核心页面容器。
- `prototype-review.html` 缺少 PRD 标注面板。
- PRD、测试用例、原型、流程之间存在断链。
- P0 操作缺少测试覆盖。
- Validator 输出英文用户可见错误。

## 新增规则的实现要求

新增 validator 或新增规则时必须同步完成：

1. 在对应 validator 中返回统一 `ValidationResult`。
2. 使用稳定 `code`，不要复用语义不同的旧 code。
3. 用户可见 `message` 和 `fixSuggestion` 使用中文。
4. 能定位实体时填写 `entityRef`。
5. 能定位 JSON 位置时填写 `path`。
6. 为 `error` 规则补充单元测试或场景测试。
7. 如影响冻结标准，同步更新本文档和 `docs/acceptance-freeze.md`。

## 当前非目标

以下内容不由当前 validator 强制：

- 页面视觉是否足够精美。
- PRD 文案是否达到最终发布质量。
- 业务流程是否是唯一正确方案。
- 真实接口、数据库、权限系统是否已接入。
- LLM 输出质量评分。

这些问题通过 Golden Samples、人工冻结清单和后续生成器质量优化处理。
