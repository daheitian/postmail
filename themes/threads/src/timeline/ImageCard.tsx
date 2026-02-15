/**
 * Threads Theme - Image Card
 *
 * Full-width images with rounded corners — date is shown at the feed level.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";
import { MediaGallery } from "@jant/core/theme";

export const ImageCard: FC<TimelineCardProps> = ({ post, compact }) => {
  if (compact) {
    return (
      <article class="h-entry threads-compact">
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
      </article>
    );
  }

  return (
    <article class="h-entry">
      {post.media.length > 0 && (
        <div class="threads-media">
          <MediaGallery attachments={post.media} />
        </div>
      )}
      {post.title && (
        <h2 class="p-name font-medium mt-2 mb-1">
          <a href={post.permalink} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}
      {post.contentHtml && (
        <div
          class="e-content prose prose-sm mt-2"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
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
