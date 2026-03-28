# Backups and Recovery

Jant has three different recovery tools, and they solve different problems:

| Need                                                        | Use this                                          |
| ----------------------------------------------------------- | ------------------------------------------------- |
| Move content to another site                                | `site export` and `site import`                   |
| Restore content with the same internal IDs and storage keys | `site snapshot export` and `site snapshot import` |
| Recover from production data loss                           | a real database backup plus a real media backup   |

If you remember only one rule, remember this:

**A full Jant backup always includes both the database and the uploaded media files.**

## What Counts as a Full Backup

You need both:

- the database
- the media storage

If you back up only the database, you keep posts, collections, settings, and media metadata, but not the uploaded files.

If you back up only media storage, you keep files but lose the records that point to them.

## What Site Export Is For

`site export` is a portability tool.

Use it for:

- moving content into another Jant site
- keeping a portable archive
- generating a Zola-compatible static export

Do not treat `site export` as your primary disaster-recovery plan for a live production site.

See [Export and Import](export-and-import.md) for the command guide.

## What Site Snapshot Is For

`site snapshot` is a restore-oriented content snapshot.

Use it when you want to:

- preserve post IDs and storage keys
- rebuild a known content set elsewhere
- keep a round-trip-safe content archive

Snapshots are closer to recovery than `site export`, but they still do not replace a full operational backup plan.

## Cloudflare Workers

If you run Jant on Cloudflare with D1 and R2:

- recover the database with your D1 recovery method
- treat media recovery separately from database recovery
- add off-platform exports only when your retention requirements demand them

For most small sites, a practical plan looks like this:

1. use D1 recovery for recent database problems
2. keep R2 or S3 media under a clear retention policy
3. periodically export or snapshot if you want independent copies

Remember that object durability is not the same thing as having a recovery workflow.

## Node and Docker

If you run the default Docker or Node setup, back up:

- `data/jant.sqlite`
- `data/media/`

If you use Postgres instead of SQLite, back up:

- your Postgres database
- local media storage, if you still use it

If you use S3-compatible storage instead of local media storage, back up:

- the database
- the media bucket and its retention policy

## Restore Checklists

### Cloudflare Restore

1. restore the database
2. restore missing media objects if storage loss was involved
3. deploy or point Jant at the restored resources
4. verify home page, collections, media URLs, and settings

### Docker or Node Restore

1. stop the app
2. restore the database file or database service
3. restore media files or the media bucket
4. start the app
5. verify posts, collections, uploads, and feeds

## Recovery Drill

Run a restore drill on a blank staging environment before you need one in production.

Checklist:

1. restore the database
2. restore media
3. start Jant
4. open the home page, settings, and a sample of post URLs
5. verify attachments and collection pages
6. record how long the restore took and how much data was missing

Track two numbers:

- **RPO**: how much data you can afford to lose
- **RTO**: how long recovery can take

If you cannot measure those two numbers, your backup plan is not finished.

If you cannot restore into an empty environment with confidence, you do not have a real backup yet.
