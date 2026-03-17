# Docker Deployment

Jant's published Docker image runs the Node runtime. The container entrypoint applies SQLite migrations and then starts `jant start`.

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

## Required Configuration

`JANT_AUTH_SECRET` is required. `JANT_SITE_URL` is strongly recommended when you
want a fixed public origin, subpath deployment, correct RSS/sitemap absolute
URLs, or proxy-aware canonical URLs.

```env
JANT_AUTH_SECRET=replace-with-a-long-random-secret
# JANT_SITE_URL=https://your-jant.example
```

Generate a secret with:

```bash
openssl rand -base64 32
```

The bundled `compose.yml` already defaults the container to the recommended single-node layout:

- `image: owenyoung/jant:latest`
- `JANT_DATA_DIR=/var/lib/jant`
- `JANT_TRUST_PROXY=true`
- SQLite at `/var/lib/jant/jant.sqlite`
- Local media at `/var/lib/jant/media/`
- `./data:/var/lib/jant`

This keeps the SQLite file and uploaded media together under the host `./data/` directory.

If you want to pin a version or test another tag, set:

```env
JANT_IMAGE=owenyoung/jant:0.3.38
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
JANT_TRUST_PROXY=false
```

Set `JANT_TRUST_PROXY=false` when the container is directly exposed to the
internet. The reverse proxy should terminate TLS and forward requests to the
container on port `3000`.

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
JANT_IMAGE=jant:local docker compose up -d
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

Back up both of these paths from the mounted volume:

- `data/jant.sqlite`
- `data/media/`

Together they represent the full site state.
