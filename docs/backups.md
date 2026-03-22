# Backups & Recovery

Jant separates **site export** from **infrastructure backup**.

The short version:

- Use **Export Static Site** when you want a Zola export for static publishing or to import into another Jant instance.
- Treat **database backup** and **media backup** as infrastructure concerns.
- Practice recovery on a blank staging environment before you need it in production.

## What counts as a full backup

A full Jant backup needs both of these:

- Your database
- Your uploaded media files

If you only back up the database, you keep your posts, collections, settings, and media metadata, but not the uploaded files themselves. If you only back up media storage, you keep the files but lose the records that point to them.

## What "Export Static Site" is for

The dashboard export and `jant site export` produce a Zola site ZIP. That export is useful for:

- Static publishing
- Moving content into another Jant instance with `jant site import`
- Keeping a human-readable archive of your published structure

It is **not** a complete disaster-recovery plan for a live Jant deployment.

### Dashboard export vs CLI export

The dashboard button downloads the raw site export from Jant.

If you need a more portable export from the command line, prefer:

```bash
npx jant site export --output jant-site-export.zip
```

The CLI localizes referenced media into the export by default. That makes it the better option when you want a more self-contained archive or plan to inspect the exported Zola site locally before importing it somewhere else.

The export also includes standard `static/favicon.ico` and `static/apple-touch-icon.png` files. Jant writes mode metadata into `config.toml` so `jant site import` can tell whether those icons were the bundled defaults or user-uploaded custom assets.

## What "Site Snapshot" is for

`jant site snapshot export` and `jant site snapshot import` are for **identity-preserving recovery**.

Use them when you want to round-trip the same Jant content set without regenerating internal IDs or storage keys. A snapshot includes:

- `db.sql` for the content tables and site-facing settings
- `storage-manifest.json` for referenced storage objects
- `objects/` with the actual uploaded files

This is different from `jant site export`:

- `site export/import` is a content migration tool. It can rewrite media IDs and storage keys.
- `site snapshot export/import` is a restore tool. It keeps IDs and storage keys intact.

The current snapshot scope is intentionally limited to content and presentation data:

- `site_setting` for site-facing keys
- `collection`
- `nav_item`
- `collection_directory_item`
- `post`
- `post_collection`
- `path_registry`
- `media`

Snapshot import does **not** replace auth and shell state such as:

- `user`
- `account`
- `session`
- `api_token`
- onboarding markers and reset tokens in `site_setting`

That makes snapshot restore a good fit for workflows like:

- Rebuilding a demo content set into another environment
- Restoring a curated content snapshot into the same site
- Keeping a round-trip-safe archive while leaving login state alone

## Cloudflare Workers

If you deploy Jant on Cloudflare Workers with D1 and R2:

- Use **D1 Time Travel** for short-window database recovery.
- Treat **R2 protection** separately from D1 recovery.
- Add scheduled exports only if you need longer retention, off-platform copies, or compliance snapshots.

Cloudflare documents D1 Time Travel here:

- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)

Cloudflare also documents an example workflow for exporting D1 into R2 on a schedule:

- [Export and save D1 database](https://developers.cloudflare.com/workflows/examples/backup-d1/)

For media, remember that R2 durability is not the same thing as a full backup strategy. If you need stronger protection against accidental deletion or overwrites, add a storage policy such as object retention, a second copy, or another storage-level workflow.

- [R2 durability](https://developers.cloudflare.com/r2/reference/durability/)
- [R2 Bucket Lock](https://developers.cloudflare.com/r2/buckets/bucket-locks/)

### Recommended Cloudflare strategy

For most small Jant sites:

- Use D1 Time Travel as your first database recovery tool
- Keep media in R2 with a clear retention policy
- Run scheduled D1 exports outside Jant only if you need longer retention or off-platform copies
- Keep `Export Static Site` for migration and manual archival, not as your primary disaster-recovery mechanism

## Node and Docker

If you run Jant on Node or Docker with the default local storage layout and SQLite, back up both of these paths:

- `data/jant.sqlite`
- `data/media/`

If you use Postgres instead of SQLite, back up:

- Your Postgres database
- `data/media/` when using default local media storage

If you use S3-compatible storage instead of local media storage, back up:

- `data/jant.sqlite` or your Postgres database
- Your media bucket and its retention policy

## Restore options

### Restore from a Jant site export

Use this when you want to move content into a new Jant instance.

Start with a dry run:

```bash
npx jant site import --path ./jant-site-export.zip --dry-run
```

Then import for real:

```bash
npx jant site import --path ./jant-site-export.zip
```

For a remote instance:

```bash
export JANT_API_TOKEN=jnt_YOUR_TOKEN
npx jant site import --url https://your-site.com --path ./jant-site-export.zip
```

This is the right tool for migration and content recovery. It is not the same as restoring your production database and storage byte-for-byte.

### Restore from a Jant site snapshot

Use this when you want to restore content with the same IDs and storage keys.

Export a snapshot:

```bash
npx jant site snapshot export --output ./jant-site-snapshot
```

Restore it into another initialized Jant environment:

```bash
npx jant site snapshot import --path ./jant-site-snapshot --replace
```

In `single-site` mode, Jant automatically remaps the snapshot to the only
initialized site when the embedded `site_id` differs. Self-hosted restores do
not need to preserve the old internal site ID.

You can also use a ZIP artifact:

```bash
npx jant site snapshot export --output ./jant-site-snapshot.zip
npx jant site snapshot import --path ./jant-site-snapshot.zip --replace
```

On Cloudflare, add `--remote` and point the command at the site's Wrangler config:

```bash
npx jant site snapshot export --remote --config ./wrangler.toml --output ./jant-site-snapshot.zip
npx jant site snapshot import --remote --config ./wrangler.toml --path ./jant-site-snapshot.zip --replace
```

If you intentionally want to load a content snapshot from one site into a
different existing site container, use the explicit remap mode:

```bash
npx jant site snapshot import --path ./jant-site-snapshot.zip --replace --remap-site
```

`--remap-site` rewrites the snapshot's `site_id` and referenced storage keys to
match the resolved target site. Keep it for trusted, controlled workflows such
as demo content publishing. In `host-based` mode, the default snapshot import
path remains identity-preserving unless you opt into remapping explicitly.

### Restore on Cloudflare

For a production recovery on Cloudflare:

1. Restore the D1 database with D1 Time Travel or your own SQL export workflow.
2. Restore media from your R2 policy or secondary copy if media objects were lost.
3. Point Jant at the restored database and storage.
4. Verify pages, media URLs, settings, and collections before reopening the site.

### Restore on Node or Docker

For a default local deployment:

1. Stop the app.
2. Restore `data/jant.sqlite`.
3. Restore `data/media/`.
4. Start the app.
5. Verify pages, uploads, settings, and collections.

## Recovery drill

Yes, this should be documented. It does not need a separate playbook at first, but it does need a repeatable checklist.

Run this on a blank staging environment:

1. Restore the database.
2. Restore the media files or media bucket.
3. Start Jant against the restored data.
4. Open the home page and settings.
5. Check a sample of posts, collections, and media URLs.
6. Record how old the restored data was and how long recovery took.

Track two numbers:

- **RPO**: how much data you can afford to lose
- **RTO**: how long recovery can take

If you cannot restore into an empty environment with confidence, you do not have a real backup yet.
