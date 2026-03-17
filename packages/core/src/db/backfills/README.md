# Data Backfills

Use this directory for append-only historical data fixes that must run after
schema migrations.

- Name files `0000_description.sql`, `0001_description.sql`, and so on.
- Keep every backfill idempotent or guarded so reruns stay safe.
- Run them through `jant migrate`, not `wrangler d1 migrations apply`.
- Do not put historical business-data fixes in `src/db/migrations/`.
- Rare hand-written schema exceptions that Drizzle cannot express, such as FTS
  virtual tables or triggers, still belong in `src/db/migrations/`.
