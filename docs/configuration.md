# Configuration

Jant is configured through environment variables and settings.

## Environment Variables

Use `wrangler.toml` for non-sensitive values such as `JANT_SITE_URL`.
Use `.dev.vars` for local secrets and Cloudflare Worker secrets for production
secrets such as `JANT_AUTH_SECRET`. Canonical variable names use the `JANT_`
prefix. Legacy aliases still work today, but the prefixed names are the ones to
document and deploy.

### Required

| Variable           | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `JANT_SITE_URL`    | Your site's public URL (e.g., `https://myblog.com` or `https://example.com/blog`) |
| `JANT_AUTH_SECRET` | Random string, 32+ characters. Used for session signing.                          |

`JANT_AUTH_SECRET` is sensitive. Keep it out of `wrangler.toml`.

- Local development: put it in `.dev.vars`
- Cloudflare production: add it as a Worker secret with `wrangler secret put JANT_AUTH_SECRET` or the Cloudflare dashboard

### Feed Defaults (Optional)

| Variable             | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `JANT_MAIN_RSS_FEED` | Controls what `/feed` returns: `featured` (default) or `latest` |

### Public URLs and Subpaths

`JANT_SITE_URL` is the single source of truth for Jant's public base URL.

- Root deployment: `JANT_SITE_URL="https://example.com"`
- Subpath deployment: `JANT_SITE_URL="https://example.com/blog"`

When `JANT_SITE_URL` includes a path:

- Public pages and app routes move under that prefix, such as `/blog`, `/blog/signin`, and `/blog/c/notes`
- Static build assets stay at the reserved root path `/jant-assets/*`
- `/jant-assets` is reserved for Jant and should not be used by another app on the same domain

On Cloudflare, a subpath deployment must route both the page prefix and the asset prefix to the same Worker:

- `/blog*`
- `/jant-assets*`

### Storage

Jant supports two storage backends for media uploads: **Cloudflare R2** (default) and **S3-compatible** services.

#### R2 (Default)

| Variable             | Where           | Description                                         |
| -------------------- | --------------- | --------------------------------------------------- |
| `JANT_R2_PUBLIC_URL` | `wrangler.toml` | Public URL for R2 bucket (**strongly recommended**) |

R2 uses the `[[r2_buckets]]` binding in `wrangler.toml`. No additional configuration is needed beyond creating the bucket.

> **Recommended:** Configure `JANT_R2_PUBLIC_URL` for best performance. Without it, every media request is proxied through your Worker — the Worker fetches the file from R2 and streams it to the client, adding latency and consuming CPU time. With `JANT_R2_PUBLIC_URL` set, media is served directly from Cloudflare's CDN edge, which is faster and reduces Worker usage.
>
> **Setup:** Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → Public access. Enable public access (via custom domain or `r2.dev` subdomain), then set the URL in `wrangler.toml`:
>
> ```toml
> [vars]
> JANT_R2_PUBLIC_URL = "https://media.yourdomain.com"
> ```

#### S3-Compatible Storage

Use any S3-compatible service (AWS S3, Backblaze B2, MinIO, DigitalOcean Spaces, etc.) as an alternative to R2.

| Variable                    | Where           | Description                                                  |
| --------------------------- | --------------- | ------------------------------------------------------------ |
| `JANT_STORAGE_DRIVER`       | `wrangler.toml` | Set to `"s3"` to enable S3 storage                           |
| `JANT_S3_ENDPOINT`          | `wrangler.toml` | S3 endpoint URL (e.g., `https://s3.us-east-1.amazonaws.com`) |
| `JANT_S3_BUCKET`            | `wrangler.toml` | Bucket name                                                  |
| `JANT_S3_REGION`            | `wrangler.toml` | Bucket region (defaults to `"auto"`)                         |
| `JANT_S3_PUBLIC_URL`        | `wrangler.toml` | Public URL for accessing uploaded files                      |
| `JANT_S3_ACCESS_KEY_ID`     | `.dev.vars`     | Access key ID (secret — never commit)                        |
| `JANT_S3_SECRET_ACCESS_KEY` | `.dev.vars`     | Secret access key (secret — never commit)                    |

**Setup:**

1. Set environment variables in `wrangler.toml`:

   ```toml
   [vars]
   JANT_STORAGE_DRIVER = "s3"
   JANT_S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
   JANT_S3_BUCKET = "my-bucket"
   JANT_S3_REGION = "us-east-1"
   JANT_S3_PUBLIC_URL = "https://cdn.example.com"
   ```

2. Add secrets to `.dev.vars` (local) or `wrangler secret put` (production):

   ```bash
   # .dev.vars
   JANT_S3_ACCESS_KEY_ID=your-access-key
   JANT_S3_SECRET_ACCESS_KEY=your-secret-key
   ```

3. Remove the `[[r2_buckets]]` section from `wrangler.toml` — it's not needed with S3.

> **Note:** When using `create-jant`, select "S3-compatible" during setup to have this configured automatically.

### Image Transformations (Optional)

For automatic thumbnail generation and image optimization:

| Variable                   | Description                        |
| -------------------------- | ---------------------------------- |
| `JANT_IMAGE_TRANSFORM_URL` | Base URL for image transformations |

**Cloudflare Image Transformations Setup:**

