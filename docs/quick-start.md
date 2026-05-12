# 快速入门

> 10 分钟跑通一个完整项目，从需求输入到全套产物交付。

---

## 1. 环境准备

### 1.1 安装技能到 Trae IDE

技能已通过符号链接安装为全局技能：

```
~/.trae/skills/pm-html-pdt-fused → /路径/pm-html-pdt-fused/
```

在任意项目中打开 Trae IDE，该技能都会自动可用。

### 1.2 验证安装

在 Trae IDE 的 **Settings → Rules & Skills → Global** 中，应能看到 `pm-html-pdt-fused` 技能。

### 1.3 CLI 环境（可选）

```bash
cd "/路径/pm-html-pdt-fused"
pnpm install
pnpm typecheck
pnpm test
```

---

## 2. 你的第一个项目

### 第一步：输入需求

在 Trae IDE 的对话框中，用自然语言描述你的需求：

```
我要做一个合同审批管理功能，给销售、销售主管、法务、财务和管理员使用。
销售创建合同后提交审批，主管审批通过后到法务，法务审批通过后合同生效。
金额超过 50 万元的合同需要增加财务审批节点。
```

也可以同时拖入参考资料（截图、Word、Excel、PDF 等）。

### 第二步：等待自动初始化

技能会自动：
1. 推断项目目录名 → `contract-approval`
2. 创建项目目录、`output/`、`raw-materials/`
3. 写入 `input.md` 和空 `project-state.json`

你不需要手动创建任何目录。

### 第三步：逐步确认

技能按以下流程逐步推进，每步都会暂停等你确认：

```
功能清单 → 原型 → 复杂度评估 → PRD → 标注 → 一致性检查
```

- 确认无误 → 回复「确认」或「继续」
- 需要修改 → 直接指出，如「详情页需要增加操作记录模块」

### 第四步：查看产物

全部完成后，你的 `output/` 目录中会有：

| 文件 | 说明 | 查看方式 |
|------|------|----------|
| `index.html` | 高保真 HTML 原型 | 浏览器打开 |
| `prd.md` | 结构化 PRD | Markdown 编辑器 |
| `prototype-review.html` | 带标注的原型 | 浏览器打开 |

---

## 3. 常用对话模板

| 你想做什么 | 对话输入 |
|-----------|---------|
| 从零新建 | 「我要做一个XX管理功能」 |
| 修改已有功能 | 「合同审批流需要去掉法务节点」 |
| 简单配置变更 | 「费用类型下拉框新增团建费」 |
| 继续上次的项目 | 「继续合同审批项目」 |
| 只做一致性检查 | 「帮我检查 PRD 和原型的一致性」 |
| 根据 PRD 生成原型 | 「我已有 PRD，帮我生成原型」 |

---

## 4. 下一步

- 📖 完整工作流实战 → [workflow-guide.md](workflow-guide.md)
- 🔧 CLI 命令参考 → [cli-reference.md](cli-reference.md)
- ❓ 常见问题 → [troubleshooting.md](troubleshooting.md)
