# Configuration

Jant is configured through environment variables and settings.

Some configuration depends on the runtime:

- Cloudflare Workers: `D1 + R2` by default
- Node / Docker: `SQLite + local storage` by default
- Node / Docker can also use `Postgres` and `S3-compatible` storage

## Environment Variables

Use `wrangler.toml` for non-sensitive values such as `SITE_URL`.
Use runtime-specific secret storage for sensitive values such as
`AUTH_SECRET`.

### Required

All runtimes require this variable:

| Variable      | Description                                              |
| ------------- | -------------------------------------------------------- |
| `AUTH_SECRET` | Random string, 32+ characters. Used for session signing. |

`AUTH_SECRET` is sensitive. Keep it out of `wrangler.toml`.

- Node and Docker deployments: set it in your `.env` file, another `.env*` file, or the process environment
- Cloudflare local development: put it in `.dev.vars`
- Cloudflare production: add it as a Worker secret with `wrangler secret put AUTH_SECRET` or the Cloudflare dashboard

`SITE_URL` is mode-specific:

| Variable   | Description                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL` | Public base URL for `single-site` deployments, such as `https://myblog.com` or `https://example.com/blog`. Leave it unset in `host-based` mode. |

### Node and Docker

For Node and Docker, Jant reads `DATABASE_URL` to decide which database runtime to use:

- `file:` URL: SQLite
- `postgres:` / `postgresql:` URL: Postgres

