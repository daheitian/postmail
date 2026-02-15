/**
 * Threads Theme - Article Card
 *
 * Bold title with excerpt — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";

export const ArticleCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " threads-compact" : ""}`}>
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
      {!compact && (
        <div class="mt-2 text-sm">
          <a
            href={post.permalink}
            class="text-muted-foreground hover:underline"
          >
            Read more &rarr;
          </a>
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
