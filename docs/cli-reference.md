# CLI 命令参考

> 普通产品工作中不需要手动使用 CLI，技能会在对话中自动完成所有操作。CLI 主要用于批量处理、调试和 CI/CD 集成。

---

## 全局选项

```bash
pnpm dev -- --help          # 查看所有可用命令
```

---

## 生成命令

```bash
# 从需求输入生成全部产物（默认 llm 模式）
pnpm dev -- generate --input <需求文件路径>

# 带多角色审查生成
pnpm dev -- generate --input <路径> --review

# 严格模式（critical 发现阻断生成）
pnpm dev -- generate --input <路径> --review --strict

# 指定生成模式
pnpm dev -- generate --input <路径> --mode llm     # LLM 模式（默认）
pnpm dev -- generate --input <路径> --mode auto    # LLM 不可用时回退规则
pnpm dev -- generate --input <路径> --mode rule    # 纯规则模式（仅测试）
```

---

## 校验命令

```bash
# 校验 project-state.json 完整性
pnpm dev -- validate --project <project-state.json 路径>
```

---

## 渲染命令

```bash
# 渲染全部产物
pnpm dev -- render all --project <project-state.json 路径>
```

---

## 标注命令

```bash
# 生成标注
pnpm dev -- annotate --project <project-state.json 路径>
```

---

## 一致性检查

```bash
# 执行一致性检查
pnpm dev -- check --project <project-state.json 路径>
```

---

## 审查命令

```bash
# 指定阶段审查
pnpm dev -- review --project <路径> --stage input          # 原始输入
pnpm dev -- review --project <路径> --stage requirements   # 需求结构
pnpm dev -- review --project <路径> --stage prototype      # 原型结构
pnpm dev -- review --project <路径> --stage html_testcase  # HTML + 测试用例
pnpm dev -- review --project <路径> --stage prd            # PRD
```

---

## 变更命令

```bash
# 生成变更提案
pnpm dev -- propose --project <路径> --instruction "添加合同变更记录模块"

# 应用提案
pnpm dev -- apply-proposal --project <路径> --proposal <提案文件>

# 回滚变更
pnpm dev -- undo --project <路径> --change <变更记录ID>
```

---

## Web UI

```bash
# 启动本地 Web UI（默认 127.0.0.1:4173）
pnpm dev -- serve --project <项目目录>

# 指定地址和端口
pnpm dev -- serve --project <目录> --host 0.0.0.0 --port 8080
```

---

## 生成模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `llm`（默认） | 调用 LLM 大模型生成 | 日常产品工作 |
| `auto` | 优先 LLM，失败回退规则 | 兼顾质量和稳定性 |
| `rule` | 基于规则模板生成 | 仅用于测试和 CI/CD |

## LLM Provider

| Provider | 说明 |
|----------|------|
| `openai` | OpenAI 兼容接口（默认） |
| `ollama` | 本地 Ollama 模型 |
| `mock` | 测试用 Mock |

---

## 开发与测试

```bash
pnpm install       # 安装依赖
pnpm typecheck     # TypeScript 类型检查
pnpm test          # 运行测试
```