Minimal Node / Docker config with Postgres:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
AUTH_SECRET=your-32-plus-character-secret-here
SITE_URL=https://myblog.com
```

Minimal Node / Docker config with SQLite:

```bash
DATABASE_URL=file:./data/jant.sqlite
AUTH_SECRET=your-32-plus-character-secret-here
SITE_URL=https://myblog.com
```

Optional Node / Docker variables:

| Variable               | Default            | Description                                                                  |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `SITE_RESOLUTION_MODE` | `single-site`      | `single-site` for normal self-hosted use, `host-based` for hosted multi-site |
| `DATA_DIR`             | `./data`           | Base directory for default SQLite and local media paths                      |
| `LOCAL_STORAGE_PATH`   | `<DATA_DIR>/media` | Override local media storage path                                            |
| `HOST`                 | `127.0.0.1`        | Bind address for `jant start`                                                |
| `PORT`                 | `3000`             | Bind port for `jant start`                                                   |

Notes:

- On Node, `SITE_RESOLUTION_MODE` defaults to `single-site`.
- On Node, storage defaults to `local`.
- On Node, `R2` is not supported. Use the default local storage or set `STORAGE_DRIVER="s3"`.

Hosted control-plane integration variables:

| Variable                                   | Description                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `HOSTED_CONTROL_PLANE_BASE_URL`            | Public hosted control-plane base URL used for hosted `/signin`, `/reset`, and account redirects                    |
| `HOSTED_CONTROL_PLANE_INTERNAL_BASE_URL`   | Optional internal control-plane base URL for server-to-server calls; falls back to `HOSTED_CONTROL_PLANE_BASE_URL` |
| `HOSTED_CONTROL_PLANE_PROVIDER_NAME`       | Optional hosted control-plane label shown in hosted account UI; falls back to the control-plane host when omitted  |
| `HOSTED_CONTROL_PLANE_INTERNAL_TOKEN`      | Shared bearer token used by `jant-core` when calling hosted control-plane internal APIs                            |
| `INTERNAL_ADMIN_TOKEN`                     | Shared bearer token for `POST /api/internal/sites` and other internal admin routes                                 |
| `HOSTED_CONTROL_PLANE_DOMAIN_CHECK_SECRET` | Shared 32+ character secret used to sign `/.well-known/jant-domain-check` responses for custom-domain verification |
| `HOSTED_CONTROL_PLANE_SSO_SECRET`          | Shared 32+ character secret used to verify the hosted control plane's short-lived admin handoff tokens             |

These variables are only needed when `jant-core` runs in `SITE_RESOLUTION_MODE=host-based` behind `jant-cloud`.

### Feed Defaults (Optional)

| Variable        | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| `MAIN_RSS_FEED` | Controls what `/feed` returns: `featured` (default) or `latest` |

### Pagination (Optional)

| Variable            | Default              | Description                                    |
| ------------------- | -------------------- | ---------------------------------------------- |
| `PAGE_SIZE`         | `50`                 | Default page size for paginated views and APIs |
| `SEARCH_PAGE_SIZE`  | inherits `PAGE_SIZE` | Override search results pagination only        |
| `ARCHIVE_PAGE_SIZE` | inherits `PAGE_SIZE` | Override archive pagination only               |

`PAGE_SIZE` is the shared default for timeline pages, collection timelines, and other paginated surfaces that do not define a specialized override. Use `SEARCH_PAGE_SIZE` or `ARCHIVE_PAGE_SIZE` only when those views should diverge from the site-wide default.

In `wrangler.toml`, numeric variables can be written as either TOML numbers (`PAGE_SIZE = 50`) or strings (`PAGE_SIZE = "50"`). Native numbers are recommended.

### Public URLs and Subpaths

In `single-site` mode, `SITE_URL` is the single source of truth for Jant's public base URL.

- Root deployment: `SITE_URL="https://example.com"`
- Subpath deployment: `SITE_URL="https://example.com/blog"`

When `SITE_URL` includes a path:

- Public pages, app routes, and built assets move under that prefix, such as `/blog`, `/blog/signin`, `/blog/c/notes`, and `/blog/_assets/client.js`
- `/_assets` is reserved for Jant within each site's public prefix

On Cloudflare, the deploy script generates a static directory that already mirrors the final public URLs, so subpath deploys only need the site prefix itself to reach the Worker, such as `/blog*`.

In `host-based` mode, Jant resolves the current public origin from the matched site domain and request host. `SITE_URL` is ignored in that mode.

### Site Resolution

Jant supports two site resolution modes:

| Variable               | Values                        | Description                                            |
| ---------------------- | ----------------------------- | ------------------------------------------------------ |
| `SITE_RESOLUTION_MODE` | `single-site` or `host-based` | Controls how Jant resolves the current site at runtime |

- `single-site` is the default for self-hosted Node and Docker deployments.
- `host-based` resolves the current site from the incoming host and does not use `SITE_URL`.
- `single-site` expects exactly one site in the database. If the database contains multiple sites, Node startup fails until you switch back to `host-based` or remove the extra sites.

Most self-hosted users should keep the default `single-site` mode.

### Storage

Storage support depends on the runtime:

| Runtime            | Default | Supported drivers |
| ------------------ | ------- | ----------------- |
| Cloudflare Workers | `r2`    | `r2`, `s3`        |
| Node / Docker      | `local` | `local`, `s3`     |

- Node runtime rejects `STORAGE_DRIVER="r2"`.
- Cloudflare runtime rejects `STORAGE_DRIVER="local"`.

Jant supports three storage drivers overall: **Cloudflare R2**, **S3-compatible** services, and **local** filesystem storage.

#### Local Storage (Node / Docker Default)

Node and Docker use local filesystem storage by default. No extra storage configuration is required.

By default:

- `DATA_DIR=./data`
- `LOCAL_STORAGE_PATH=<DATA_DIR>/media`

If you want to override the media path:

```bash
LOCAL_STORAGE_PATH=/absolute/path/to/jant-media
```

#### R2 (Default)

Cloudflare Workers use R2 by default.

| Variable        | Where           | Description                                         |
| --------------- | --------------- | --------------------------------------------------- |
| `R2_PUBLIC_URL` | `wrangler.toml` | Public URL for R2 bucket (**strongly recommended**) |

R2 uses the `[[r2_buckets]]` binding in `wrangler.toml`. No additional configuration is needed beyond creating the bucket.

> **Recommended:** Configure `R2_PUBLIC_URL` for best performance. Without it, every media request is proxied through your Worker — the Worker fetches the file from R2 and streams it to the client, adding latency and consuming CPU time. With `R2_PUBLIC_URL` set, media is served directly from Cloudflare's CDN edge, which is faster and reduces Worker usage.
>
> **Setup:** Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → Public access. Enable public access (via custom domain or `r2.dev` subdomain), then set the URL in `wrangler.toml`:
>
> ```toml
> [vars]
> R2_PUBLIC_URL = "https://media.yourdomain.com"
> ```

**CORS note:** When you use Jant's default Cloudflare Workers `r2` driver, uploads are
relayed through the Worker, so bucket CORS is not required for uploads. If you
instead configure Cloudflare R2 through the S3-compatible `s3` driver to use
browser direct uploads, configure bucket CORS as described in
[Browser Direct Upload CORS](#browser-direct-upload-cors).

#### S3-Compatible Storage

Use any S3-compatible service (AWS S3, Backblaze B2, MinIO, DigitalOcean Spaces, etc.) as an alternative to R2 on Cloudflare or local storage on Node / Docker.

| Variable               | Where           | Description                                                  |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| `STORAGE_DRIVER`       | `wrangler.toml` | Set to `"s3"` to enable S3 storage                           |
| `S3_ENDPOINT`          | `wrangler.toml` | S3 endpoint URL (e.g., `https://s3.us-east-1.amazonaws.com`) |
| `S3_BUCKET`            | `wrangler.toml` | Bucket name                                                  |
| `S3_REGION`            | `wrangler.toml` | Bucket region (defaults to `"auto"`)                         |
| `S3_PUBLIC_URL`        | `wrangler.toml` | Public URL for accessing uploaded files                      |
| `S3_ACCESS_KEY_ID`     | `.dev.vars`     | Access key ID (secret — never commit)                        |
| `S3_SECRET_ACCESS_KEY` | `.dev.vars`     | Secret access key (secret — never commit)                    |

