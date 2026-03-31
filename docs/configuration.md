# Configuration

Jant reads configuration from two places:

- environment variables for infrastructure and runtime behavior
- dashboard settings for site-level publishing behavior

Most single-site installs only need a few values:

- `AUTH_SECRET`
- `SITE_ORIGIN` when you want a fixed canonical host
- one storage setup: R2, S3, or local files

## Environment Variables

Use:

- `wrangler.toml` for non-sensitive Cloudflare values
- `.dev.vars` for local Cloudflare secrets
- `.env` or process environment variables for Node and Docker

### Required

All runtimes require this variable:

| Variable      | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `AUTH_SECRET` | Random string, at least 32 characters, used for session signing |

Keep `AUTH_SECRET` out of committed files.

- Cloudflare local development: put it in `.dev.vars`
- Cloudflare production: set it as a Worker secret with `npx wrangler secret put AUTH_SECRET`
- Node and Docker: set it in `.env` or the process environment

### Public URLs and Subpaths

These variables matter in `single-site` mode:

| Variable           | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `SITE_ORIGIN`      | Optional fixed public origin such as `https://example.com` |
| `SITE_PATH_PREFIX` | Optional public path prefix such as `/blog`                |

Common patterns:

- root deploy, request-derived host: leave both unset
- fixed host: set `SITE_ORIGIN=https://example.com`
- subpath deploy: set `SITE_PATH_PREFIX=/blog`
- fixed host under subpath: set both

`SITE_ORIGIN` affects absolute URLs such as RSS, sitemap, exports, and auth callbacks.

`SITE_PATH_PREFIX` affects routing and built assets, including `/_assets` inside that prefix.

In `host-based` mode, Jant ignores both values and resolves the site from the incoming host.

### Site Resolution

| Variable               | Values                        | Description                                |
| ---------------------- | ----------------------------- | ------------------------------------------ |
| `SITE_RESOLUTION_MODE` | `single-site` or `host-based` | Controls how Jant resolves the active site |

- `single-site` is the normal self-hosted mode
- `host-based` is for hosted multi-site setups
- in `single-site` mode, Node startup expects exactly one initialized site in the database

Most self-hosted users should keep `single-site`.

### Node and Docker

On Node and Docker, Jant chooses the database runtime from `DATABASE_URL`:

- `file:` means SQLite
- `postgres:` or `postgresql:` means Postgres

Minimal SQLite example:

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=file:./data/jant.sqlite
```

Minimal Postgres example:

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
```

Common Node and Docker variables:

| Variable               | Default                  | Description                                                                                |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `DATA_DIR`             | `./data`                 | Base directory for default SQLite and local media paths                                    |
| `LOCAL_STORAGE_PATH`   | `<DATA_DIR>/media`       | Override the local media directory                                                         |
| `LOCAL_PUBLIC_URL`     | unset                    | Public base URL for media served outside Jant; leave unset to use Jant's `/media/*` routes |
| `HOST`                 | `127.0.0.1` on bare Node | Bind address for `jant start`                                                              |
| `PORT`                 | `3000`                   | Bind port for `jant start`                                                                 |
| `TRUST_PROXY`          | `false`                  | Trust forwarded headers from your reverse proxy                                            |
| `SITE_RESOLUTION_MODE` | `single-site`            | Site resolution mode                                                                       |

The official Docker image already defaults `DATA_DIR` to `/var/lib/jant`, and Docker Compose commonly sets `TRUST_PROXY=true`.

### Hosted Control-Plane Integration Variables

Only use these when `SITE_RESOLUTION_MODE=host-based`.

| Variable                                   | Description                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `HOSTED_CONTROL_PLANE_BASE_URL`            | Public hosted control-plane URL used for hosted sign-in, reset, and account redirects |
| `HOSTED_CONTROL_PLANE_INTERNAL_BASE_URL`   | Optional internal control-plane base URL for server-to-server calls                   |
| `HOSTED_CONTROL_PLANE_PROVIDER_NAME`       | Optional provider label shown in hosted account UI                                    |
| `HOSTED_CONTROL_PLANE_INTERNAL_TOKEN`      | Shared bearer token for hosted control-plane internal APIs                            |
| `INTERNAL_ADMIN_TOKEN`                     | Shared bearer token for internal admin routes                                         |
| `HOSTED_CONTROL_PLANE_DOMAIN_CHECK_SECRET` | 32+ character secret for domain verification responses                                |
| `HOSTED_CONTROL_PLANE_SSO_SECRET`          | 32+ character secret for hosted admin handoff tokens                                  |

When `host-based` mode is enabled, startup fails fast if the required variables are missing. That is intentional.

### Feed Defaults (Optional)

