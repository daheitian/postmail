# Deployment

Jant supports multiple deployment targets:

- [Cloudflare Workers](#cloudflare-workers)
- [Docker](./deployment-docker.md)

This page covers the Cloudflare Workers path.

## Cloudflare Workers

## Prerequisites

1. A Cloudflare account
2. Wrangler CLI installed (`pnpm add -g wrangler`)
3. Logged in to Wrangler (`wrangler login`)

## Create Resources

### D1 Database

```bash
wrangler d1 create jant-db
```

Copy the database ID and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "jant-db"
database_id = "your-database-id"
```

### R2 Bucket (for media)

```bash
wrangler r2 bucket create jant-media
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "jant-media"
```

**Recommended:** Enable public access on your R2 bucket and set `R2_PUBLIC_URL` in `wrangler.toml`. This allows media files to be served directly from Cloudflare's CDN instead of being proxied through your Worker.

1. Go to Cloudflare Dashboard → R2 → `jant-media` → Settings → Public access
2. Enable public access (custom domain or `r2.dev` subdomain)
3. Add the URL to `wrangler.toml`:

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

> Without `R2_PUBLIC_URL`, media uploads still work — files are served through a Worker proxy route (`/media/:id`), but this is slower and uses more Worker CPU.

## Configure Secrets

```bash
# Required: Auth secret (must be at least 32 characters!)
# Generate one with: openssl rand -base64 32
wrangler secret put AUTH_SECRET
```

> **Important**: `AUTH_SECRET` must be at least 32 characters. If it's shorter, authentication will fail with "AUTH_SECRET is not set".

You can also set it in Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets.

## Run Migrations

```bash
# Apply schema migrations and data backfills
pnpm exec jant migrate --remote
```

## Deploy

```bash
pnpm run deploy
```

The default deploy script runs `jant assets prepare --output ./.jant/public-assets` before `wrangler deploy --assets ./.jant/public-assets`, so Cloudflare receives a static directory whose paths already match the final public URLs.

Your site is now live at `https://your-worker.workers.dev`.

## Custom Domain

1. Go to Cloudflare Dashboard → Workers → Your Worker
2. Click "Custom Domains"
3. Add your domain

## Environment Variables

Set non-sensitive values such as `SITE_URL` in `wrangler.toml` under `[vars]`:

```toml
[vars]
SITE_URL = "https://yourdomain.com"
```

`SITE_URL` can also include a subpath, such as `https://example.com/blog`.

## Deploy Under a Subpath

To serve Jant from a subpath, set `SITE_URL` to the full public base URL:

```toml
[vars]
SITE_URL = "https://example.com/blog"
```

Jant will then use:

- Page routes under `/blog/*`
- Static assets under `/blog/_assets/*`

Jant also keeps fonts under `/_assets/*` as regular files rather than inline `data:` URLs, so the default `font-src 'self'` CSP stays sufficient.

On Cloudflare, `npm run deploy` prepares a publishable static directory before calling Wrangler, so the generated asset paths already live inside the site prefix. Route the site prefix itself to the Worker:

- `/blog*`

`/_assets` is reserved for Jant's built assets inside each public site prefix.

Use Worker secrets for sensitive values:

```bash
wrangler secret put AUTH_SECRET
```

See [Configuration](configuration.md) for all available options.

## Updating

Pull the latest changes and redeploy:

```bash
git pull
pnpm run deploy
```

Schema migrations and data backfills run automatically on deploy.

For backup and restore planning, see [Backups & Recovery](backups.md).
