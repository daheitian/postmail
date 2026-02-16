/**
 * Threads Theme - Note Card
 *
 * Without title: plain text note — date is shown at the feed level as a group header.
 * With title: article-style rendering with summary excerpt and "Read more" link.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import { MediaGallery } from "../../../theme/index.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const isArticle = !!post.title;
  const displayHtml = isArticle ? post.summaryHtml : post.bodyHtml;

  return (
    <article class={`h-entry${compact ? " threads-compact" : ""}`}>
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
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )}
      {!compact && post.media.length > 0 && (
        <div class="threads-media mt-3">
          <MediaGallery attachments={post.media} />
        </div>
      )}
      {!compact && isArticle && post.summaryHasMore && (
        <a
          href={post.permalink}
          class="text-sm text-muted-foreground hover:underline mt-1 inline-block"
        >
          Read more →
        </a>
      )}
      <footer class="mt-2">
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground hover:underline"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtRelative}
          </time>
        </a>
      </footer>
    </article>
  );
};
