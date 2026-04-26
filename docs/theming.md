# Theming

Jant gives you three layers of visual control:

1. built-in color themes
2. built-in font themes
3. custom CSS

Start with **Settings > Color Theme** and **Settings > Font Theme**. Use **Settings > Custom CSS** only for the parts that still need to change.

All built-in themes include light and dark palettes. Your custom CSS is applied on top of the selected theme, so it is best to treat the built-in theme as a starting point rather than replacing everything from scratch.

## Color Variables

Override these in Custom CSS to adjust colors. Most variables come in pairs: a background and its matching foreground (text) color.

### Core palette

These are the main colors that control the overall look. Changing these affects the entire site.

| Variable                 | What it controls                               |
| ------------------------ | ---------------------------------------------- |
| `--background`           | Page background                                |
| `--foreground`           | Main text color                                |
| `--primary`              | Functional brand color (buttons, selected UI)  |
| `--primary-foreground`   | Text on primary-colored elements               |
| `--secondary`            | Secondary buttons, badges                      |
| `--secondary-foreground` | Text on secondary elements                     |
| `--muted`                | Subtle backgrounds (hover states, badges)      |
| `--muted-foreground`     | Secondary text (dates, captions, placeholders) |
| `--accent`               | Hover/focus backgrounds (menus, nav items)     |
| `--accent-foreground`    | Text on accent backgrounds                     |
| `--card`                 | Card/surface background                        |
| `--card-foreground`      | Text on cards                                  |
| `--popover`              | Dropdown/popover background                    |
| `--popover-foreground`   | Text in popovers                               |
| `--destructive`          | Danger actions (delete buttons, errors)        |
| `--success`              | Success indicators (toasts)                    |
| `--border`               | Borders and dividers                           |
| `--input`                | Input field borders                            |
| `--ring`                 | Focus ring color                               |

### Site-specific colors

These are derived from the core palette by default. Built-in themes set `--site-accent` separately; if you only override the core palette yourself, `--site-accent` falls back to `--primary`.

| Variable                | Default                     | What it controls                                    |
| ----------------------- | --------------------------- | --------------------------------------------------- |
| `--site-accent`         | `var(--primary)`            | Editorial accent (links, thread dots, subtle tints) |
| `--site-accent-text`    | `var(--primary-foreground)` | Text on site accent                                 |
| `--site-page-bg`        | `var(--background)`         | Page background                                     |
| `--site-elevated-bg`    | `var(--background)`         | Elevated content areas                              |
| `--site-nav-hover-bg`   | `var(--accent)`             | Navigation hover background                         |
| `--site-text-primary`   | `var(--foreground)`         | Primary text                                        |
| `--site-text-secondary` | `var(--muted-foreground)`   | Secondary/caption text                              |
| `--site-divider`        | `var(--border)`             | Content dividers                                    |
| `--site-threadline`     | `var(--border)`             | Thread connection lines                             |
| `--site-column-outline` | `var(--border)`             | Column outline                                      |
| `--site-media-outline`  | `var(--border)`             | Image/video border                                  |
| `--search-mark-bg`      | Yellow highlight            | Search result highlight background                  |
| `--search-mark-color`   | Dark text                   | Search result highlight text                        |

### Example: Custom primary and site accent

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

### Example: Custom thread line color

```css
:root {
  --site-threadline: oklch(0.8 0.05 250);
}
```

## Typography Variables

| Variable            | Default                      | What it controls                                                              |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `--font-body`       | System sans-serif            | Post body text, content copy                                                  |
| `--font-heading`    | Editorial serif stack        | Post titles and headings (h1–h3)                                              |
| `--font-site-title` | Editorial serif stack        | Site logo (header)                                                            |
| `--font-ui`         | System sans-serif            | Buttons, nav, labels, badges — always sans-serif, not affected by font themes |
| `--font-serif`      | System serif + Noto fallback | Serif accents (quotes)                                                        |
| `--font-blockquote` | `inherit`                    | Blockquote font family, defaults to body font                                 |
| `--font-mono`       | System monospace             | Code blocks                                                                   |
| `--fw-light`        | 300                          | Light accents                                                                 |
| `--fw-regular`      | 400                          | Body text                                                                     |
| `--fw-medium`       | 500                          | Labels, active nav                                                            |
| `--fw-semibold`     | 600                          | Headings, buttons                                                             |
| `--fw-bold`         | 700                          | Strong emphasis                                                               |
| `--fw-extrabold`    | 800                          | Site logo                                                                     |

