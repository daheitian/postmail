/**
 * Post List Component
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Post } from "../../types.js";
import * as sqid from "../../lib/sqid.js";
import * as time from "../../lib/time.js";
import { StatusBadge } from "./StatusBadge.js";
import { FormatBadge } from "./FormatBadge.js";
import { EmptyState } from "./EmptyState.js";
import { ListItemRow } from "./ListItemRow.js";
import { ActionButtons } from "./ActionButtons.js";

export interface PostListProps {
  posts: Post[];
}

export const PostList: FC<PostListProps> = ({ posts }) => {
  const { t } = useLingui();
  if (posts.length === 0) {
    return (
      <EmptyState
        message={t({
          message: "No posts yet.",
          comment: "@context: Empty state message when no posts exist",
        })}
        ctaText={t({
          message: "Create your first post",
          comment: "@context: Button in empty state to create first post",
        })}
        ctaHref="/dash/posts/new"
      />
    );
  }

  return (
    <div class="flex flex-col divide-y">
      {posts.map((post) => {
        const permalink = post.path
          ? `/${post.path}`
          : `/p/${sqid.encode(post.id)}`;
        return (
          <ListItemRow
            key={post.id}
            actions={
              <ActionButtons
                editHref={`/dash/posts/${sqid.encode(post.id)}/edit`}
                editLabel={t({
                  message: "Edit",
                  comment: "@context: Button to edit post",
                })}
                viewHref={permalink}
                viewLabel={t({
                  message: "View",
                  comment: "@context: Button to view post on public site",
                })}
                deleteAction={`/dash/posts/${sqid.encode(post.id)}/delete`}
                deleteConfirm={t({
                  message:
                    "Are you sure you want to delete this post? This cannot be undone.",
                  comment:
                    "@context: Confirmation dialog when deleting a post from the list",
                })}
              />
            }
          >
            <div class="flex items-center gap-2 mb-1">
              <FormatBadge type={post.format} />
              <StatusBadge
                status={post.status}
                featured={post.featured === 1}
                pinned={post.pinned === 1}
              />
              <span class="text-xs text-muted-foreground">
                {time.formatDate(post.publishedAt)}
              </span>
            </div>
            <a
              href={`/dash/posts/${sqid.encode(post.id)}`}
              class="font-medium hover:underline"
            >
              {post.title ||
                post.body?.slice(0, 60) ||
                t({
                  message: "Untitled",
                  comment: "@context: Default title for untitled post",
                })}
            </a>
            {post.body && !post.title && (
              <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                {post.body.slice(0, 120)}
              </p>
            )}
          </ListItemRow>
        );
      })}
    </div>
  );
};
