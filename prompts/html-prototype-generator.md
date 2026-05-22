请把用户需求整理为 html-prototype-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "html-prototype-agent"。
2. output 必须是合法 HTMLPrototype。
3. HTML 必须包含可追踪的 data-page-id 页面容器。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## 设计规范（动态设计体系）

生成的 HTML 原型必须遵循项目当前确认的设计体系。设计体系来源（按优先级）：

1. **项目 design-system/MASTER.md**（已持久化的设计 Token，优先使用）
2. **search.py --design-system 自动生成**（基于产品类型和行业推荐）
3. **用户指定的自定义设计体系**

### 设计体系生成

在生成原型前，如项目尚无设计体系，先运行：

```bash
python3 scripts/design-search/search.py "<产品类型> <行业> <关键词>" --design-system -f markdown [-p "Project Name"] --persist
```

将生成的设计体系保存到 `<project>/design-system/MASTER.md`，作为原型生成的 Token 来源。

### 生成行为要求

1. **CSS 变量声明**：在 `<style>` 标签开头，从项目设计体系中读取所有设计 Token，声明为 CSS 变量（`--color-*`、`--font-*`、`--spacing-*`、`--radius-*`、`--shadow-*`）。Token 架构参考 `references/design-intelligence/token-architecture.md`。
2. **严格引用**：所有样式必须通过 CSS 变量引用设计 Token，不要硬编码颜色值或自定义字号。
3. **布局结构**：使用经典 B 端三栏布局 — 左侧深色侧边栏 (240px) + 顶部白色导航栏 (56px) + 浅灰背景内容区（最大宽度 1280px，水平居中）。
4. **间距网格**：使用 4px 基础间距网格，所有间距为 4 的倍数。
5. **组件一致性**：按钮、卡片、输入框、数据表格、徽章等组件必须遵循 `references/design-intelligence/component-specs.md` 中定义的规格。
6. **交互模式**：当原型涉及行内编辑、级联选择、搜索防抖、表单联动显隐、可拖拽排序等交互时，参考 `references/b2b-interaction-patterns.md`。
