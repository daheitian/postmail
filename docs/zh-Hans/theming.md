# 主题定制

Jant 给你三层视觉控制能力：

1. 内建颜色主题
2. 内建字型主题
3. 自定义 CSS

先从 **Settings > Color Theme** 和 **Settings > Font Theme** 开始。只有在这些仍然不够时，再去用 **Settings > Custom CSS**。

所有内建主题都同时包含浅色和深色配色。你的自定义 CSS 会叠加在所选主题之上，所以最好的方式通常是把内建主题当成起点，而不是从零开始全部重写。

## 颜色变量

如果你想调整颜色，可以在 Custom CSS 里覆盖这些变量。大多数变量成对出现：一个背景色，加上它对应的前景色（文本颜色）。

### 核心色盘

这些是控制整体观感的主要颜色。改动它们会影响整个站点。

| 变量                     | 控制什么                           |
| ------------------------ | ---------------------------------- |
| `--background`           | 页面背景                           |
| `--foreground`           | 主文本颜色                         |
| `--primary`              | 功能性主色（按钮、选中态 UI）      |
| `--primary-foreground`   | 主色元素上的文本颜色               |
| `--secondary`            | 次级按钮、badge                    |
| `--secondary-foreground` | 次级元素上的文本颜色               |
| `--muted`                | 细微背景（hover 状态、badge）      |
| `--muted-foreground`     | 次级文本（日期、说明、占位符）     |
| `--accent`               | hover / focus 背景（菜单、导航项） |
| `--accent-foreground`    | accent 背景上的文本颜色            |
| `--card`                 | 卡片 / surface 背景                |
| `--card-foreground`      | 卡片内文本颜色                     |
| `--popover`              | 下拉 / popover 背景                |
| `--popover-foreground`   | popover 内文本颜色                 |
| `--destructive`          | 危险操作（删除按钮、错误提示）     |
| `--success`              | 成功状态提示（toasts）             |
| `--border`               | 边框和分隔线                       |
| `--input`                | 输入框边框                         |
| `--ring`                 | 焦点 ring 颜色                     |

### 站点专用颜色

这些变量默认从核心色盘派生。内建主题会单独设置 `--site-accent`；如果你只手动覆盖核心色盘，`--site-accent` 会回退到 `--primary`。

| 变量                    | 默认值                      | 控制什么                                        |
| ----------------------- | --------------------------- | ----------------------------------------------- |
| `--site-accent`         | `var(--primary)`            | 编辑气质的强调色（链接、thread 圆点、细微着色） |
| `--site-accent-text`    | `var(--primary-foreground)` | 站点强调色上的文本                              |
| `--site-page-bg`        | `var(--background)`         | 页面背景                                        |
| `--site-elevated-bg`    | `var(--background)`         | 抬起的内容区域                                  |
| `--site-nav-hover-bg`   | `var(--accent)`             | 导航 hover 背景                                 |
| `--site-text-primary`   | `var(--foreground)`         | 主文本                                          |
| `--site-text-secondary` | `var(--muted-foreground)`   | 次级 / 说明文本                                 |
| `--site-divider`        | `var(--border)`             | 内容分隔线                                      |
| `--site-threadline`     | `var(--border)`             | thread 连线                                     |
| `--site-column-outline` | `var(--border)`             | 列边框                                          |
| `--site-media-outline`  | `var(--border)`             | 图片 / 视频边框                                 |
| `--search-mark-bg`      | 黄色高亮                    | 搜索结果高亮背景                                |
| `--search-mark-color`   | 深色文本                    | 搜索结果高亮文字                                |

### 示例：自定义主色和站点强调色

```css
:root {
  --primary: oklch(0.48 0.08 255);
  --primary-foreground: oklch(0.98 0 0);
  --site-accent: oklch(0.56 0.06 240);
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary: oklch(0.79 0.06 255);
    --primary-foreground: oklch(0.19 0.01 255);
    --site-accent: oklch(0.74 0.07 240);
  }
}
```

### 示例：自定义 thread 连线颜色

```css
:root {
  --site-threadline: oklch(0.8 0.05 250);
}
```

## 排版变量

| 变量                | 默认值                  | 控制什么                                      |
| ------------------- | ----------------------- | --------------------------------------------- |
| `--font-body`       | 系统 sans-serif         | 正文、输入框                                  |
| `--font-heading`    | 偏编辑风格的 serif 组合 | 文章标题、h1–h3                               |
| `--font-site-title` | 偏编辑风格的 serif 组合 | 站点 logo（标题栏）                           |
| `--font-ui`         | 系统 sans-serif         | 按钮、导航、标签、badge（字型主题不影响此项） |
| `--font-serif`      | 系统 serif + Noto 回退  | serif 强调文本                                |
| `--font-blockquote` | `inherit`               | 引用块字族，默认跟随正文字体                  |
| `--font-mono`       | 系统 monospace          | 代码块                                        |
| `--fw-light`        | 300                     | 轻量强调                                      |
| `--fw-regular`      | 400                     | 正文                                          |
| `--fw-medium`       | 500                     | 标签、激活导航                                |
| `--fw-semibold`     | 600                     | 标题、按钮                                    |
| `--fw-bold`         | 700                     | 强强调                                        |
| `--fw-extrabold`    | 800                     | 站点 logo                                     |

