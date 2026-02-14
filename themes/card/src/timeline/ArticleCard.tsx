/**
 * Card Theme - Article Card
 *
 * Prominent title + excerpt for type="article" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";

export const ArticleCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry timeline-card${compact ? " timeline-card-compact" : ""}`}
    >
      {post.title && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-lg"} mb-1`}
        >
          <a href={post.permalink} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}
      {!compact && post.excerpt && (
        <p class="e-content text-sm text-muted-foreground line-clamp-3">
          {post.excerpt}
        </p>
      )}
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={post.permalink} class="u-url hover:underline">
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
        {!compact && (
          <span class="ml-2">
            <a href={post.permalink} class="hover:underline">
              Read more &rarr;
            </a>
          </span>
        )}
      </footer>
    </article>
  );
};
