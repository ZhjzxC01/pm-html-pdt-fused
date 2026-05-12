---
version: alpha
name: Meridian
description: 面向 B 端企业级应用的现代设计体系，融合深邃色调与精致层级，兼顾专业感与视觉美感。
colors:
  primary: "#2563EB"
  on-primary: "#FFFFFF"
  primary-container: "#DBEAFE"
  on-primary-container: "#1E3A5F"
  secondary: "#0F172A"
  on-secondary: "#FFFFFF"
  secondary-container: "#1E293B"
  on-secondary-container: "#CBD5E1"
  tertiary: "#0D9488"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#CCFBF1"
  on-tertiary-container: "#134E4A"
  error: "#DC2626"
  on-error: "#FFFFFF"
  error-container: "#FEE2E2"
  on-error-container: "#7F1D1D"
  surface: "#FFFFFF"
  on-surface: "#0F172A"
  surface-dim: "#F8FAFC"
  surface-bright: "#FFFFFF"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F8FAFC"
  surface-container: "#F1F5F9"
  surface-container-high: "#E2E8F0"
  surface-container-highest: "#CBD5E1"
  on-surface-variant: "#64748B"
  outline: "#94A3B8"
  outline-variant: "#E2E8F0"
  inverse-surface: "#1E293B"
  inverse-on-surface: "#F1F5F9"
  inverse-primary: "#93C5FD"
  background: "#F8FAFC"
  on-background: "#0F172A"
  surface-variant: "#E2E8F0"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.025em
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: "600"
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  none: 0
  sm: 4px
  DEFAULT: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 40px
  page: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 9px 20px
    height: 38px
  button-primary-hover:
    backgroundColor: "#1D4ED8"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 9px 20px
    height: 38px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 9px 16px
    height: 38px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 9px 20px
    height: 38px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  card-elevated:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 38px
  badge:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  sidebar:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    width: 240px
  topbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    height: 56px
  table-header:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-md}"
  table-row-hover:
    backgroundColor: "{colors.surface-container-low}"
---

## Overview

Meridian 是一套面向 B 端企业级应用的现代设计体系。设计理念是"专业而不沉闷，精致而不繁复"——在保持企业级应用所需的严谨与可信赖感的同时，注入现代 Web 产品的呼吸感与视觉层次。

整体风格偏向"Clean Professional"：大量留白、清晰的信息层级、克制的色彩运用，以及通过微妙的阴影和圆角营造出的柔和立体感。目标是让用户在长时间使用中感到舒适，同时第一眼就能感受到产品的品质感。

## Colors

色彩体系以 Slate 冷灰色调为基底，搭配鲜明的 Blue 主色调和 Teal 辅助色，构建出既专业又有活力的视觉语言。

