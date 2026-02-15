/**
 * Minimal Theme - Image Card
 *
 * Inline images with no card frame for type="image" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import { MediaGallery } from "../../../theme/components/MediaGallery.js";

export const ImageCard: FC<TimelineCardProps> = ({ post, compact }) => {
  if (compact) {
    return (
      <article class="h-entry text-sm">
        {post.title && (
          <h2 class="p-name font-medium text-sm">
            <a href={post.permalink} class="u-url hover:underline">
              {post.title}
            </a>
          </h2>
        )}
        {post.contentHtml && (
          <div
            class="e-content prose prose-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        )}
        <footer class="mt-1">
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
  }

  return (
    <article class="h-entry">
      {post.contentHtml && (
        <div
          class="e-content prose prose-sm"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      {post.media.length > 0 && <MediaGallery attachments={post.media} />}
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
