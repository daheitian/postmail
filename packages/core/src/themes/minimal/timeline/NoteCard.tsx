/**
 * Minimal Theme - Note Card
 *
 * Borderless, content-first card for type="note" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import { MediaGallery } from "../../../theme/components/MediaGallery.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " text-sm" : ""}`}>
      {post.contentHtml && (
        <div
          class={`e-content prose ${compact ? "prose-sm" : ""}`}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      {!compact && post.media.length > 0 && (
        <MediaGallery attachments={post.media} />
      )}
      <footer class="mt-2">
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground/60 hover:text-foreground tabular-nums"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtTime}
          </time>
        </a>
      </footer>
    </article>
  );
};
