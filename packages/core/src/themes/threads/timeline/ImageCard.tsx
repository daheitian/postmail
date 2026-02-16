/**
 * Threads Theme - Image Card
 *
 * Full-width images with horizontal scrolling carousel — matches Threads.net style.
 * All images sit in a single row regardless of count.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

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

  const images = post.media.filter((a) => a.mimeType.startsWith("image/"));

  return (
    <article class="h-entry">
      {images.length > 0 && (
        <div class="threads-media threads-carousel">
          {images.length === 1 ? (
            <a href={images[0]!.url} target="_blank" rel="noopener noreferrer">
              <img
                src={images[0]!.thumbnailUrl}
                alt={images[0]!.altText || ""}
                width={images[0]!.width ?? undefined}
                height={images[0]!.height ?? undefined}
                class="rounded-lg max-w-full h-auto"
                loading="lazy"
              />
            </a>
          ) : (
            <div class="threads-carousel-track">
              {images.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="threads-carousel-item"
                >
                  <img
                    src={img.thumbnailUrl}
                    alt={img.altText || ""}
                    class="threads-carousel-img"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
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
