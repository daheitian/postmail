# Jant — Zola Export

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
  c/{slug}/_index.md — Collection display metadata for taxonomy pages and round-trip import
templates/           — Tera templates (Zola's template engine)
static/
  style.css          — Base exported stylesheet
  theme.css          — Resolved Jant theme variables
  custom.css         — Exported custom CSS overrides
  favicon.ico        — Exported site favicon (custom or default fallback)
  apple-touch-icon.png — Exported Apple touch icon (custom or default fallback)
```

## Customizing

- **Site settings** — edit `config.toml` to change the title, URL, or language.
- **Jant metadata** — `config.toml` stores `[extra.jant_export]`, `[extra.jant]`, and `[[extra.jant.collections_directory]]` for round-trip import.
- **Styles** — edit `static/style.css`. The theme supports light and dark modes via `prefers-color-scheme`.
- **Templates** — edit files in `templates/`. Zola uses the [Tera](https://keats.github.io/tera/) template engine.
- **Debugging** — export to a directory with `jant site export --directory ./my-site`, then run `cd my-site && zola serve`.
- **Collections** — posts are tagged with collections via the `c` taxonomy. Browse them at `/collections/`.

## Notes

- The raw export API only writes content files. The CLI localizes media by default unless you pass `--no-localize-media`.
- Thread replies are merged into the root post as a single page. Reply metadata is preserved in HTML comments (`<!-- jant:reply ... -->`).
- The collections directory structure is exported in `config.toml`, including collection order, dividers, and custom links for round-trip imports.
- Attachments are preserved as Jant HTML blocks (`data-jant-node="attachments"`). Text attachments embed canonical Markdown in the block metadata, while the rendered preview is display-only and ignored by `jant site import`.
- Posts with `draft: true` in front matter are only built when you pass the `--drafts` flag to `zola build` or `zola serve`.
