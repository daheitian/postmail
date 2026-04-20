#!/usr/bin/env bash
#
# Remove a worktree and its branch.
#
# Usage: scripts/worktree/remove.sh <branch>

set -euo pipefail

BRANCH_NAME="${1:?missing branch name}"
# Normalize branch name for directory: feat/login -> feat-login
DIR_NAME=$(echo "$BRANCH_NAME" | tr '/' '-')
WORKTREE_PATH="../$DIR_NAME"

# Safety: prevent deleting the main worktree
CURRENT_DIR=$(basename "$(pwd)")
if [ "$DIR_NAME" = "$CURRENT_DIR" ]; then
  echo "Cannot remove the current worktree. Run this from a different worktree."
  exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Worktree not found: $WORKTREE_PATH"
  echo ""
  echo "Available worktrees:"
  git worktree list
  exit 1
fi

echo "Removing worktree: $WORKTREE_PATH"
git worktree remove "$WORKTREE_PATH" --force

echo "Deleting branch: $BRANCH_NAME"
git branch -D "$BRANCH_NAME" 2>/dev/null || echo "Branch '$BRANCH_NAME' not found (already deleted?)"

echo "Done."
