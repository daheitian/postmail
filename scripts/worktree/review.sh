#!/usr/bin/env bash
#
# Create a review worktree from a remote branch.
#
# Usage: scripts/worktree/review.sh <branch>
#
# Example:
#   scripts/worktree/review.sh feat/login

set -euo pipefail

BRANCH="${1:?missing branch name}"

# Fetch latest from remote
git fetch origin

# Check if remote branch exists
if ! git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  echo "Remote branch 'origin/$BRANCH' not found."
  echo ""
  echo "Available remote branches:"
  git branch -r --list 'origin/*' | grep -v HEAD | sed 's|origin/||' | sort
  exit 1
fi

DIR_NAME="review-$(echo "$BRANCH" | tr '/' '-')"
WORKTREE_PATH="../$DIR_NAME"

if [ -d "$WORKTREE_PATH" ]; then
  echo "Review worktree already exists: $WORKTREE_PATH"
  exit 1
fi

git worktree add -b "$BRANCH" "$WORKTREE_PATH" "origin/$BRANCH"

# Copy secrets file if it exists
if [ -f "packages/core/.dev.vars" ]; then
  cp packages/core/.dev.vars "$WORKTREE_PATH/packages/core/.dev.vars"
  echo "Copied .dev.vars"
fi

# Install dependencies
echo "Installing dependencies..."
(cd "$WORKTREE_PATH" && pnpm install)

echo ""
echo "Review worktree ready: $WORKTREE_PATH"
echo "  cd $WORKTREE_PATH"
