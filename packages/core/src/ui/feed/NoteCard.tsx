/**
 * Note Card
 *
 * Without title: plain text note with full date in footer.
 * With title: article-style rendering with summary excerpt and "Read more" link.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";
import { StarRating } from "../shared/StarRating.js";
import { PostStatusBadges } from "./PostStatusBadges.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const isArticle = !!post.title;
  const displayHtml = isArticle ? post.summaryHtml : post.bodyHtml;

  return (
    <article
      class={`h-entry post-menu-target${compact ? " feed-compact" : ""}`}
      data-post
      data-format="note"
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
    >
      {!compact && <PostStatusBadges />}
      {isArticle && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-base"} mb-1`}
        >
          <a href={post.permalink} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}
      {displayHtml && (
        <div
          class={`e-content prose ${compact ? "prose-sm" : isArticle ? "text-muted-foreground" : ""}`}
          data-post-body
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )}
      {!compact && post.media.length > 0 && (
        <div class="mt-3" data-post-media>
          <MediaGallery attachments={post.media} />
        </div>
      )}
      {!compact && isArticle && post.summaryHasMore && (
        <a
          href={`${post.permalink}#continue`}
          class="text-sm text-muted-foreground hover:underline mt-1 inline-block"
        >
          Continue →
        </a>
      )}
      {!compact && <StarRating rating={post.rating} />}
      <footer class="post-menu-footer" data-post-meta>
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground hover:underline"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
        <div class="post-menu-actions">
          <button
            type="button"
            class="reply-trigger"
            aria-label="Reply"
            data-reply-trigger
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <button
            type="button"
            class="post-menu-trigger"
            aria-label="More actions"
            data-post-menu-trigger
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </footer>
    </article>
  );
};
