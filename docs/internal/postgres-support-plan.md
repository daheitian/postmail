# Postgres Support Plan

## Goal

Add `Node + Postgres` support to `jant-core` without regressing the existing:

- `Cloudflare Workers + D1`
- `Node + SQLite`

This work is about the **core runtime and persistence layer**. It does **not**
include `jant-cloud`, billing, or a hosted control plane.

## Scope

### In scope

- Dialect-aware Node runtime selection from `DATABASE_URL`
- Postgres Drizzle schema entrypoint
- Postgres migration track
- better-auth `pg` adapter support
- Postgres-capable Node CLI and migrations
- Search abstraction so SQLite FTS and Postgres search can diverge internally

### Out of scope

- `jant-cloud`
- Worker runtime Postgres support
- Cloudflare Hyperdrive
- Full-text search parity in the first Postgres milestone
- Cross-dialect migration replay from historical SQLite migrations

## Product and Runtime Decisions

### Runtime matrix

| Runtime              | Database  | Status |
| -------------------- | --------- | ------ |
| Cloudflare Worker    | D1/SQLite | Keep   |
| Node self-hosted     | SQLite    | Keep   |
| Node hosted / future | Postgres  | Add    |
| Cloudflare Worker    | Postgres  | Later  |

### Non-goals for v1 of Postgres support

- Do not try to make Workers use Postgres yet.
- Do not make search behavior perfectly identical between SQLite and Postgres.
- Do not block Postgres bring-up on `jant-cloud`.

## Architecture Decisions

### 1. Shared domain semantics, split Drizzle schema entrypoints

Jant should continue to have one logical data model, but Drizzle schema files
should be dialect-specific.

Target layout:

```text
src/db/
  dialect.ts
  schema.ts            # compatibility export for the active SQLite path
  sqlite/
    schema.ts
    migrations/
  pg/
    schema.ts
    migrations/
```

Reason:

- Drizzle tables are dialect-specific objects.
- A single `schema.ts` should not try to masquerade as both SQLite and Postgres.
- Services should keep one domain model and one set of business rules, while the
  DB entrypoints own dialect differences.

### 2. Separate migration tracks

SQLite and Postgres must have separate schema migration directories.

Rules:

- Existing SQLite migrations remain append-only.
- Postgres starts from a fresh baseline that reflects the current site-aware
  schema.
- Backfills stay conceptually separate from schema migrations.

This avoids trying to replay SQLite-specific FTS, triggers, and D1 assumptions
against Postgres.

### 3. Node runtime becomes dialect-aware

`DATABASE_URL` should become the source of truth for Node dialect selection:

- `file:` or in-memory URLs => SQLite
- `postgres:` / `postgresql:` => Postgres

The Node runtime must branch early on dialect selection:

- connection/bootstrap
- Drizzle adapter creation
- better-auth provider selection
- migration path
- raw query / search backend wiring

### 4. Search becomes a backend abstraction

The current search stack is SQLite FTS5 + trigram tokenizer specific. Postgres
support should not be blocked on exact parity.

Plan:

- Introduce a small `SearchBackend` abstraction
- Keep SQLite search as-is behind that abstraction
- Start Postgres with a simpler implementation first
- Upgrade to PostgreSQL full-text search once the Node runtime is stable

Phase targets:

### Phase 1

- Site-scoped search works on Postgres
- Ranking and highlighting may differ from SQLite

### Phase 2

- Improve ranking
- Improve snippets/highlighting
- Revisit indexes and generated search columns

### 5. better-auth provider must be explicit

`createAuth()` should accept the active database provider instead of hard-coding
`sqlite`.

Allowed providers:

- `sqlite`
- `pg`

This keeps auth aligned with the runtime-selected dialect and avoids hiding a
cross-database assumption inside one helper.

## Implementation Order

### Phase 0: Planning and groundwork

- Add this design document
- Add database dialect helpers
- Make auth provider selection explicit
- Update Node URL parsing so Postgres is a recognized target, even before the
  full runtime is implemented

### Phase 1: Postgres schema and migration track

- Add `src/db/pg/schema.ts`
- Add `drizzle.config.pg.ts`
- Add `src/db/migrations/pg/0000_*.sql`
- Keep SQLite schema/migrations intact

Deliverable:

- A fresh Postgres database can be initialized to the current site-aware schema

### Phase 2: Node runtime and CLI support

- Add Postgres driver dependency and Node connection setup
- Make `createNodeRequestRuntime()` and `createNodeCliRuntime()` dialect-aware
- Make `jant migrate` choose the correct Node migration path from
  `DATABASE_URL`
- Keep D1 commands unchanged

Deliverable:

- `jant start` and `jant migrate` work against Postgres on Node

### Phase 3: Search support

- Introduce `SearchBackend`
- Wire SQLite search backend
- Add minimal Postgres search backend
- Ensure all search paths remain site-scoped

Deliverable:

- Search works on Postgres, even if result ranking differs from SQLite

### Phase 4: Verification and polish

- Add Node + Postgres test coverage
- Add migration smoke tests
- Add config docs for Postgres
- Add Docker / compose support if needed

## Major Risks

### Search parity

Search is the largest functional difference between SQLite and Postgres. This
should be treated as a staged migration, not a prerequisite for runtime
support.

### DB abstraction creep

Trying to hide all dialect differences behind one overly generic DB type will
likely make the code harder to reason about. Keep business rules shared, but let
the DB layer stay honest about dialect-specific behavior.

### CLI drift

Current CLI flows are strongly D1/SQLite-shaped. Node Postgres support should be
added without muddying the existing D1 commands.

## Verification Plan

### Groundwork phases

- `mise run check-types`
- Focused Vitest coverage for new dialect helpers and Node runtime parsing

### Runtime / auth / migration phases

- `mise run check-tests`
- `mise run check-lint`

### Postgres CI smoke

The first Postgres CI layer should stay intentionally small:

- use a local GitHub Actions Postgres service container
- do not depend on a remote managed Postgres service
- run a focused HTTP smoke instead of the full test suite

Current smoke contract:

- reset the target database to a blank schema
- run `jant migrate`
- verify `GET /setup` does not create a site shell eagerly
- verify `POST /setup` creates the shell
- sign in over the real auth route
- create a post over `POST /compose`
- read it back over a public route such as `/archive`
- update settings over `/api/settings`

This gives us real Postgres engine coverage without taking on the maintenance
cost of a full cross-dialect fixture matrix yet.

### Postgres-specific manual checks

- `jant migrate` against a fresh Postgres database
- `jant start` against Postgres
- smoke test:
  - onboarding or setup
  - sign in
  - create post
  - create collection
  - upload media
  - export site

## Next Immediate Changes

The first implementation slice should do only these:

- add database dialect helpers
- make auth provider explicit
- document the migration/runtime split

The next slice after that should start the Postgres schema entrypoint and
migration track.
