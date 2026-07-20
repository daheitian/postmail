#!/usr/bin/env bash
#
# Merge the primary worktree's current branch into the fixed worker worktrees.
#
# Usage: scripts/worktree/sync.sh

set -euo pipefail

TARGET_BRANCHES=("1" "2" "3" "multi" "worker")

find_primary_worktree() {
  git worktree list --porcelain | awk '
    /^worktree / {
      print substr($0, 10)
      exit
    }
  '
}

find_worktree_for_branch() {
  local target_branch="$1"

  git worktree list --porcelain | awk -v target_ref="refs/heads/$target_branch" '
    /^worktree / {
      worktree_path = substr($0, 10)
      next
    }
    $1 == "branch" && $2 == target_ref {
      print worktree_path
      exit
    }
  '
}

print_worktree_changes() {
  local worktree_path="$1"

  git -C "$worktree_path" status --short
}

SOURCE_PATH=$(find_primary_worktree)
if [ -z "$SOURCE_PATH" ]; then
  echo "Cannot find the primary Git worktree."
  exit 1
fi

SOURCE_BRANCH=$(git -C "$SOURCE_PATH" symbolic-ref --quiet --short HEAD || true)
if [ -z "$SOURCE_BRANCH" ]; then
  echo "Cannot sync from '$SOURCE_PATH' because it has a detached HEAD."
  exit 1
fi

if ! git -C "$SOURCE_PATH" rev-parse --verify --quiet HEAD >/dev/null; then
  echo "Cannot sync '$SOURCE_BRANCH' because it has no commits."
  exit 1
fi

echo "Source: $SOURCE_BRANCH ($SOURCE_PATH)"
echo "Targets: ${TARGET_BRANCHES[*]}"
echo ""
echo "Checking worktrees..."

preflight_failed=0

if [ -n "$(git -C "$SOURCE_PATH" status --porcelain --untracked-files=normal)" ]; then
  echo ""
  echo "Source worktree is not clean: $SOURCE_PATH"
  print_worktree_changes "$SOURCE_PATH"
  echo "Commit or stash these changes before syncing."
  preflight_failed=1
fi

for target_branch in "${TARGET_BRANCHES[@]}"; do
  target_path=$(find_worktree_for_branch "$target_branch")

  if [ -z "$target_path" ]; then
    echo ""
    echo "Target branch '$target_branch' is not checked out in a worktree."
    preflight_failed=1
    continue
  fi

  if [ -n "$(git -C "$target_path" status --porcelain --untracked-files=normal)" ]; then
    echo ""
    echo "Target worktree is not clean: $target_branch ($target_path)"
    print_worktree_changes "$target_path"
    echo "Commit or stash these changes before syncing."
    preflight_failed=1
  fi
done

if [ "$preflight_failed" -ne 0 ]; then
  echo ""
  echo "Nothing was merged."
  exit 1
fi

echo "All worktrees are clean."
echo "Checking whether every merge can be applied cleanly..."

needs_merge_commit=0
for target_branch in "${TARGET_BRANCHES[@]}"; do
  if git merge-base --is-ancestor "$SOURCE_BRANCH" "$target_branch"; then
    continue
  fi

  if git merge-base --is-ancestor "$target_branch" "$SOURCE_BRANCH"; then
    continue
  fi

  needs_merge_commit=1
  if ! merge_check=$(git merge-tree --write-tree --name-only "$target_branch" "$SOURCE_BRANCH" 2>&1); then
    echo ""
    echo "'$SOURCE_BRANCH' cannot be merged cleanly into '$target_branch':"
    printf '%s\n' "$merge_check"
    preflight_failed=1
  fi
done

if [ "$needs_merge_commit" -ne 0 ] && ! git -C "$SOURCE_PATH" var GIT_COMMITTER_IDENT >/dev/null 2>&1; then
  echo ""
  echo "A merge commit is required, but Git does not have a committer identity."
  echo "Configure user.name and user.email before syncing."
  preflight_failed=1
fi

if [ "$preflight_failed" -ne 0 ]; then
  echo ""
  echo "Nothing was merged."
  exit 1
fi

echo "Every target can be synced cleanly."
echo ""

merged_count=0
skipped_count=0

for target_branch in "${TARGET_BRANCHES[@]}"; do
  target_path=$(find_worktree_for_branch "$target_branch")

  if git merge-base --is-ancestor "$SOURCE_BRANCH" "$target_branch"; then
    echo "Skipping $target_branch: already contains $SOURCE_BRANCH."
    skipped_count=$((skipped_count + 1))
    continue
  fi

  echo "Merging $SOURCE_BRANCH into $target_branch ($target_path)..."
  if ! git -C "$target_path" merge --no-edit "$SOURCE_BRANCH"; then
    if git -C "$target_path" rev-parse --verify --quiet MERGE_HEAD >/dev/null; then
      git -C "$target_path" merge --abort || true
    fi
    echo "Sync stopped while merging '$target_branch'. Earlier targets may already be updated."
    exit 1
  fi
  merged_count=$((merged_count + 1))
done

echo ""
echo "Sync complete: $merged_count merged, $skipped_count already up to date."