**Setup:**

1. Set environment variables in `wrangler.toml`:

   ```toml
   [vars]
   STORAGE_DRIVER = "s3"
   S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
   S3_BUCKET = "my-bucket"
   S3_REGION = "us-east-1"
   S3_PUBLIC_URL = "https://cdn.example.com"
   ```

2. Add secrets to `.dev.vars` (local) or `wrangler secret put` (production):

   ```bash
   # .dev.vars
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   ```

3. Remove the `[[r2_buckets]]` section from `wrangler.toml` — it's not needed with S3.

> **Note:** When using `create-jant`, select "S3-compatible" during setup to have this configured automatically.

### Browser Direct Upload CORS

If you use browser direct uploads with `STORAGE_DRIVER="s3"`, the bucket must
allow CORS for the exact site origin that initiates the upload. This applies to
AWS S3 and to Cloudflare R2 when you configure it through the S3-compatible
driver with `S3_ENDPOINT`.

Jant signs upload requests with fixed headers such as `Content-Type`,
`Content-Disposition`, and `x-amz-checksum-sha256`. Your bucket CORS rules must
allow those request headers or the browser preflight request will fail.

Jant now also adds the configured `S3_ENDPOINT` origin to CSP `connect-src`
automatically, so the browser can reach the presigned upload URL.

#### Cloudflare R2 via `S3_ENDPOINT`

Use the bucket's S3 API endpoint for uploads, not the public/custom media URL.
Cloudflare's docs note that browser uploads with presigned URLs require bucket
CORS, and rule propagation can occasionally take up to about 30 seconds after a
change.

Recommended bucket CORS:

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

If you upload from multiple origins, list each explicit origin. Avoid `*`
unless you intentionally want any origin to be able to use the bucket's browser
upload CORS policy. `GET` and `HEAD` are included here as well because they are
harmless for normal public media access and avoid future cross-origin fetch
surprises if the browser or app reads object metadata or content directly.

#### AWS S3

AWS S3 evaluates the bucket CORS rules against the browser's preflight request.
The `AllowedHeaders` list must cover every header the browser asks to send.

Recommended bucket CORS:

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

If you use the standard AWS endpoint such as
`https://s3.us-east-1.amazonaws.com`, Jant's CSP also allows the derived bucket
host like `https://your-bucket.s3.us-east-1.amazonaws.com` for the presigned
upload request.

