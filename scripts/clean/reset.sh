#!/usr/bin/env bash
#
# Nuclear reset: delete node_modules, dist, cache, db, and the lock file, then
# reinstall dependencies.
#
# Usage: scripts/clean/reset.sh

set -euo pipefail

echo "Nuclear reset - deleting everything..."
echo ""
echo "Removing node_modules..."
rm -rf node_modules packages/*/node_modules templates/*/node_modules themes/*/node_modules

echo "Removing build artifacts..."
rm -rf packages/*/dist themes/*/dist templates/*/dist packages/create-jant/template/dist

echo "Removing local databases and Wrangler state..."
rm -rf packages/*/.wrangler templates/*/.wrangler packages/create-jant/template/.wrangler

echo "Removing Vite cache..."
rm -rf packages/*/.vite templates/*/.vite packages/create-jant/template/.vite

echo "Removing i18n build cache..."
rm -rf packages/*/.lingui-build

echo "Removing generated examples..."
rm -rf examples/

echo "Removing lock file..."
rm -f pnpm-lock.yaml

echo ""
echo "Everything deleted! Now reinstalling dependencies..."
echo ""
pnpm install

echo ""
echo "Fresh install complete! Project is now in pristine state."
echo ""
echo "Next step:"
echo "   mise run dev    # Start development (auto-runs migrations)"
echo ""
