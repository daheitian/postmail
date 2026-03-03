/**
 * Post Status Badges
 *
 * Renders pinned / featured indicators at the top of a post card.
 * Shown on a single line above the title, with muted styling.
 */

import type { FC } from "hono/jsx";
import type { PostView } from "../../types.js";

interface PostStatusBadgesProps {
  post: PostView;
}

export const PostStatusBadges: FC<PostStatusBadgesProps> = ({ post }) => {
  const isPinned = post.pinned;
  const isFeatured = post.visibility === "featured";

  if (!isPinned && !isFeatured) return null;

  return (
    <div class="post-status-badges">
      {isPinned && (
        <span class="post-status-badge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" x2="12" y1="17" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
          Pinned
        </span>
      )}
      {isPinned && isFeatured && (
        <span class="post-status-separator" aria-hidden="true">
          &middot;
        </span>
      )}
      {isFeatured && (
        <span class="post-status-badge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          Featured
        </span>
      )}
    </div>
  );
};