| Variable        | Default    | Description                                           |
| --------------- | ---------- | ----------------------------------------------------- |
| `MAIN_RSS_FEED` | `featured` | Controls what `/feed` returns: `featured` or `latest` |

`featured` is the default on purpose. Jant assumes many posts should remain visible on the site without automatically becoming the canonical subscriber feed.

### Pagination (Optional)

| Variable            | Default              | Description                              |
| ------------------- | -------------------- | ---------------------------------------- |
| `PAGE_SIZE`         | `50`                 | Default page size for timelines and APIs |
| `SEARCH_PAGE_SIZE`  | inherits `PAGE_SIZE` | Override search pagination only          |
| `ARCHIVE_PAGE_SIZE` | inherits `PAGE_SIZE` | Override archive pagination only         |

Use `SEARCH_PAGE_SIZE` and `ARCHIVE_PAGE_SIZE` only when those surfaces need a different page size from the rest of the site.

### Storage

Storage depends on the runtime:

| Runtime            | Default | Supported drivers |
| ------------------ | ------- | ----------------- |
| Cloudflare Workers | `r2`    | `r2`, `s3`        |
| Node and Docker    | `local` | `local`, `s3`     |

Node does not support `r2`.

Cloudflare does not support `local`.

For Node and Docker, `local` is the fastest way to start. `s3` is usually the better long-term production choice.

#### Local Storage (Fastest Start on Node / Docker)

Local storage requires no extra driver configuration.

Use it when you want the simplest setup, local testing, or a small single-machine install.

Defaults:

- `DATA_DIR=./data`
- `LOCAL_STORAGE_PATH=<DATA_DIR>/media`

Override the media path when you want files elsewhere:

```env
LOCAL_STORAGE_PATH=/absolute/path/to/jant-media
```

Set `LOCAL_PUBLIC_URL` only if another web server will serve those files directly.

#### R2 (Default)

Cloudflare Workers use R2 by default.

| Variable        | Description                          |
| --------------- | ------------------------------------ |
| `R2_PUBLIC_URL` | Public URL for direct media delivery |

R2 itself is configured through the `[[r2_buckets]]` binding in `wrangler.toml`.

