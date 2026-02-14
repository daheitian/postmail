/**
 * Card Theme - Note Card
 *
 * Text-first, bordered card for type="note" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";
import { MediaGallery } from "@jant/core/theme";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry timeline-card${compact ? " timeline-card-compact" : ""}`}
    >
      {post.contentHtml && (
        <div
          class={`e-content prose ${compact ? "prose-sm" : "prose-sm"}`}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      {!compact && post.media.length > 0 && (
        <MediaGallery attachments={post.media} />
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
