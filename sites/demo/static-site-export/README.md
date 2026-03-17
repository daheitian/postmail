# Jant Demo — Zola Export

This is a static site exported from [Jant](https://github.com/jant-me/jant), ready to build with [Zola](https://www.getzola.org/).

## Install Zola

**macOS (Homebrew):**

```sh
brew install zola
```

**Windows (Scoop):**

```sh
scoop install zola
```

**Linux (Snap):**

```sh
snap install zola --edge
```

Or download a binary from <https://github.com/getzola/zola/releases>.

See the [Zola installation docs](https://www.getzola.org/documentation/getting-started/installation/) for more options.

## Quick start

Preview locally:

```sh
zola serve
```

Then open <http://127.0.0.1:1111> in your browser.

Build the site for deployment:

```sh
zola build
```

The output goes to the `public/` directory. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

## Project structure

```
config.toml          — Site configuration (title, URL, language)
content/
  _index.md          — Root section (homepage settings)
  {slug}/index.md    — Individual posts (threads are merged into one page)
templates/           — Tera templates (Zola's template engine)
static/
  style.css          — Stylesheet
```

## Customizing

- **Site settings** — edit `config.toml` to change the title, URL, or language.
- **Styles** — edit `static/style.css`. The theme supports light and dark modes via `prefers-color-scheme`.
- **Templates** — edit files in `templates/`. Zola uses the [Tera](https://keats.github.io/tera/) template engine.
- **Collections** — posts are tagged with collections via the `c` taxonomy. Browse them at `/c/`.

## Notes

- Media files (images, etc.) are **not** included in the export. They link back to the original site.
- Thread replies are merged into the root post as a single page. Reply metadata is preserved in HTML comments (`<!-- jant:reply ... -->`).
- Posts with `draft: true` in front matter are only built when you pass the `--drafts` flag to `zola build` or `zola serve`.
