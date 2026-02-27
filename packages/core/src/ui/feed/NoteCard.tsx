/**
 * Note Card
 *
 * Without title: plain text note with full date in footer.
 * With title: article-style rendering with summary excerpt and "Read more" link.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const isArticle = !!post.title;
  const displayHtml = isArticle ? post.summaryHtml : post.bodyHtml;

  return (
    <article
      class={`h-entry post-menu-target${compact ? " feed-compact" : ""}`}
      data-post
      data-format="note"
      data-post-id={post.sqid}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
    >
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
      <footer class="post-menu-footer" data-post-meta>
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground hover:underline"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
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
      </footer>
    </article>
  );
};
