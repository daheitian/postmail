/**
 * Card Theme - Note Card
 *
 * Text-first, bordered card for format="note" posts.
 * With title = article-style rendering with summary; without title = short note.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";
import { MediaGallery } from "@jant/core/theme";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const isArticle = !!post.title;
  const displayHtml = isArticle ? post.summaryHtml : post.bodyHtml;

  return (
    <article
      class={`h-entry timeline-card${compact ? " timeline-card-compact" : ""}`}
    >
      {isArticle && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-lg"} mb-1`}
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
        <MediaGallery attachments={post.media} />
      )}
      {!compact && isArticle && post.summaryHasMore && (
        <a
          href={post.permalink}
          class="text-sm text-muted-foreground hover:underline mt-1 inline-block"
        >
          Read more →
        </a>
      )}
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={post.permalink} class="u-url hover:underline">
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