Font themes (**Settings > Font Theme**) override `--font-heading`, `--font-body`, and a small set of typography rhythm tokens for headings, labels, and body copy. `--font-ui` is intentionally not affected by font themes — it always stays sans-serif so buttons, navigation, and other interface elements remain legible regardless of the content font. You can further override any of these in Custom CSS.

### Example: Lighter typography

```css
:root {
  --fw-medium: 400;
  --fw-semibold: 500;
}
```

## Layout Variables

| Variable              | Default  | What it controls           |
| --------------------- | -------- | -------------------------- |
| `--content-max-width` | `42rem`  | Maximum content width      |
| `--site-padding`      | `1.5rem` | Horizontal padding         |
| `--content-gap`       | `1rem`   | Spacing between feed items |

### Example: Wider layout

```css
:root {
  --content-max-width: 55rem;
}
```

## Surface Variables

| Variable              | Default  | What it controls          |
| --------------------- | -------- | ------------------------- |
| `--card-radius`       | `0`      | Post card corner radius   |
| `--card-padding`      | `1rem`   | Post card inner padding   |
| `--card-border-width` | `0`      | Post card border          |
| `--card-shadow`       | `none`   | Post card shadow          |
| `--media-radius`      | `0.5rem` | Image/video corner radius |
| `--avatar-size`       | `28px`   | Header avatar size        |
| `--avatar-radius`     | `50%`    | Avatar corner radius      |

### Example: Card-style posts

```css
:root {
  --card-radius: 12px;
  --card-padding: 1.5rem;
  --card-border-width: 1px;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
```

## Data Attributes

Target specific pages or elements using data attributes:

| Attribute            | Element        | Values                                                                       |
| -------------------- | -------------- | ---------------------------------------------------------------------------- |
| `data-page`          | Page wrapper   | `home`, `post`, `search`, `archive`, `collection`, `collections`, `featured` |
| `data-post`          | `<article>`    | Present on every post                                                        |
| `data-format`        | `<article>`    | `note`, `link`, `quote`                                                      |
| `data-post-slug`     | `<article>`    | Post slug (useful for debugging and per-post styling)                        |
| `data-post-body`     | Content div    | Post body text                                                               |
| `data-post-meta`     | Meta div       | Post metadata (date, tags)                                                   |
| `data-post-media`    | Media div      | Post images/videos                                                           |
| `data-post-pinned`   | `<article>`    | Present on pinned posts                                                      |
| `data-post-featured` | `<article>`    | Present on featured posts                                                    |
| `data-feed`          | Feed container | Wraps the list of posts                                                      |
| `data-authenticated` | `<body>`       | Present when logged in                                                       |

### Example: Style only the home page

```css
[data-page="home"] [data-post] {
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
}
```

### Example: Different styles per post format

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

### Example: Highlight pinned posts

```css
[data-post-pinned] {
  background: var(--muted);
  border-radius: 8px;
  padding: 1rem;
}
```

## Dark Mode

Jant automatically follows the visitor's system preference (light/dark). Use a media query to set dark-mode-specific values:

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

## Tips

- Start with theme variables before writing deep selector overrides. Variables survive design changes better.
- Custom CSS has the highest priority and overrides everything, including the selected color theme.
- Use `oklch()` for colors. A good rule of thumb: keep `--primary` slightly sturdier for solid controls, and let `--site-accent` carry the softer editorial color.
- Test in both light and dark mode. If you override a color variable in `:root`, consider whether it also needs a matching override in `@media (prefers-color-scheme: dark)` or `:root[data-theme-mode="dark"]`.
