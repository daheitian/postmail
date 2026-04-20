#!/usr/bin/env bash
#
# Create a new feature worktree.
#
# Usage: scripts/worktree/draft.sh <name> [base]
#
# Example:
#   scripts/worktree/draft.sh feat/login main

set -euo pipefail

NAME="${1:?missing worktree name (e.g. feat/login)}"
BASE="${2:-main}"

# Normalize branch name for directory: feat/login -> feat-login
DIR_NAME=$(echo "$NAME" | tr '/' '-')
WORKTREE_PATH="../$DIR_NAME"

if [ -d "$WORKTREE_PATH" ]; then
  echo "Worktree already exists: $WORKTREE_PATH"
  exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$NAME"; then
  echo "Branch '$NAME' already exists, reusing it..."
  git worktree add "$WORKTREE_PATH" "$NAME"
else
  echo "Creating worktree from '$BASE'..."
  git worktree add -b "$NAME" "$WORKTREE_PATH" "$BASE"
fi

# Copy secrets file if it exists
if [ -f "packages/core/.dev.vars" ]; then
  cp packages/core/.dev.vars "$WORKTREE_PATH/packages/core/.dev.vars"
  echo "Copied .dev.vars"
fi

# Install dependencies (worktrees don't share node_modules)
echo "Installing dependencies..."
(cd "$WORKTREE_PATH" && pnpm install)

echo ""
echo "Worktree ready: $WORKTREE_PATH"
echo "  cd $WORKTREE_PATH && mise run dev"
