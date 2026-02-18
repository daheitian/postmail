# Theming

## Design Philosophy: Organic Minimalism

Jant follows an **Organic Minimalism** (Soft UI) design language. Every UI decision should reflect these principles:

### Core Principles

- **Soft over sharp**: Prefer rounded corners, gentle gradients, and subtle shadows over hard edges and flat surfaces. Elements should feel approachable, not mechanical.
- **Breathe**: Generous whitespace is a feature, not waste. Content needs room to exist comfortably. Never crowd elements.
- **Quiet depth**: Use soft shadows and layering to create subtle spatial hierarchy. Avoid heavy drop shadows or stark elevation changes.
- **Natural palette**: Colors should feel muted, warm, and organic. Avoid saturated neon or high-contrast clashes. Think sun-bleached linen, stone, warm fog.
- **Minimal noise**: Remove anything that doesn't serve the content. No decorative borders, unnecessary dividers, or visual clutter. When in doubt, leave it out.
- **Gentle motion**: Transitions should be smooth and understated — ease-out curves, short durations. Animation supports comprehension, never demands attention.
- **Typography-driven hierarchy**: Let font size, weight, and spacing do the work. Avoid relying on color or decoration to establish hierarchy.

### Practical Guidelines

| Aspect      | Do                                                   | Don't                           |
| ----------- | ---------------------------------------------------- | ------------------------------- |
| Corners     | Soft radius (`0.5rem`–`1rem`)                        | Sharp 0 or overly pill-shaped   |
| Shadows     | Diffused, low-opacity (`0 2px 8px rgba(0,0,0,0.06)`) | Hard, high-contrast box shadows |
| Backgrounds | Subtle off-whites, warm grays                        | Pure `#fff` / `#000`            |
| Borders     | Thin (`1px`), low-contrast, or omit entirely         | Thick or high-contrast borders  |
| Spacing     | Generous padding and margins                         | Tight/cramped layouts           |
| Feedback    | Soft color shifts, gentle scale                      | Flash, shake, or bounce         |
| Icons       | Thin stroke, rounded joins                           | Heavy/filled, angular           |
| Text color  | Muted foreground, never pure black                   | `#000` on `#fff`                |

### Anti-Patterns to Avoid

- **Neumorphism excess**: A hint of inner/outer shadow for depth is fine; full neumorphic buttons with dual shadows are too heavy.
- **Gradient overuse**: Subtle background gradients are welcome; rainbow or multi-stop gradients on UI elements are not.
- **Over-decoration**: Ornamental lines, badges, or illustrations that don't serve function.
- **Contrast starvation**: Soft does not mean invisible. Maintain WCAG AA contrast ratios for text readability.

---

Jant uses CSS variables for theming, making it easy to customize colors while maintaining consistency.

## Built-in Themes

Select a theme in `/dash/settings`:

- **default** - Clean and neutral
- **ocean** - Cool blues
- **forest** - Natural greens
- **sunset** - Warm oranges
- **lavender** - Soft purples
- **rose** - Pink tones
- **sand** - Earthy beige
- **slate** - Professional gray
- **gameboy** - Retro green
- **terminal** - Hacker aesthetic
- **notepad** - Paper-like
- **nord** - Arctic, blue-gray
- **dracula** - Dark purple
- **solarized** - Ethan Schoonover's classic

All themes support both light and dark mode automatically.

## CSS Variables

Themes are defined through CSS variables:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  --color-accent: #0066cc;
  --color-border: #e5e5e5;
  --color-card-bg: #f9f9f9;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a1a;
    --color-text: #ffffff;
    /* ... */
  }
}
```

## Custom Theme

Create your own theme by adding CSS to your project:

```css
/* my-theme.css */
[data-theme="my-theme"] {
  --color-bg: #fefefe;
  --color-text: #333;
  --color-accent: #ff6600;
  /* ... */
}

[data-theme="my-theme"].dark {
  --color-bg: #1a1a1a;
  --color-text: #eee;
  /* ... */
}
```

Then set `THEME=my-theme` in settings.

## Data Attributes (Public API)

Data attributes on HTML elements are a **stable, versioned public API** for CSS targeting. They MUST NOT be renamed or removed without a major version bump.

| Attribute            | Element        | Purpose                       |
| -------------------- | -------------- | ----------------------------- |
| `data-authenticated` | `<body>`       | Auth state for CSS            |
| `data-page`          | page wrapper   | Page type identifier          |
| `data-post`          | `<article>`    | Post marker                   |
| `data-format`        | `<article>`    | Post format (note/link/quote) |
| `data-post-body`     | content div    | Target post body              |
| `data-post-meta`     | meta div       | Target post metadata          |
| `data-post-media`    | media div      | Target post media             |
| `data-feed`          | feed container | Target feed                   |

Users can inject arbitrary CSS via Dashboard > Settings > Appearance. Stored in database, injected in `<head>` with highest priority.

## CSS Priority (lowest to highest)

1. BaseCoat defaults (`:root`)
2. Design tokens (`styles/tokens.css`)
3. Component styles (`styles/ui.css`)
4. Selected color theme (`:root:root` specificity)
5. `cssVariables` from `createApp()` config
6. Custom CSS injection from dashboard

## Component Styling

Jant uses [BaseCoat](https://github.com/hunvreus/basecoat) for UI components. Style components using its class names:

```html
<button class="btn">Post</button>
<input class="input" placeholder="What's on your mind?" />
<div class="card">...</div>
```

Use Tailwind utilities for layout only:

```html
<!-- Good: Tailwind for layout -->
<div class="flex gap-4 mt-2">...</div>

<!-- Avoid: Tailwind for component styling -->
<button class="bg-blue-500 px-4 py-2 rounded">...</button>
```

## Animation

Transitions use these CSS variables:

```css
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-out;
```

Apply to interactive elements:

```css
.my-element {
  transition: opacity var(--transition-base);
}
```
