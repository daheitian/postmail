# Deploy with Docker

The official Docker image is `owenyoung/jant`.

It runs the Node runtime and starts Jant. Database migrations run automatically before the app starts.

Docker Hub: <https://hub.docker.com/r/owenyoung/jant>

## Before You Begin

You need:

- Docker Engine 27 or newer, or another recent Docker release
- Docker Compose v2
- a long random `AUTH_SECRET`

## Quick Start with Docker Compose

Download the official Compose files:

```bash
curl -O https://raw.githubusercontent.com/jant-me/jant/main/compose.yml
curl -o .env https://raw.githubusercontent.com/jant-me/jant/main/.env.example
```

Edit `.env` and set at least:

```env
AUTH_SECRET=replace-with-a-long-random-secret
```

Generate a secret with:

```bash
openssl rand -base64 32
```

Start the stack:

```bash
docker compose up -d
```

Open `http://127.0.0.1:3000`.

## What the Default Compose Setup Gives You

The bundled `compose.yml` uses a simple single-node layout:

- the official image `owenyoung/jant:latest`
- a migration init service that runs automatically before the app starts — if migration fails, the app does not start
- SQLite stored at `./data/jant.sqlite`
- uploaded media stored at `./data/media/`
- container data mounted at `/var/lib/jant`
- `TRUST_PROXY=true`, which is appropriate when the container sits behind a reverse proxy you control
- log rotation capped at 10 MB × 3 files to prevent disk exhaustion
- timezone configurable via `TZ` (defaults to UTC)

This is the easiest way to self-host Jant on a VPS or home server.

The default Compose setup uses local media because it is the quickest way to get a site running. For a longer-lived deployment, S3-compatible storage is usually the better choice.

## Important Environment Variables

Set these in `.env`:

| Variable           | Required          | Purpose                                                                                   |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------------- |
| `AUTH_SECRET`      | Yes               | Session signing and authentication                                                        |
| `SITE_ORIGIN`      | Usually           | Canonical URLs for RSS, sitemaps, exports, and auth callbacks                             |
| `SITE_PATH_PREFIX` | Only for subpaths | Public mount path such as `/blog`                                                         |
| `TRUST_PROXY`      | Depends           | Set to `true` when running behind Caddy, Nginx, Traefik, or another trusted reverse proxy |

Example:

```env
AUTH_SECRET=replace-with-a-long-random-secret
SITE_ORIGIN=https://your-jant.example
# SITE_PATH_PREFIX=/blog
TRUST_PROXY=true
```

For the full list of Node and Docker variables, see [Configuration](configuration.md).

## Local Media or S3?

Use local media when you want the simplest possible setup or are testing on one machine.

Use S3-compatible storage when you want the recommended long-term setup for Docker or Node. It keeps media outside the app host and makes it easier to move or rebuild the app later without treating uploaded files as container-local state.

## CDN Static Assets

This is an **optional** feature for deployments where zero asset 404s during updates matter. Without it, Jant works normally — assets are served from the container itself. The only downside is a brief window during a deploy where a user who already has an old page open might get a 404 on a stale asset reference. For most personal sites this is acceptable.

If you want to eliminate that window, upload assets to S3-compatible object storage before deploying the new container. Assets accumulate there indefinitely — old versions are never deleted — so stale pages can always find the files they reference.

### Setup

**1. Add S3 credentials and `ASSET_BASE_URL` to your environment.**

In your `docker-compose.yml` (or `.env` file):

```env
ASSET_BASE_URL=https://cdn.example.com

S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

`ASSET_BASE_URL` is the public root URL of your CDN/bucket — Jant appends `/_assets` internally.

**2. Add an `upload-assets` service to your `docker-compose.yml`.**

Add a one-off service and wire it to your app with `depends_on`:

```yaml
services:
  upload-assets:
    image: owenyoung/jant:latest # same image as your app
    env_file: .env
    command: ["node", "bin/jant.js", "assets", "upload"]
    restart: "no"

  app:
    image: owenyoung/jant:latest
    depends_on:
      upload-assets:
        condition: service_completed_successfully
    # ... rest of your app config
```

**3. Deploy as usual.**

```bash
docker compose pull
docker compose up -d
```

`docker compose up -d` automatically runs the upload first and starts the app only after it completes. If S3 is not configured, the upload step exits cleanly and the app starts normally — no manual step, no extra commands to remember.

### If you build from source (CI/CD)

```bash
mise run build
mise run upload-assets   # reads S3_* from packages/core/.env.node
docker build .
docker compose up -d
```

### Sharing a bucket with media storage

You can reuse the same S3 bucket as your media storage. Assets land under the `_assets/` prefix, media under its own keys — they don't conflict.

If you need to namespace assets (e.g. multiple sites sharing one bucket), use a sub-path prefix that ends with `_assets`:

```bash
docker compose run --rm --no-deps app node bin/jant.js assets upload --prefix mysite/_assets
# then set ASSET_BASE_URL=https://cdn.example.com/mysite
```

### Bucket permissions

The asset bucket (or prefix) must be publicly readable — browsers fetch JS and CSS directly. CORS configuration is not required for static `<link>` and `<script>` fetches.

## Running Without Compose

Use `docker run` when you want one container and will manage the rest yourself:

```bash
# Run migrations first
docker run --rm \
  -e AUTH_SECRET=replace-with-a-long-random-secret \
  -v "$(pwd)/data:/var/lib/jant" \
  owenyoung/jant:latest \
  node bin/jant.js migrate

# Then start the app
docker run -d \
  --name jant \
  -p 3000:3000 \
  -e AUTH_SECRET=replace-with-a-long-random-secret \
  -e TRUST_PROXY=false \
  -v "$(pwd)/data:/var/lib/jant" \
  owenyoung/jant:latest
```

Set `TRUST_PROXY=true` if the container sits behind your own reverse proxy.

## Updating the Site

Pull the latest image and restart. Migrations run automatically before the app starts:

```bash
docker compose pull
docker compose up -d
```

Pin a specific version when you want repeatable deploys:

```env
IMAGE=owenyoung/jant:<version>
```

## Common Commands

Show logs:

```bash
docker compose logs -f
```

Stop the stack:

```bash
docker compose down
```

Change the public host port:

```env
HOST_PORT=8080
```

## Backups

With the default Docker setup, a full backup includes both:

- `data/jant.sqlite`
- `data/media/`

If you switch to Postgres or S3-compatible storage, your backup plan changes too. See [Backups and Recovery](backups.md) for the recovery model.
