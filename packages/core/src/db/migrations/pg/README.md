# PostgreSQL migrations

This directory is reserved for the append-only PostgreSQL schema migration
track.

SQLite and PostgreSQL must not share the same migration files. The SQLite
history in `src/db/migrations/` remains authoritative for D1 and Node SQLite,
while PostgreSQL gets its own baseline and follow-up migrations here.