字型主题（**Settings > Font Theme**）会覆盖 `--font-heading`、`--font-body`，以及一小组用于标题、标签和正文节奏的排版变量。`--font-ui` 不受字型主题影响，始终保持 sans-serif，以确保按钮、导航等界面元素的可读性。你仍然可以继续在 Custom CSS 里覆盖它们。

### 示例：更轻的字重

```css
:root {
  --fw-medium: 400;
  --fw-semibold: 500;
}
```

## 布局变量

| 变量                  | 默认值   | 控制什么          |
| --------------------- | -------- | ----------------- |
| `--content-max-width` | `42rem`  | 内容最大宽度      |
| `--site-padding`      | `1.5rem` | 横向内边距        |
| `--content-gap`       | `1rem`   | feed 项之间的间距 |

### 示例：更宽的布局

```css
:root {
  --content-max-width: 55rem;
}
```

## Surface 变量

| 变量                  | 默认值   | 控制什么        |
| --------------------- | -------- | --------------- |
| `--card-radius`       | `0`      | 帖子卡片圆角    |
| `--card-padding`      | `1rem`   | 帖子卡片内边距  |
| `--card-border-width` | `0`      | 帖子卡片边框    |
| `--card-shadow`       | `none`   | 帖子卡片阴影    |
| `--media-radius`      | `0.5rem` | 图片 / 视频圆角 |
| `--avatar-size`       | `28px`   | 页头头像尺寸    |
| `--avatar-radius`     | `50%`    | 头像圆角        |

### 示例：卡片式帖子

```css
:root {
  --card-radius: 12px;
  --card-padding: 1.5rem;
  --card-border-width: 1px;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

## Data Attributes

你可以用 data attributes 精准命中特定页面或元素：

| 属性                 | 元素         | 取值                                                                         |
| -------------------- | ------------ | ---------------------------------------------------------------------------- |
| `data-page`          | 页面 wrapper | `home`, `post`, `search`, `archive`, `collection`, `collections`, `featured` |
| `data-post`          | `<article>`  | 每篇帖子都会带上                                                             |
| `data-format`        | `<article>`  | `note`, `link`, `quote`                                                      |
| `data-post-slug`     | `<article>`  | 帖子的 slug（便于调试和按帖子定制样式）                                      |
| `data-post-body`     | 内容 div     | 帖子正文                                                                     |
| `data-post-meta`     | 元信息 div   | 帖子元信息（日期、标签）                                                     |
| `data-post-media`    | 媒体 div     | 帖子图片 / 视频区域                                                          |
| `data-post-pinned`   | `<article>`  | 置顶帖子会带上                                                               |
| `data-post-featured` | `<article>`  | featured 帖子会带上                                                          |
| `data-feed`          | feed 容器    | 包裹帖子列表                                                                 |
| `data-authenticated` | `<body>`     | 登录时带上                                                                   |

### 示例：只给首页加样式

```css
[data-page="home"] [data-post] {
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
}
```

### 示例：按帖子格式使用不同样式

```css
[data-format="quote"] [data-post-body] {
  font-family: var(--font-serif);
  font-style: italic;
}

[data-format="link"] {
  border-left: 3px solid var(--site-accent);
  padding-left: 1rem;
}
```

### 示例：高亮置顶帖子

```css
[data-post-pinned] {
  background: var(--muted);
  border-radius: 8px;
  padding: 1rem;
}
```

## 深色模式

Jant 会自动跟随访问者的系统偏好（浅色 / 深色）。如果你想为深色模式单独设置变量，可以用 media query：

```css
:root {
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

@media (prefers-color-scheme: dark) {
  :root {
    --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}
```

## 提示

- 在写复杂选择器覆盖之前，先优先考虑 theme variables。变量在设计演进时更稳定。
- 自定义 CSS 拥有最高优先级，会覆盖一切，包括所选颜色主题。
- 颜色推荐使用 `oklch()`。一个实用经验是：让 `--primary` 稍微更稳一些，用于实心控件；再让 `--site-accent` 承担更柔和的编辑气质颜色。
- 一定要在浅色和深色模式都测试。如果你在 `:root` 里覆盖了某个颜色变量，也要想一想它是否需要在 `@media (prefers-color-scheme: dark)` 或 `:root[data-theme-mode="dark"]` 下对应覆盖。

## 接下来

- [导出与导入](export-and-import.md) —— 站点迁移和归档
