# Jant

A personal microblogging system — self-hosted, single-author, and stripped of all social mechanics. Runs on Cloudflare Workers.

## Quick Start

### One-Click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jant-me/jant-starter)

### CLI

```bash
npm create jant my-site
cd my-site
npm run dev
```

### Manual Deploy

1. **Create a D1 database:**

   ```bash
   npx wrangler d1 create my-site-db
   ```

2. **Update `wrangler.toml`** with the `database_id` from step 1 and set your `SITE_URL`.

3. **Set production secrets:**

   ```bash
   npx wrangler secret put AUTH_SECRET
   ```

4. **Deploy:**

   ```bash
   npm run deploy
   ```

## Commands

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | Start local dev server (applies migrations) |
| `npm run deploy` | Deploy to Cloudflare (applies migrations)   |

## Environment Variables

Configuration is set in `wrangler.toml` and `.dev.vars`. See [Configuration](https://github.com/jant-me/jant/blob/main/docs/configuration.md) for the full reference.

**Required:**

| Variable      | Where           | Description                        |
| ------------- | --------------- | ---------------------------------- |
| `SITE_URL`    | `wrangler.toml` | Your site's public URL             |
| `AUTH_SECRET` | `.dev.vars`     | Session encryption key (32+ chars) |

**Optional (in `wrangler.toml`):**

| Variable              | Description                               |
| --------------------- | ----------------------------------------- |
| `SITE_NAME`           | Display name (also settable in dashboard) |
| `SITE_DESCRIPTION`    | Meta description / RSS subtitle           |
| `SITE_LANGUAGE`       | Language code (`en`, `zh`, etc.)          |
| `R2_PUBLIC_URL`       | Public URL for R2 media bucket            |
| `IMAGE_TRANSFORM_URL` | Cloudflare Image Transformations URL      |

## GitHub Actions CI/CD

The included workflow (`.github/workflows/deploy.yml`) deploys on every push to `main`.

**Setup:**

1. Add these **repository secrets** in Settings > Secrets and variables > Actions:
   - `CF_API_TOKEN` — Cloudflare API token with Workers, D1, and R2 permissions
   - `CF_ACCOUNT_ID` — your Cloudflare account ID
2. Set your production `AUTH_SECRET`:
   ```bash
   npx wrangler secret put AUTH_SECRET
   ```
3. Push to `main` — the workflow handles migrations and deployment.

## Customization

### CSS Tokens

Customize colors through the dashboard (Settings > Appearance) or by overriding CSS variables. See [Theming](https://github.com/jant-me/jant/blob/main/docs/theming.md).

### Data Attributes

Target specific elements for styling with stable data attributes:

| Attribute        | Purpose                       |
| ---------------- | ----------------------------- |
| `data-page`      | Page type identifier          |
| `data-post`      | Post marker                   |
| `data-format`    | Post format (note/link/quote) |
| `data-post-body` | Post body content             |

### Code-Level

For deeper changes, fork the project and modify `@jant/core` directly.

## Updating

```bash
npm update @jant/core
npm run deploy
```

Check the [changelog](https://github.com/jant-me/jant/releases) for breaking changes before updating.

## Documentation

- [Configuration](https://github.com/jant-me/jant/blob/main/docs/configuration.md)
- [Theming](https://github.com/jant-me/jant/blob/main/docs/theming.md)
- [GitHub](https://github.com/jant-me/jant)
