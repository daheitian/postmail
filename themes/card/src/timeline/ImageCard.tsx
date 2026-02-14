/**
 * Card Theme - Image Card
 *
 * Image-first layout for type="image" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";
import { MediaGallery } from "@jant/core/theme";

export const ImageCard: FC<TimelineCardProps> = ({ post, compact }) => {
  if (compact) {
    return (
      <article class="h-entry timeline-card timeline-card-compact">
        {post.title && (
          <h2 class="p-name text-sm font-medium mb-1">
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
        <footer class="mt-1 text-xs text-muted-foreground">
          <a href={post.permalink} class="u-url hover:underline">
            <time class="dt-published" datetime={post.publishedAt}>
              {post.publishedAtFormatted}
            </time>
          </a>
        </footer>
      </article>
    );
  }

  return (
    <article class="h-entry timeline-card timeline-card-image">
      {post.media.length > 0 && (
        <div class="timeline-card-image-gallery">
          <MediaGallery attachments={post.media} />
        </div>
      )}
      <div class="p-4">
        {post.title && (
          <h2 class="p-name font-medium mb-1">
            <a href={post.permalink} class="u-url hover:underline">
              {post.title}
            </a>
          </h2>
        )}
        {post.contentHtml && (
          <div
            class="e-content prose prose-sm"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        )}
        <footer class="mt-2 text-xs text-muted-foreground">
          <a href={post.permalink} class="u-url hover:underline">
            <time class="dt-published" datetime={post.publishedAt}>
              {post.publishedAtFormatted}
            </time>
          </a>
        </footer>
      </div>
    </article>
  );
};