- **Primary (#2563EB):** 明亮的蓝色，用于所有主要交互元素——按钮、链接、选中态、进度指示。它传递信任感和专业性，同时足够醒目以引导用户操作。
- **Secondary (#0F172A):** 深邃的海军蓝，用于侧边栏、顶部导航等结构性元素，营造稳定的空间框架感。
- **Tertiary (#0D9488):** 沉稳的青绿色，用于成功状态、数据可视化中的辅助色、以及需要与主色区分的次级强调。
- **Error (#DC2626):** 清晰的红色，用于错误提示、危险操作确认、删除按钮。
- **Surface 层级:** 从纯白 (#FFFFFF) 到浅灰蓝 (#F8FAFC → #F1F5F9 → #E2E8F0)，通过微妙的色调差异构建内容层级，避免纯灰的单调感。
- **Text 层级:** 主文字使用深海军蓝 (#0F172A) 而非纯黑，次要文字使用中性蓝灰 (#64748B)，营造更柔和的阅读体验。

## Typography

采用 **Inter** 作为全局字体。Inter 是专为屏幕显示设计的无衬线字体，具有出色的可读性和现代感，其几何构造在小尺寸下依然清晰锐利。

- **Display (48/36px):** 用于页面级大标题、数据仪表盘的核心数字展示。使用 Bold (700) 配合紧凑字距，营造强烈的视觉焦点。
- **Headline (30/24px):** 用于区块标题、卡片标题。Semi-Bold (600) 保持醒目但不压迫。
- **Title (20/16px):** 用于模块标题、对话框标题。Semi-Bold (600) 提供清晰的二级层级。
- **Body (16/14/13px):** 用于正文内容、表单标签、列表项。Regular (400) 配合宽松行高确保长文阅读舒适。
- **Label (14/12/11px):** 用于按钮文字、徽章、辅助标签。Medium (500) 在小尺寸下保持可辨识度，配合适度字距增强可读性。

## Layout

采用响应式布局模型，以 16px 为基础间距单位，辅以 4px 的微调步进。

- **页面结构:** 左侧固定侧边栏 (240px) + 顶部导航栏 (56px) + 内容区的经典 B 端三栏布局。
- **内容区:** 最大宽度 1280px，水平居中，两侧留白不少于 24px。
- **卡片间距:** 模块间使用 16px 间距，区块间使用 24-40px 间距，营造清晰的视觉分组。
- **内边距:** 卡片内部使用 24px 内边距，表单区域使用 16px，紧凑场景使用 12px。

## Elevation & Depth

通过柔和的阴影系统构建层级关系，避免过重的投影造成视觉压迫。

- **Level 0 (无阴影):** 页面背景、侧边栏等与视口齐平的元素。
- **Level 1 (卡片):** `0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)` — 内容卡片、表单容器。
- **Level 2 (悬浮):** `0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04)` — 按钮悬停、下拉菜单。
- **Level 3 (弹层):** `0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04)` — 模态对话框、弹出面板。
- **Level 4 (顶层):** `0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.04)` — 全屏弹窗、通知气泡。

阴影色统一使用主色调 (#0F172A) 的透明度变化，而非纯黑，使阴影带有微妙的冷色调，与整体色彩体系协调。

## Shapes

圆角语言定义为"柔和精确"——足够圆润以传达现代感和友好感，但不过度圆滑以至于失去专业感。

- **按钮与输入框:** 8px 圆角，手感利落。
- **卡片与容器:** 12px 圆角，营造包裹感。
- **徽章与标签:** 全圆角胶囊形，用于状态指示和分类标签。
- **大型面板:** 16px 圆角，用于模态框、侧边弹出面板。
- **头像与图标容器:** 全圆角，用于用户头像、功能图标。

## Components

### Buttons

提供四种按钮类型，按强调程度排列：

- **Primary:** 蓝色实心背景 (#2563EB)，白色文字。用于页面核心操作（提交、新建、确认）。悬停时加深至 #1D4ED8。
- **Secondary:** 白色背景 + 浅灰边框，深色文字。用于次要操作（取消、返回、筛选）。
- **Ghost:** 透明背景，蓝色文字。用于最低强调的操作（查看更多、辅助链接）。
- **Danger:** 红色实心背景，白色文字。用于危险操作（删除、驳回）。

所有按钮高度 38px，圆角 8px，内边距 9px 20px，使用 Label Large (14px/500) 字体。

### Cards

卡片是内容组织的核心容器。白色背景 + 12px 圆角 + Level 1 阴影，内边距 24px。卡片之间保持 16px 间距。悬停时阴影提升至 Level 2，提供微妙的交互反馈。

### Input Fields

输入框高度 38px，白色背景 + 浅灰边框 (#E2E8F0)，8px 圆角。聚焦时边框变为 Primary 蓝色，宽度增至 2px。标签使用 Label Medium (12px/500)，置于输入框上方，间距 4px。

### Data Tables

表头使用 Surface Container Low 背景 + Label Medium 字体 + On Surface Variant 文字色。表体使用 Body Medium (14px/400)，行高 44px。行悬停时背景切换至 Surface Container Low。分割线使用 Outline Variant (#E2E8F0)。

### Navigation

- **Sidebar:** 深海军蓝背景 (#0F172A)，宽度 240px，白色文字。选中项使用半透明白色背景 (rgba(255,255,255,0.1))。
- **Topbar:** 白色背景，高度 56px，底部 1px 分割线 (#E2E8F0)。标题使用 Title Large (20px/600)。

### Badges & Tags

全圆角胶囊形，用于状态指示。Primary Container 背景 + On Primary Container 文字用于信息态，Tertiary Container 用于成功态，Error Container 用于错误态。

## Do's and Don'ts

- Do: 严格使用设计 Token 中定义的色彩值，不要自定义颜色。
- Do: 使用 Inter 字体的比例尺，不要随意调整字号。
- Do: 保持 4px 基础间距网格，所有间距应为 4 的倍数。
- Do: 每个视图最多一个 Primary 按钮作为核心操作。
- Do: 使用阴影层级表达元素的重要性和交互层级。
- Don't: 不要使用纯黑色 (#000000) 作为文字或背景色。
- Don't: 不要在同一视图中混用超过 3 种不同的圆角值。
- Don't: 不要使用过重的阴影（不超过 Level 4）。
- Don't: 不要在紧凑的表格或列表中使用过大的内边距。
