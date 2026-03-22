# Demo Public Operations

`sites/demo` is the public demo runtime at `demo.jant.me`.

The daily operational commands still live in the root `mise.toml` because the
workflow crosses both `sites/demo-source` and `sites/demo`, and `sites/demo`
also doubles as the starter template source.

## Common Commands

```sh
mise run demo-public-bootstrap
mise run demo-public-rebuild
mise run demo-public-verify
mise run demo-public-clear-content
mise run demo-public-clear-api-tokens
```

## Environment Files for Repo Tasks

Repo-level demo tasks now auto-load:

1. `sites/demo/.env.local`
2. `sites/demo/.env`
3. repo root `.env.repo.local`
4. repo root `.env.repo`
5. legacy repo root `.env.local`
6. legacy repo root `.env`

Shell environment variables still win over all of them.

Recommended split:

- repo root `.env.repo.local`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  Start from [/.env.repo.example](/Users/green/project/jant/main/.env.repo.example).
- [`sites/demo/.env.example`](/Users/green/project/jant/main/sites/demo/.env.example):
  copy to `.env.local` for `INTERNAL_ADMIN_TOKEN`, plus any local
  overrides such as `DEMO_PUBLIC_URL`, `DEMO_EMAIL`, or `DEMO_PASSWORD`

## Expected Flow

1. Curate content in `demo-source`.
2. Freeze it with `mise run demo-source-export-canonical`.
3. Review and commit `sites/demo-source/canonical/snapshot/`.
4. Publish it to `demo-public` with `mise run demo-public-rebuild`.
5. Let `.github/workflows/reset-demo.yml` re-run the same rebuild nightly.

## Notes

- `demo-public-rebuild` is snapshot-based. It no longer imports the old static
  site export.
- `demo-public-rebuild` keeps a standalone storage cleanup step before import.
  That cleanup exists so demo maintenance can enforce its own storage policy
  separately from the normal snapshot restore contract.
- `demo-public-rebuild` also clears every user-created API token through
  `INTERNAL_ADMIN_TOKEN`, so demo tokens are disposable across nightly
  resets.
- The rebuild workflow still imports the canonical snapshot with an explicit
  remap intent rather than relying on implicit single-site behavior.
- `db-demo-reseed` remains as a compatibility alias for
  `mise run demo-public-rebuild`.
