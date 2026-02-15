/**
 * Minimal Theme - Quote Card
 *
 * Subtle blockquote with left border for type="quote" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " text-sm" : ""}`}>
      {post.contentHtml && (
        <blockquote
          class={`e-content border-l-2 border-muted-foreground/30 pl-4 italic ${compact ? "text-sm" : ""} leading-relaxed`}
        >
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        </blockquote>
      )}
      {!compact && (post.sourceName || post.sourceUrl) && (
        <div class="mt-2 text-sm text-muted-foreground">
          &mdash;{" "}
          {post.sourceUrl ? (
            <a
              href={post.sourceUrl}
              class="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.sourceName || post.sourceDomain || "Source"}
            </a>
          ) : (
            <span>{post.sourceName}</span>
          )}
        </div>
      )}
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
