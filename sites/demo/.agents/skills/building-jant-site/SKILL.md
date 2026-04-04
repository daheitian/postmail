---
name: building-jant-site
description: Customize a standalone Jant site created with create-jant. Use for project structure decisions, local development, theme work, deployment setup, settings-driven customization, and deciding whether a change belongs in the site repo or in Jant core.
---

# Building a Jant Site

Jant sites created with `create-jant` are intentionally thin. The site repo is mostly configuration and operations glue around `@jant/core`.

## Start Here

Use this skill when you need to:

- change site configuration in `wrangler.toml`
- customize the look with theme settings or custom CSS
- decide whether a change belongs in the site repo or the Jant monorepo
- run local development or deploy to Cloudflare
- script repeatable site changes without editing core code

## Key Constraint

Do not patch `node_modules/@jant/core`.

If the change is product behavior that should apply to all Jant sites, make it in the Jant monorepo. If the change is site-specific, keep it in:

- dashboard settings
- custom CSS
- site docs or helper scripts
- `wrangler.toml`
- the thin `index.js` entrypoint

## Files That Matter

```text
index.js           # Server entrypoint
wrangler.toml      # Cloudflare config, bindings, vars
.dev.vars          # Local secrets
README.md          # Human-facing project instructions
```

## Common Workflow

### 1. Start local development

```bash
npm run dev
```

This already runs local migrations before starting Wrangler dev.

### 2. Pick the right customization layer

- Content or editorial defaults: use the dashboard or the HTTP API
- Theme and layout changes: use Settings plus custom CSS
- Deployment and runtime config: edit `wrangler.toml`
- One-off site behavior at the server edge: wrap `createApp()` in `index.js`

### 3. Deploy the normal way

```bash
npm run deploy
```

Prefer this over raw `wrangler deploy`. The Jant deploy command runs remote migrations and prepares assets before handing off to Wrangler.

## Theming Guidance

Start with built-in theme settings. Reach for custom CSS only after the built-in color and font themes are not enough.

Useful variables include:

- `--background`
- `--foreground`
- `--primary`
- `--site-accent`
- `--site-width`
- `--card-radius`
- `--card-padding`

Useful data attributes include:

- `data-page`
- `data-post`
- `data-format`
- `data-post-body`
- `data-post-media`

Prefer variable overrides over deep selectors. They survive upstream design changes better.

## Gotchas

1. `index.js` should stay small. If you are about to recreate routing, rendering, or DB behavior there, you are probably changing core, not the site.
2. `SITE_PATH_PREFIX` affects deploy behavior. Use `npm run deploy`, not raw Wrangler, so prefixed asset paths are prepared correctly.
3. Most editable settings live behind `/api/settings` and are stored as strings.
4. The fastest way to break a site-specific customization is to fork `@jant/core` locally instead of using settings or CSS.

## Verify Proportionally

- Config-only changes: rerun `npm run dev` or `npm run deploy -- --dry-run` when relevant
- CSS-only changes: smoke test the affected pages in the browser
- API-driven changes: exercise the matching endpoint with a real request
