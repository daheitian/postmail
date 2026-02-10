/**
 * Note Card Component
 *
 * Text-first, minimal card for type="note" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import { MediaGallery } from "../MediaGallery.js";
import * as sqid from "../../../lib/sqid.js";
import * as time from "../../../lib/time.js";

export const NoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const permalink = `/p/${sqid.encode(post.id)}`;

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
      {!compact && post.mediaAttachments.length > 0 && (
        <MediaGallery attachments={post.mediaAttachments} />
      )}
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={permalink} class="u-url hover:underline">
          <time
            class="dt-published"
            datetime={time.toISOString(post.publishedAt)}
          >
            {time.formatDate(post.publishedAt)}
          </time>
        </a>
      </footer>
    </article>
  );
};
