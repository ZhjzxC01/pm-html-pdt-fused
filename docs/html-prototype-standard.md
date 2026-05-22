# HTML 原型标准

首轮 HTML 原型标准以后续 `HTMLPrototypeValidator` 和 `PrototypeMetaValidator` 实现为准。

## 设计体系

HTML 原型遵循项目动态生成的设计体系，通过 `scripts/design-search/search.py --design-system` 基于产品类型和行业自动推荐。

### 设计 Token

所有视觉属性通过 CSS 变量统一管理，Token 来源于项目 `<project>/design-system/MASTER.md`（由 search.py 生成并持久化）。Token 架构参考 `references/design-intelligence/token-architecture.md`（三层结构：Primitive → Semantic → Component）。

| 类别 | Token 前缀 | 示例 | 用途 |
|------|-----------|------|------|
| Colors | `--color-` | `--color-primary: #0F172A` | 色彩角色 |
| Font | `--font-` | `--font-heading` | 字体族 |
| Spacing | `--spacing-` | `--spacing-base: 16px` | 间距尺度 |
| Radius | `--radius-` | `--radius-lg: 12px` | 圆角尺度 |
| Shadow | `--shadow-` | `--shadow-md` | 阴影层级 |

### 注入机制

设计体系通过两层注入生效：

1. **Prompt 层**：`prompts/html-prototype-generator.md` 包含 CSS 变量声明规范，指导 LLM 生成符合项目设计体系的 HTML。
2. **渲染层**：`src/generators/html-prototype-generator.ts` 中的 `buildDesignSystemCSS()` 函数在 HTML 注入交互引擎时，同步注入 CSS 设计系统。

### 设计体系生成

```bash
python3 scripts/design-search/search.py "<产品类型> <行业> <关键词>" --design-system -f markdown [-p "Project Name"] --persist
```

生成的设计体系包含：风格推荐、配色方案（语义化色彩角色）、字体方案、间距/圆角/阴影 Token、组件规范、反模式警告和 Pre-Delivery Checklist。

### 组件规范

组件规格参考 `references/design-intelligence/component-specs.md`，包含 Button、Input、Card、Badge、Alert、Dialog、Table 的详细规格（变体、尺寸、状态、解剖图）。

### 布局

- 经典 B 端三栏布局：侧边栏 (240px) + 顶栏 (56px) + 内容区
- 4px 基础间距网格
- 内容区最大宽度 1280px
