# Deploy with Docker

The official Docker image is `owenyoung/jant`.

It runs the Node runtime, applies pending migrations, and then starts Jant.

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
mkdir -p data/media
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
- SQLite stored at `./data/jant.sqlite`
- uploaded media stored at `./data/media/`
- container data mounted at `/var/lib/jant`
- `TRUST_PROXY=true`, which is appropriate when the container sits behind a reverse proxy you control

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

## Running Without Compose

Use `docker run` when you want one container and will manage the rest yourself:

```bash
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

Pull the latest image and restart:

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