`R2_PUBLIC_URL` is strongly recommended. Without it, media still works, but Jant has to proxy each request through the Worker.

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
```

#### S3-Compatible Storage

Use S3-compatible storage when:

- you want the recommended long-term storage setup on Node or Docker
- you want the same storage backend on Cloudflare and Node
- you prefer S3, Backblaze B2, MinIO, DigitalOcean Spaces, or another compatible service
- you want browser direct uploads through presigned URLs

| Variable               | Description                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_DRIVER`       | Set to `s3`                                                                                                                            |
| `S3_ENDPOINT`          | S3 API endpoint                                                                                                                        |
| `S3_BUCKET`            | Bucket name                                                                                                                            |
| `S3_REGION`            | Bucket region, defaults to `auto`                                                                                                      |
| `S3_PUBLIC_URL`        | Public URL where uploaded files are served                                                                                             |
| `S3_ACCESS_KEY_ID`     | Access key, keep secret                                                                                                                |
| `S3_SECRET_ACCESS_KEY` | Secret key, keep secret                                                                                                                |
| `ASSET_BASE_URL`       | CDN root URL for built JS/CSS assets, e.g. `https://cdn.example.com` (see [CDN Static Assets](deployment-docker.md#cdn-static-assets)) |

Example:

```toml
[vars]
STORAGE_DRIVER = "s3"
S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
S3_BUCKET = "my-bucket"
S3_REGION = "us-east-1"
S3_PUBLIC_URL = "https://cdn.example.com"
```

Put the credentials in secrets storage, not in committed files.

### Browser Direct Upload CORS

If you use `STORAGE_DRIVER=s3`, the bucket must allow CORS for the exact site origin that uploads files.

Recommended CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-site.example"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-Disposition",
      "Cache-Control",
      "x-amz-checksum-sha256"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

If you upload from multiple origins, list each origin explicitly.

### Image Transformations (Optional)

| Variable              | Description                        |
| --------------------- | ---------------------------------- |
| `IMAGE_TRANSFORM_URL` | Base URL for image transformations |

When you use Cloudflare image transformations, point this to the domain that actually serves your images, plus `/cdn-cgi/image`.

Examples:

```toml
[vars]
R2_PUBLIC_URL = "https://media.yourdomain.com"
IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
```

Or, when images are still proxied through the site domain:

```toml
[vars]
IMAGE_TRANSFORM_URL = "https://yourdomain.com/cdn-cgi/image"
```

### Temporary Upload Cleanup

Jant stores in-progress uploads under a temporary storage prefix and opportunistically cleans up expired upload sessions during new upload initialization.

If you need a manual cleanup path, use the internal maintenance endpoint:

```bash
curl -X POST https://your-site.example/api/internal/uploads/cleanup \
  -H "Authorization: Bearer $INTERNAL_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

Or the CLI wrapper:

```bash
export INTERNAL_ADMIN_TOKEN=your-internal-admin-token
npx jant uploads cleanup --url https://your-site.example --limit 50
```

### Slugs (Optional)

| Variable         | Default | Description                                              |
| ---------------- | ------- | -------------------------------------------------------- |
| `SLUG_ID_LENGTH` | `5`     | Length of auto-generated random slugs for untitled posts |

### Upload Limits (Optional)

| Variable                  | Default | Description                              |
| ------------------------- | ------- | ---------------------------------------- |
| `UPLOAD_MAX_FILE_SIZE_MB` | `500`   | Maximum size for non-image uploads in MB |

Images keep their own tighter limits. This setting mainly affects video, audio, and PDF uploads.

### Content Summary and RSS Limits (Optional)

| Variable                 | Default | Description                                   |
| ------------------------ | ------- | --------------------------------------------- |
| `SUMMARY_MAX_PARAGRAPHS` | `5`     | Maximum paragraphs in generated summaries     |
| `SUMMARY_MAX_CHARS`      | `500`   | Maximum characters in generated summaries     |
| `RSS_FEED_LIMIT`         | `50`    | Maximum number of posts included in RSS feeds |

## Dashboard Settings

These settings can be changed in the Jant dashboard after setup. Some of them can also be seeded from environment variables.

| Setting                      | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `SITE_NAME`                  | Site display name                                         |
| `SITE_DESCRIPTION`           | Meta description and feed description                     |
| `SITE_LANGUAGE`              | Primary language code                                     |
| `TIME_ZONE`                  | Display time zone such as `UTC` or `Asia/Shanghai`        |
| `HOME_DEFAULT_VIEW`          | Choose whether the home page starts on Latest or Featured |
| `MAIN_RSS_FEED`              | Choose what `/feed` returns                               |
| `HEADER_NAV_MAX_VISIBLE`     | Maximum number of top-level nav links before overflow     |
| `SITE_FOOTER`                | Custom footer text                                        |
| `SHOW_JANT_BRANDING_ON_HOME` | Show or hide Jant branding on the home page               |
| `NOINDEX`                    | Ask search engines not to index the site                  |

Color theme, font theme, custom CSS, avatar, and other appearance details are also managed in the dashboard.

## Reserved Paths

These top-level paths are reserved and cannot be used as post or custom page slugs:

```text
featured, latest, collections, signin, signout, setup, settings, posts, dash,
api, feed, search, archive, media, pages, reset, c, compose, static, assets,
_assets, health
```

Inside `/c/*`, the collection slug `new` is also reserved.

## Configuration Files

### wrangler.toml

Use `wrangler.toml` for non-sensitive Cloudflare configuration:

```toml
name = "my-jant-site"
main = "index.js"

[vars]
SITE_ORIGIN = "https://myblog.com"
# SITE_PATH_PREFIX = "/blog"
# R2_PUBLIC_URL = "https://media.myblog.com"
# IMAGE_TRANSFORM_URL = "https://media.myblog.com/cdn-cgi/image"

[[d1_databases]]
binding = "DB"
database_name = "my-jant-site-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "my-jant-site-media"
```

### .env (Node and Docker)

Use `.env` or your process manager's environment injection for Node and Docker:

```env
AUTH_SECRET=your-32-plus-character-secret
SITE_ORIGIN=https://your-jant.example
DATABASE_URL=file:./data/jant.sqlite
# SITE_PATH_PREFIX=/blog
# TRUST_PROXY=true
```

Useful templates:

- repo-level Docker and Node example: [`.env.example`](../.env.example)
- package-local Node example: [`packages/core/.env.node.example`](../packages/core/.env.node.example)

### .dev.vars (Local Development)

Use `.dev.vars` for local Cloudflare secrets:

```env
AUTH_SECRET=your-32-plus-character-secret
DEV_API_TOKEN=local-debug-token
DEMO_EMAIL=debug@jant.test
DEMO_PASSWORD=jant-dev-debug-login
DEMO_MODE=false
```

`DEV_API_TOKEN`, `DEMO_EMAIL`, and `DEMO_PASSWORD` are local debugging helpers. They are not part of a normal production setup.

### Demo Mode

Set `DEMO_MODE=true` only for a public shared demo environment.

Effects:

- forces `noindex`
- disables account deletion, password changes, and some account-management actions
- does not activate merely because `DEMO_EMAIL` or `DEMO_PASSWORD` are set

### Production Secrets

For Cloudflare production, set secrets with Wrangler or in the dashboard:

```bash
openssl rand -base64 32
npx wrangler secret put AUTH_SECRET
```
