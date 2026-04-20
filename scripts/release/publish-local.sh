#!/usr/bin/env bash
#
# Build and publish all packages locally (packages/* + themes/*).
#
# Usage: scripts/release/publish-local.sh

set -euo pipefail

# Build core (consumed by themes/templates)
pnpm --filter @jant/core build

# Build all themes via glob (no hardcoded list so new themes are picked up)
pnpm -r --filter './themes/*' build

# Publish everything in packages/ and themes/
pnpm -r \
  --filter './packages/*' \
  --filter './themes/*' \
  publish --access public --no-provenance --no-git-checks
