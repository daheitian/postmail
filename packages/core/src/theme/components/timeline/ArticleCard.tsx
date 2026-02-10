/**
 * Article Card Component
 *
 * Prominent title + excerpt for type="article" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";
import * as sqid from "../../../lib/sqid.js";
import * as time from "../../../lib/time.js";

export const ArticleCard: FC<TimelineCardProps> = ({ post, compact }) => {
  const permalink = `/p/${sqid.encode(post.id)}`;
  const excerpt = post.content
    ? post.content.length > 160
      ? post.content.slice(0, 160) + "..."
      : post.content
    : null;

  return (
    <article
      class={`h-entry timeline-card${compact ? " timeline-card-compact" : ""}`}
    >
      {post.title && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-lg"} mb-1`}
        >
          <a href={permalink} class="u-url hover:underline">
            {post.title}
          </a>
        </h2>
      )}
      {!compact && excerpt && (
        <p class="e-content text-sm text-muted-foreground line-clamp-3">
          {excerpt}
        </p>
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
        {!compact && (
          <span class="ml-2">
            <a href={permalink} class="hover:underline">
              Read more &rarr;
            </a>
          </span>
        )}
      </footer>
    </article>
  );
};
