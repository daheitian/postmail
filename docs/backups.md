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

If you run Jant on Node or Docker with the default local storage layout, back up both of these paths:

- `data/jant.sqlite`
- `data/media/`

If you use S3-compatible storage instead of local media storage, back up:

- `data/jant.sqlite`
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
export JANT_TOKEN=jnt_YOUR_TOKEN
npx jant site import --url https://your-site.com --path ./jant-site-export.zip
```

This is the right tool for migration and content recovery. It is not the same as restoring your production database and storage byte-for-byte.

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
