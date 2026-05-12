请把用户需求整理为 html-prototype-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "html-prototype-agent"。
2. output 必须是合法 HTMLPrototype。
3. HTML 必须包含可追踪的 data-page-id 页面容器。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## 设计规范（Meridian Design System）

生成的 HTML 原型必须严格遵循 Meridian 设计体系。所有样式写在 `<style>` 标签中，使用 CSS 变量引用设计 Token。设计 Token 定义在 `references/DESIGN.md` 的 YAML front matter 中，遵循 [DESIGN.md 格式规范](https://github.com/google-labs-code/design.md)。

### CSS 变量声明

在 `<style>` 标签开头声明以下 CSS 变量：

```css
:root {
  /* Colors */
  --color-primary: #2563EB;
  --color-on-primary: #FFFFFF;
  --color-primary-container: #DBEAFE;
  --color-on-primary-container: #1E3A5F;
  --color-secondary: #0F172A;
  --color-on-secondary: #FFFFFF;
  --color-secondary-container: #1E293B;
  --color-on-secondary-container: #CBD5E1;
  --color-tertiary: #0D9488;
  --color-on-tertiary: #FFFFFF;
  --color-tertiary-container: #CCFBF1;
  --color-on-tertiary-container: #134E4A;
  --color-error: #DC2626;
  --color-on-error: #FFFFFF;
  --color-error-container: #FEE2E2;
  --color-on-error-container: #7F1D1D;
  --color-surface: #FFFFFF;
  --color-on-surface: #0F172A;
  --color-surface-dim: #F8FAFC;
  --color-surface-container-low: #F8FAFC;
  --color-surface-container: #F1F5F9;
  --color-surface-container-high: #E2E8F0;
  --color-surface-container-highest: #CBD5E1;
  --color-on-surface-variant: #64748B;
  --color-outline: #94A3B8;
  --color-outline-variant: #E2E8F0;
  --color-inverse-surface: #1E293B;
  --color-inverse-on-surface: #F1F5F9;
  --color-inverse-primary: #93C5FD;
  --color-background: #F8FAFC;
  --color-on-background: #0F172A;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --typescale-display-lg: 700 48px/56px var(--font-family);
  --typescale-display-md: 700 36px/44px var(--font-family);
  --typescale-headline-lg: 600 30px/38px var(--font-family);
  --typescale-headline-md: 600 24px/32px var(--font-family);
  --typescale-title-lg: 600 20px/28px var(--font-family);
  --typescale-title-md: 600 16px/24px var(--font-family);
  --typescale-body-lg: 400 16px/26px var(--font-family);
  --typescale-body-md: 400 14px/22px var(--font-family);
  --typescale-body-sm: 400 13px/20px var(--font-family);
  --typescale-label-lg: 500 14px/20px var(--font-family);
  --typescale-label-md: 500 12px/16px var(--font-family);
  --typescale-label-sm: 500 11px/16px var(--font-family);

  /* Shape */
  --shape-none: 0;
  --shape-sm: 4px;
  --shape-default: 6px;
  --shape-md: 8px;
  --shape-lg: 12px;
  --shape-xl: 16px;
  --shape-full: 9999px;

  /* Elevation */
  --elevation-0: none;
  --elevation-1: 0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06);
  --elevation-2: 0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04);
  --elevation-3: 0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04);
  --elevation-4: 0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.04);

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-section: 40px;
}
```

### 布局规范

- 经典 B 端布局：左侧深色侧边栏 (240px) + 顶部白色导航栏 (56px) + 浅灰背景内容区。
- 内容区最大宽度 1280px，水平居中，两侧留白不少于 24px。
- 使用 4px 基础间距网格，所有间距为 4 的倍数。
- 卡片间距 16px，区块间距 24-40px。
- 页面背景使用 `--color-background` (#F8FAFC)，卡片使用 `--color-surface` (#FFFFFF)。

### 组件规范

- **按钮**: 四种类型 — Primary（蓝色实心）、Secondary（白底+边框）、Ghost（透明+蓝色文字）、Danger（红色实心）。所有按钮高度 38px，圆角 8px，内边距 9px 20px，字体 Label Large (14px/500)。
- **卡片**: 白色背景 + 12px 圆角 + Level 1 阴影，内边距 24px。悬停时阴影提升至 Level 2。
- **输入框**: 高度 38px，白色背景 + 浅灰边框 (#E2E8F0)，8px 圆角。聚焦时边框变为 Primary 蓝色 2px。标签使用 Label Medium (12px/500)。
- **数据表格**: 表头 Surface Container Low 背景 + Label Medium 字体，表体 Body Medium (14px/400)，行高 44px，行悬停背景 Surface Container Low，分割线 Outline Variant。
- **徽章**: 全圆角胶囊形，Primary Container 背景用于信息态，Tertiary Container 用于成功态，Error Container 用于错误态。
- **侧边栏**: 深海军蓝背景 (#0F172A)，宽度 240px，白色文字，选中项半透明白色背景。
- **顶部栏**: 白色背景，高度 56px，底部 1px 分割线 (#E2E8F0)，标题 Title Large (20px/600)。

### 色彩规范

- 严格使用设计 Token 中定义的色彩值，不要自定义颜色。
- 主色 #2563EB（蓝色），用于 Primary 按钮、链接、选中态。
- 文字颜色 On Surface #0F172A（深海军蓝，非纯黑），次要文字 On Surface Variant #64748B。
- 边框 Outline #94A3B8，分割线 Outline Variant #E2E8F0。
- 表面容器层级：Surface > Surface Container Low > Container > High > Highest。
- 阴影色统一使用 rgba(15,23,42,opacity) 而非纯黑。

### 排版规范

- 字体族：Inter，回退到系统字体。
- 使用 Meridian 排版比例尺，不要自定义字号。
- 不超过 3 种排版样式在同一视图中。
- 标题使用 Semi-Bold (600) 或 Bold (700)，正文使用 Regular (400)，标签使用 Medium (500)。
