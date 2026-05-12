# HTML 原型标准

首轮 HTML 原型标准以后续 `HTMLPrototypeValidator` 和 `PrototypeMetaValidator` 实现为准。

## 设计体系

HTML 原型严格遵循 [DESIGN.md](../references/DESIGN.md) 定义的 **Meridian** 设计体系，基于 Google 官方 [DESIGN.md 格式规范](https://github.com/google-labs-code/design.md)。

### 设计 Token

所有视觉属性通过 CSS 变量统一管理，Token 定义在 `references/DESIGN.md` 的 YAML front matter 中：

| 类别 | Token 前缀 | 示例 | 用途 |
|------|-----------|------|------|
| Colors | `--color-` | `--color-primary: #2563EB` | 色彩角色（26+ 角色） |
| Typography | `--typescale-` | `--typescale-body-md` | 排版比例尺（12 级） |
| Shape | `--shape-` | `--shape-lg: 12px` | 形状尺度（7 级） |
| Elevation | `--elevation-` | `--elevation-1` | 阴影层级（5 级） |
| Spacing | `--spacing-` | `--spacing-base: 16px` | 间距尺度（9 级） |

### 注入机制

设计体系通过两层注入生效：

1. **Prompt 层**：`prompts/html-prototype-generator.md` 包含完整的 CSS 变量声明和组件规范，指导 LLM 生成符合 Meridian 的 HTML。
2. **渲染层**：`src/generators/html-prototype-generator.ts` 中的 `buildDesignSystemCSS()` 函数在 HTML 注入交互引擎时，同步注入完整的 CSS 设计系统，覆盖 LLM 输出的基础样式。

### 色彩角色

| 角色 | 值 | 用途 |
|------|-----|------|
| Primary | `#2563EB` | 按钮、链接、选中态 |
| On Primary | `#FFFFFF` | 主色表面上的文字 |
| Primary Container | `#DBEAFE` | 低强调主色区域 |
| Secondary | `#0F172A` | 侧边栏、结构性元素 |
| Tertiary | `#0D9488` | 成功状态、辅助强调 |
| Error | `#DC2626` | 错误状态、危险操作 |
| Surface | `#FFFFFF` | 卡片、对话框背景 |
| On Surface | `#0F172A` | 主要文字 |
| On Surface Variant | `#64748B` | 次要文字 |
| Outline | `#94A3B8` | 边框 |
| Outline Variant | `#E2E8F0` | 分割线 |

### 组件规范

| 组件 | 类型 | 规范 |
|------|------|------|
| 按钮 | Primary / Secondary / Ghost / Danger | 圆角 8px，高度 38px，内边距 9px 20px |
| 卡片 | Card / Card Elevated | 圆角 12px，内边距 24px，Level 1 阴影 |
| 输入框 | Input Field | 高度 38px，圆角 8px，边框 #E2E8F0 |
| 表格 | Data Table | 表头 Label Medium，表体 Body Medium，行高 44px |
| 徽章 | Badge | 全圆角胶囊形 |
| 侧边栏 | Sidebar | 深海军蓝背景，宽度 240px |
| 顶部栏 | Topbar | 白色背景，高度 56px |

### 布局

- 经典 B 端三栏布局：侧边栏 (240px) + 顶栏 (56px) + 内容区
- 4px 基础间距网格
- 内容区最大宽度 1280px
- 页面背景 #F8FAFC，卡片背景 #FFFFFF
