# Backups and Recovery

If you only need the common commands, start here.

Run these commands from a Jant project directory where `@jant/core` is installed. The shell examples below assume macOS or Linux.

**One rule:** a full Jant backup always includes both the database and the uploaded media files.

## Most Common Commands

Export a remote site into a normal directory:

```bash
mkdir -p backups
export JANT_API_TOKEN=jnt_your_token
npx jant site export https://your-site.example --directory ./backups/jant-site-export-$(date +%F)
```

Create a restore-friendly snapshot that keeps internal IDs, storage keys, and referenced object files:

```bash
mkdir -p backups
npx jant site snapshot export --output ./backups/jant-site-snapshot-$(date +%F).zip
```

Create a raw SQL dump of the current database:

```bash
mkdir -p backups
npx jant db export --output ./backups/jant-db-$(date +%F).sql
```

Back up the default Docker or Node local data layout (`data/jant.sqlite` + `data/media/`):

```bash
docker compose down
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
docker compose up -d
```

Restore a snapshot into a local site:

```bash
npx jant site snapshot import --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

Restore a snapshot into a remote Cloudflare site:

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

## Choose the Right Tool

Jant has three different backup and recovery tools, and they solve different problems:

| Need                                                        | Use this                                          |
| ----------------------------------------------------------- | ------------------------------------------------- |
| Move content to another site                                | `site export` and `site import`                   |
| Restore content with the same internal IDs and storage keys | `site snapshot export` and `site snapshot import` |
| Recover from production data loss                           | a real database backup plus a real media backup   |

The short version:

- `site export` is for portability
- `site snapshot` is for round-trip-safe recovery of site content
- database backup plus media backup is your real disaster-recovery plan

## What Counts as a Full Backup

You need both:

- the database
- the media storage

If you back up only the database, you keep posts, collections, settings, and media metadata, but not the uploaded files.

If you back up only media storage, you keep files but lose the records that point to them.

## Portable Exports

Use `site export` when you want to:

- move content into another Jant site
- keep a portable archive
- inspect or serve the exported Hugo structure

Use the remote site URL and export to a normal directory:

```bash
mkdir -p backups
export JANT_API_TOKEN=jnt_your_token
npx jant site export https://your-site.example --directory ./backups/jant-site-export-$(date +%F)
```

Do not treat `site export` as your primary disaster-recovery plan for a live production site.

See [Export and Import](export-and-import.md) for more import and export options.

## Recovery Snapshots

Use `site snapshot` when you want to:

- preserve post IDs and storage keys
- rebuild a known content set elsewhere
- keep a round-trip-safe content archive

Common commands:

Local snapshot export:

```bash
mkdir -p backups
npx jant site snapshot export --output ./backups/jant-site-snapshot-$(date +%F).zip
```

Remote Cloudflare snapshot export:

```bash
mkdir -p backups
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

Local snapshot restore:

```bash
npx jant site snapshot import --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

Remote Cloudflare snapshot restore:

```bash
npx jant site snapshot import --remote --config ./wrangler.toml --path ./backups/jant-site-snapshot-2026-03-30.zip --replace
```

Snapshot import currently requires `--replace`.

Snapshot import preserves user and auth shell data outside the content scope, such as users, sessions, and API tokens.

## Database-Only Exports

Use `db export` when you want to:

- inspect the database contents
- keep a SQL dump alongside other backups
- move data into your own tooling

Local:

```bash
mkdir -p backups
npx jant db export --output ./backups/jant-db-$(date +%F).sql
```

Remote Cloudflare D1:

```bash
mkdir -p backups
npx jant db export --remote --config ./wrangler.toml --output ./backups/jant-db-$(date +%F).sql
```

A raw SQL export is not a full Jant backup by itself. You still need your media files.

## Docker and Node

### Default Docker Compose Setup

The bundled `compose.yml` stores the default local data here:

- `data/jant.sqlite`
- `data/media/`

For a simple full backup, stop the app first so you do not copy a live SQLite file mid-write:

```bash
docker compose down
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
docker compose up -d
```

Restore that archive:

```bash
docker compose down
tar -xzf ./backups/jant-full-2026-03-30.tar.gz
docker compose up -d
```

### Bare Node Runtime with SQLite and Local Media

If you run Jant directly on Node, stop your process manager first, then archive the same paths:

```bash
mkdir -p backups
tar -czf ./backups/jant-full-$(date +%F).tar.gz data/jant.sqlite data/media
```

If you changed `DATA_DIR` or `LOCAL_STORAGE_PATH`, back up those paths instead.

### Node Runtime with Postgres

Back up the database with `pg_dump`:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql
```

If you still use local media storage, archive it too:

```bash
tar -czf ./backups/jant-media-$(date +%F).tar.gz data/media
```

Restore the database:

```bash
psql "$DATABASE_URL" < ./backups/jant-db-2026-03-30.sql
```

### Node Runtime with S3-Compatible Storage

If your media lives in S3, Backblaze B2, MinIO, R2-compatible tooling, or another S3-compatible store, you still need both parts:

- a database backup
- an object storage backup or retention workflow

Example database backup:

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > ./backups/jant-db-$(date +%F).sql
```

Example media sync with the AWS CLI:

```bash
aws s3 sync s3://your-bucket ./backups/media-$(date +%F)/
```

If your provider needs a custom endpoint, credentials, or profile, add those flags to the same command.

## Cloudflare Workers

If you run Jant on Cloudflare with D1 and R2, a practical plan usually has two layers:

1. keep a recent Jant snapshot or SQL export outside the platform
2. keep a clear recovery plan for D1 and R2 themselves

Common commands:

```bash
mkdir -p backups
npx jant db export --remote --config ./wrangler.toml --output ./backups/jant-db-$(date +%F).sql
npx jant site snapshot export --remote --config ./wrangler.toml --output ./backups/jant-site-snapshot-$(date +%F).zip
```

What those commands give you:

- `db export` gives you an independent SQL copy of the database
- `site snapshot export` gives you a restore-friendly archive of site content plus referenced objects

What they do not replace:

- your D1 recovery workflow
- your R2 retention or off-platform object-copy plan

Object durability is not the same thing as having a tested recovery workflow.

## Restore Checklist

### Cloudflare Restore

1. Restore the database or import a snapshot.
2. Restore missing media objects if storage loss was involved.
3. Redeploy or point Jant at the restored resources.
4. Verify the home page, collections, media URLs, and settings.

### Docker or Node Restore

1. Stop the app.
2. Restore the database file or database service.
3. Restore media files or the media bucket.
4. Start the app.
5. Verify posts, collections, uploads, and feeds.

## Recovery Drill

Run a restore drill on a blank staging environment before you need one in production.

Checklist:

1. Restore the database.
2. Restore media.
3. Start Jant.
4. Open the home page, settings, and a sample of post URLs.
5. Verify attachments and collection pages.
6. Record how long the restore took and how much data was missing.

Track two numbers:

- **RPO**: how much data you can afford to lose
- **RTO**: how long recovery can take

If you cannot measure those two numbers, your backup plan is not finished.

If you cannot restore into an empty environment with confidence, you do not have a real backup yet.
