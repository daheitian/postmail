#!/usr/bin/env bash
#
# Remove all worktrees except the current one and delete their branches.
#
# Usage: scripts/worktree/remove-all.sh

set -euo pipefail

CURRENT=$(git rev-parse --show-toplevel)

git worktree list | while read -r path _commit branch_info; do
  if [ "$path" = "$CURRENT" ]; then
    continue
  fi
  branch=$(echo "$branch_info" | tr -d '[]')
  echo "Removing: $path [$branch]"
  git worktree remove "$path" --force
  if [ -n "$branch" ] && [ "$branch" != "main" ]; then
    git branch -D "$branch" 2>/dev/null || true
  fi
done

echo "Done."
