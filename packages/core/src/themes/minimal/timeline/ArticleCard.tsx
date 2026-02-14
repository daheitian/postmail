/**
 * Minimal Theme - Article Card
 *
 * Title + excerpt, borderless, for type="article" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const ArticleCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " text-sm" : ""}`}>
      {post.title && (
        <h2 class={`p-name font-semibold ${compact ? "text-sm" : "text-lg"}`}>
          <a href={post.permalink} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}
      {!compact && post.excerpt && (
        <p class="e-content text-muted-foreground mt-1 line-clamp-3">
          {post.excerpt}
        </p>
      )}
      <footer class="mt-2">
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground hover:text-foreground"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