### Image Transformations (Optional)

For automatic thumbnail generation and image optimization:

| Variable              | Description                        |
| --------------------- | ---------------------------------- |
| `IMAGE_TRANSFORM_URL` | Base URL for image transformations |

**Cloudflare Image Transformations Setup:**

1. Go to Cloudflare Dashboard → Images → Transformations
2. Enable transformations for the zone that serves your images
3. Set `IMAGE_TRANSFORM_URL` to **the domain where your images are hosted**, plus `/cdn-cgi/image`

**Use the domain that serves your images:**

- If you set `R2_PUBLIC_URL` to a custom domain (recommended), use that domain:

  ```toml
  [vars]
  R2_PUBLIC_URL = "https://media.yourdomain.com"
  IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
  ```

- If you didn't set `R2_PUBLIC_URL` (images are proxied through your Worker), use your site domain:

  ```toml
  [vars]
  IMAGE_TRANSFORM_URL = "https://yourdomain.com/cdn-cgi/image"
  ```

> **Why?** Cloudflare Image Transformations can only transform images on the same domain by default. If the domain in `IMAGE_TRANSFORM_URL` doesn't match where the images are served, transformations will fail.

When enabled, the settings page displays optimized thumbnails instead of full images. Without this setting, original images are shown (still works fine).

**Note:** Images are automatically processed client-side before upload:

- EXIF orientation correction
- Resize to max 1920px
- Metadata stripped (GPS, device info removed)
- Converted to WebP at 85% quality

Video and audio files uploaded through the compose UI are transcoded client-side
before upload. PDFs and other non-preview files are uploaded as-is.

The server validates the final uploaded format. In the current release that
means:

- Images must arrive as WebP
- Videos must arrive as MP4
- Audio must arrive as MP4/M4A
- PDFs are allowed for browser-native viewing

### Temporary Upload Cleanup

Jant stores in-progress uploads under a temporary storage prefix:

```text
media/{siteId}/tmp/{uploadId}/...
```

Those temporary objects are cleaned up in two ways:

- Opportunistically during `POST /api/uploads/init`. Each new upload request
  schedules a small background cleanup pass for expired upload sessions.
- Manually through the internal admin endpoint:

  ```bash
  curl -X POST https://your-site.example/api/internal/uploads/cleanup \
    -H "Authorization: Bearer $INTERNAL_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"limit": 50}'
  ```

- Through the CLI wrapper:

  ```bash
  export INTERNAL_ADMIN_TOKEN=your-internal-admin-token
  jant uploads cleanup --url https://your-site.example --limit 50
  ```

The cleanup endpoint removes expired temporary upload sessions for the current
site and current storage provider, aborts stale multipart uploads when needed,
and deletes their temporary objects. `limit` is optional and defaults to a
small batch size.

If you run Jant behind external automation, this endpoint is the recommended
manual fallback when you do not have a built-in scheduled task mechanism. The
CLI command calls the same endpoint. In `single-site` mode it can reuse
`SITE_URL` from the environment or `wrangler.toml`; in `host-based` mode pass
`--url` for the managed site's public URL.

### Slugs (Optional)

| Variable         | Default | Description                                                    |
| ---------------- | ------- | -------------------------------------------------------------- |
| `SLUG_ID_LENGTH` | `5`     | Length of auto-generated random slugs for posts without titles |

When a post has a title, the slug is derived from it (e.g., "Hello World" becomes `hello-world`). When there's no title, a random alphanumeric slug of this length is generated (e.g., `a3k9m`). If a title-based slug conflicts, a random suffix of this length is appended.

### Upload Limits (Optional)

| Variable                  | Default | Description                                    |
| ------------------------- | ------- | ---------------------------------------------- |
| `UPLOAD_MAX_FILE_SIZE_MB` | `500`   | Maximum file size for non-image uploads, in MB |

Images are always limited to 10MB. This setting controls the limit for video, audio, and PDF uploads.

