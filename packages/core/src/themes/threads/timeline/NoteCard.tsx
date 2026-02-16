/**
 * Threads Theme - Note Card
 *
 * Plain text content — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import { MediaGallery } from "../../../theme/index.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " threads-compact" : ""}`}>
      {post.contentHtml && (
        <div
          class={`e-content prose ${compact ? "prose-sm" : "prose-sm"}`}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      {!compact && post.media.length > 0 && (
        <div class="threads-media mt-3">
          <MediaGallery attachments={post.media} />
        </div>
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
