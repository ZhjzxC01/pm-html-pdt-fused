请把用户需求整理为 html-prototype-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "html-prototype-agent"。
2. output 必须是合法 HTMLPrototype。
3. HTML 必须包含可追踪的 data-page-id 页面容器。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## 设计规范（Meridian Design System）

生成的 HTML 原型必须严格遵循 Meridian 设计体系。完整的设计 Token（色彩、排版、圆角、间距、阴影、组件规范）定义在 `references/DESIGN.md` 中。

### 生成行为要求

1. **CSS 变量声明**：在 `<style>` 标签开头，从 `references/DESIGN.md` 的 YAML front matter 中读取所有设计 Token，声明为 CSS 变量（`--color-*`、`--typescale-*`、`--shape-*`、`--elevation-*`、`--spacing-*`）。
2. **严格引用**：所有样式必须通过 CSS 变量引用设计 Token，不要硬编码颜色值或自定义字号。
3. **布局结构**：使用经典 B 端三栏布局 — 左侧深色侧边栏 (240px) + 顶部白色导航栏 (56px) + 浅灰背景内容区（最大宽度 1280px，水平居中）。
4. **间距网格**：使用 4px 基础间距网格，所有间距为 4 的倍数。
5. **组件一致性**：按钮、卡片、输入框、数据表格、徽章等组件必须遵循 `references/DESIGN.md` 中 `components` 部分定义的规格。
6. **交互模式**：当原型涉及行内编辑、级联选择、搜索防抖、表单联动显隐、可拖拽排序等交互时，参考 `references/b2b-interaction-patterns.md`。