```toml
[vars]
UPLOAD_MAX_FILE_SIZE_MB = 500  # Allow up to 500MB uploads
```

## Settings

These can be changed in `/settings`:

| Setting            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `SITE_NAME`        | Your site's display name                                |
| `SITE_DESCRIPTION` | Short description for meta tags and RSS                 |
| `SITE_LANGUAGE`    | Primary language (`en`, `zh`, etc.)                     |
| `TIME_ZONE`        | Display timezone as an IANA ID (`UTC`, `Asia/Shanghai`) |
| `THEME`            | Color theme name                                        |

## Reserved Paths

These paths are reserved by Jant and cannot be used as page slugs:

```
featured, signin, signout, setup, dash, api, feed, search, archive,
notes, articles, links, quotes, media, pages, c, static, assets, _assets
```

## Configuration Files

### wrangler.toml

Non-sensitive environment variables are defined in `wrangler.toml` and committed to git:

```toml
name = "my-jant-blog"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
SITE_URL = "https://myblog.com"
# Or mount Jant under a subpath:
# SITE_URL = "https://example.com/blog"

# Optional: Site configuration (can be overridden in settings)
# SITE_NAME = "My Blog"
# SITE_DESCRIPTION = "A personal blog"
# SITE_LANGUAGE = "en"
# MAIN_RSS_FEED = "featured"
# PAGE_SIZE = 50
# SEARCH_PAGE_SIZE = 25
# ARCHIVE_PAGE_SIZE = 100

# Optional: R2 and image optimization
# R2_PUBLIC_URL = "https://media.myblog.com"
# IMAGE_TRANSFORM_URL = "https://media.myblog.com/cdn-cgi/image"

# Optional: S3-compatible storage (alternative to R2)
# Set STORAGE_DRIVER = "s3" and configure the options below.
# When using S3, the [[r2_buckets]] section can be removed.
# STORAGE_DRIVER = "s3"
# S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
# S3_BUCKET = "my-bucket"
# S3_REGION = "us-east-1"
# S3_PUBLIC_URL = "https://cdn.example.com"

[[d1_databases]]
binding = "DB"
database_name = "jant-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "jant-media"
```

### .env / .env.node (Node and Docker)

Node and Docker deployments usually set configuration through `.env`, `.env.node`, or process environment variables:

```bash
AUTH_SECRET=your-32-plus-character-secret-here
SITE_URL=http://127.0.0.1:3000

# SQLite
# DATABASE_URL=file:./data/jant.sqlite

# Or Postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME

# Optional
# SITE_RESOLUTION_MODE=single-site
# HOST=127.0.0.1
# PORT=3000
```

### .dev.vars (Local Development)

Sensitive secrets are stored in `.dev.vars` (NOT committed to git):

```bash
# .dev.vars
AUTH_SECRET=your-32-plus-character-secret-here
DEV_API_TOKEN=local-debug-token
DEMO_EMAIL=debug@jant.test
DEMO_PASSWORD=jant-dev-debug-login
DEMO_MODE=false
```

`DEV_API_TOKEN`, `DEMO_EMAIL`, and `DEMO_PASSWORD` are optional local-only helpers for browser and agent debugging:

- `/signin` uses `DEMO_EMAIL` and `DEMO_PASSWORD` to pre-fill the sign-in form.
- `/__dev/login?token=...` accepts `DEV_API_TOKEN` only on `localhost`, `127.0.0.1`, `::1`, and `*.localtest.me`.

Run `mise run dev-auth-bootstrap` to generate or update these values automatically. `mise run dev-debug` runs the same setup before it starts the local debug server.

### Demo Mode

Set `DEMO_MODE=true` only for a public shared demo deployment.

- The site is always treated as `noindex`, even if the database says otherwise.
- Password changes, session management, and account deletion are disabled.
- `DEMO_EMAIL` and `DEMO_PASSWORD` do not enable demo restrictions by themselves.

### Production Secrets

For production, set secrets via Cloudflare:

```bash
# Generate one first
openssl rand -base64 32

# Then set the production secret
wrangler secret put AUTH_SECRET
```

Or use Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets.
