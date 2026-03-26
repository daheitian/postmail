# Docker Deployment

Jant's published Docker image runs the Node runtime. The container entrypoint applies SQLite schema migrations and data backfills, then starts `jant start`.

## Prerequisites

1. Docker 27+ or another recent Docker Engine release
2. Docker Compose v2
3. A public site URL
4. A long random auth secret

## Quick Start

Download the official files:

```bash
curl -O https://raw.githubusercontent.com/jant-me/jant/main/compose.yml
curl -o .env https://raw.githubusercontent.com/jant-me/jant/main/.env.example
mkdir -p data/media
```

Then update `.env` and start Jant:

```bash
docker compose up -d
```

Open `http://127.0.0.1:3000`.

To publish Docker on a different host port, set:

```env
HOST_PORT=8080
```

If you also want the app inside the container to listen on a different port,
set:

```env
PORT=8080
```

## Required Configuration

`AUTH_SECRET` is required. `SITE_ORIGIN` is optional when you want a fixed
public origin for canonical URLs, RSS, sitemaps, exports, or proxy-aware
absolute URLs. `SITE_PATH_PREFIX` is only needed when you mount Jant under a
subpath.

```env
AUTH_SECRET=replace-with-a-long-random-secret
# SITE_ORIGIN=https://your-jant.example
# SITE_PATH_PREFIX=/blog
```

Generate a secret with:

```bash
openssl rand -base64 32
```

The bundled `compose.yml` already defaults the container to the recommended single-node layout:

- `image: owenyoung/jant:latest`
- `PORT=3000`
- `HOST_PORT=3000`
- `DATA_DIR=/var/lib/jant`
- `TRUST_PROXY=true`
- SQLite at `/var/lib/jant/jant.sqlite`
- Local media at `/var/lib/jant/media/`
- `./data:/var/lib/jant`

This keeps the SQLite file and uploaded media together under the host `./data/` directory.

If you want to pin a version or test another tag, set:

```env
IMAGE=owenyoung/jant:0.3.38
```

Repo contributors can use `compose.dev.yml` instead. It builds the local checkout with the repo's `Dockerfile` and starts that image:

```bash
docker compose -f compose.dev.yml up --build -d
```

## Reverse Proxy

Docker Compose already defaults this to `true`, because the recommended
deployment path is behind Caddy, Nginx, or Traefik. Override it only when you
need different behavior:

```env
TRUST_PROXY=false
```

Set `TRUST_PROXY=false` when the container is directly exposed to the
internet. The reverse proxy should terminate TLS and forward requests to the
container on the configured `PORT` (defaults to `3000`).

## Common Commands

Start in the background:

```bash
docker compose up -d
```

Tail logs:

```bash
docker compose logs -f
```

Pull the latest published image:

```bash
docker compose pull
docker compose up -d
```

Run the repo's Dockerfile locally instead of the published image:

```bash
docker build -t jant:local .
IMAGE=jant:local docker compose up -d
```

Or use the dedicated development compose file:

```bash
docker compose -f compose.dev.yml up --build -d
docker compose -f compose.dev.yml logs -f
docker compose -f compose.dev.yml down
```

Stop the stack:

```bash
docker compose down
```

## Backups

For the full backup and recovery guide, see [Backups & Recovery](backups.md).

Back up both of these paths from the mounted volume:

- `data/jant.sqlite`
- `data/media/`

With the default local storage setup and SQLite, together they represent the full site state. If you use Postgres, back up the database separately. If you use S3-compatible storage, back up `data/jant.sqlite` or your Postgres database and manage the media bucket separately.