1. Go to Cloudflare Dashboard → Images → Transformations
2. Enable transformations for the zone that serves your images
3. Set `JANT_IMAGE_TRANSFORM_URL` to **the domain where your images are hosted**, plus `/cdn-cgi/image`

**Use the domain that serves your images:**

- If you set `JANT_R2_PUBLIC_URL` to a custom domain (recommended), use that domain:

  ```toml
  [vars]
  JANT_R2_PUBLIC_URL = "https://media.yourdomain.com"
  JANT_IMAGE_TRANSFORM_URL = "https://media.yourdomain.com/cdn-cgi/image"
  ```

- If you didn't set `JANT_R2_PUBLIC_URL` (images are proxied through your Worker), use your site domain:

  ```toml
  [vars]
  JANT_IMAGE_TRANSFORM_URL = "https://yourdomain.com/cdn-cgi/image"
  ```

> **Why?** Cloudflare Image Transformations can only transform images on the same domain by default. If the domain in `JANT_IMAGE_TRANSFORM_URL` doesn't match where the images are served, transformations will fail.

When enabled, the settings page displays optimized thumbnails instead of full images. Without this setting, original images are shown (still works fine).

**Note:** Images are automatically processed client-side before upload:

- EXIF orientation correction
- Resize to max 1920px
- Metadata stripped (GPS, device info removed)
- Converted to WebP at 85% quality

Video, audio, and PDF files are uploaded as-is without processing.

### Slugs (Optional)

| Variable              | Default | Description                                                    |
| --------------------- | ------- | -------------------------------------------------------------- |
| `JANT_SLUG_ID_LENGTH` | `5`     | Length of auto-generated random slugs for posts without titles |

When a post has a title, the slug is derived from it (e.g., "Hello World" becomes `hello-world`). When there's no title, a random alphanumeric slug of this length is generated (e.g., `a3k9m`). If a title-based slug conflicts, a random suffix of this length is appended.

### Upload Limits (Optional)

| Variable                       | Default | Description                                    |
| ------------------------------ | ------- | ---------------------------------------------- |
| `JANT_UPLOAD_MAX_FILE_SIZE_MB` | `200`   | Maximum file size for non-image uploads, in MB |

Images are always limited to 10MB. This setting controls the limit for video, audio, and PDF uploads.

```toml
[vars]
JANT_UPLOAD_MAX_FILE_SIZE_MB = "500"  # Allow up to 500MB uploads
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
notes, articles, links, quotes, media, pages, c, static, assets
```

## Configuration Files

### wrangler.toml

Non-sensitive environment variables are defined in `wrangler.toml` and committed to git:

```toml
name = "my-jant-blog"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
JANT_SITE_URL = "https://myblog.com"
# Or mount Jant under a subpath:
# JANT_SITE_URL = "https://example.com/blog"

# Optional: Site configuration (can be overridden in settings)
# SITE_NAME = "My Blog"
# SITE_DESCRIPTION = "A personal blog"
# SITE_LANGUAGE = "en"
# JANT_MAIN_RSS_FEED = "featured"

# Optional: R2 and image optimization
# JANT_R2_PUBLIC_URL = "https://media.myblog.com"
# JANT_IMAGE_TRANSFORM_URL = "https://media.myblog.com/cdn-cgi/image"

# Optional: S3-compatible storage (alternative to R2)
# Set JANT_STORAGE_DRIVER = "s3" and configure the options below.
# When using S3, the [[r2_buckets]] section can be removed.
# JANT_STORAGE_DRIVER = "s3"
# JANT_S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com"
# JANT_S3_BUCKET = "my-bucket"
# JANT_S3_REGION = "us-east-1"
# JANT_S3_PUBLIC_URL = "https://cdn.example.com"

[[d1_databases]]
binding = "DB"
database_name = "jant-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "R2"
bucket_name = "jant-media"
```

### .dev.vars (Local Development)

Sensitive secrets are stored in `.dev.vars` (NOT committed to git):

```bash
# .dev.vars
JANT_AUTH_SECRET=your-32-plus-character-secret-here
JANT_DEV_API_TOKEN=local-debug-token
JANT_DEMO_EMAIL=debug@jant.test
JANT_DEMO_PASSWORD=jant-dev-debug-login
JANT_DEMO_MODE=false
```

`JANT_DEV_API_TOKEN`, `JANT_DEMO_EMAIL`, and `JANT_DEMO_PASSWORD` are optional local-only helpers for browser and agent debugging:

- `/signin` uses `JANT_DEMO_EMAIL` and `JANT_DEMO_PASSWORD` to pre-fill the sign-in form.
- `/__dev/login?token=...` accepts `JANT_DEV_API_TOKEN` only on `localhost`, `127.0.0.1`, `::1`, and `*.localtest.me`.

Run `mise run dev-auth-bootstrap` to generate or update these values automatically. `mise run dev-debug` runs the same setup before it starts the local debug server.

### Demo Mode

Set `JANT_DEMO_MODE=true` only for a public shared demo deployment.

- The site is always treated as `noindex`, even if the database says otherwise.
- Password changes, session management, and account deletion are disabled.
- `JANT_DEMO_EMAIL` and `JANT_DEMO_PASSWORD` do not enable demo restrictions by themselves.

### Production Secrets

For production, set secrets via Cloudflare:

```bash
# Generate one first
openssl rand -base64 32

# Then set the production secret
wrangler secret put JANT_AUTH_SECRET
```

Or use Cloudflare Dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets.
