# Theming

Customize how your Jant site looks using CSS variables and the Custom CSS editor in **Settings > Custom CSS**.

All built-in themes support light and dark mode automatically. Your Custom CSS is applied on top of the selected theme, so you can pick a theme as a starting point and fine-tune from there.

## Color Variables

These control the overall color palette. Override them in Custom CSS to adjust colors.

| Variable               | What it controls                   |
| ---------------------- | ---------------------------------- |
| `--background`         | Page background                    |
| `--foreground`         | Main text color                    |
| `--primary`            | Accent color (buttons, links)      |
| `--primary-foreground` | Text on accent-colored elements    |
| `--muted`              | Subtle backgrounds (hover, badges) |
| `--muted-foreground`   | Secondary text (dates, captions)   |
| `--border`             | Borders and dividers               |
| `--destructive`        | Danger actions (delete buttons)    |
| `--success`            | Success indicators (toasts)        |
| `--search-mark-bg`     | Search result highlight background |
| `--search-mark-color`  | Search result highlight text       |

### Example: Custom accent color

```css
:root {
  --primary: oklch(0.55 0.15 250);
  --primary-foreground: oklch(0.98 0 0);
}

.dark {
  --primary: oklch(0.7 0.15 250);
}
```

## Typography Variables

| Variable         | Default               | What it controls             |
| ---------------- | --------------------- | ---------------------------- |
| `--font-body`    | System sans-serif     | Body text, inputs, UI labels |
| `--font-heading` | Same as `--font-body` | Headings, site logo          |
| `--font-serif`   | System serif          | Serif accents                |
| `--font-mono`    | System monospace      | Code blocks                  |
| `--fw-light`     | 300                   | Light accents                |
| `--fw-regular`   | 400                   | Body text                    |
| `--fw-medium`    | 500                   | Labels, active nav           |
| `--fw-semibold`  | 600                   | Headings, buttons            |
| `--fw-bold`      | 700                   | Strong emphasis              |
| `--fw-extrabold` | 800                   | Site logo                    |

Font themes (**Settings > Font Theme**) override `--font-heading` and `--font-body` with curated pairings. You can further override them in Custom CSS.

### Example: Lighter typography

```css
:root {
  --fw-medium: 400;
  --fw-semibold: 500;
}
```

## Layout Variables

| Variable         | Default  | What it controls           |
| ---------------- | -------- | -------------------------- |
| `--site-width`   | `500px`  | Maximum content width      |
| `--site-padding` | `1.5rem` | Horizontal padding         |
| `--content-gap`  | `1rem`   | Spacing between feed items |

### Example: Wider layout

```css
:root {
  --site-width: 700px;
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
  border-left: 3px solid var(--primary);
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

Use `.dark` to target dark mode specifically:

```css
:root {
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dark {
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

## Tips

- Custom CSS has the highest priority and overrides everything, including the selected color theme.
- Use `oklch()` for colors — it produces more perceptually uniform results than hex or hsl. Example: `oklch(0.6 0.15 250)` is a medium-saturation blue.
- Test in both light and dark mode. If you override a color variable in `:root`, consider whether `.dark` needs a matching override.
- The `--site-*` variables (e.g. `--site-accent`, `--site-threadline`) are derived from the base variables above. Override the base variables first; only override `--site-*` variables if you need finer control.
