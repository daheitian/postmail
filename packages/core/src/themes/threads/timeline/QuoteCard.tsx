/**
 * Threads Theme - Quote Card
 *
 * Left-border accent blockquote — date is shown at the feed level as a group header.
 *
 * v2 fields:
 * - quoteText: the quoted text
 * - title: attribution (who said it)
 * - url: source link
 * - bodyHtml: commentary
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " threads-compact" : ""}`}>
      {post.quoteText && (
        <blockquote class="threads-quote">
          <div
            class={`e-content ${compact ? "text-sm" : "text-base"} leading-relaxed`}
          >
            {post.quoteText}
          </div>
        </blockquote>
      )}
      {!compact && (post.title || post.url) && (
        <div class="mt-2 text-sm text-muted-foreground">
          &mdash;{" "}
          {post.url ? (
            <a
              href={post.url}
              class="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.title || "Source"}
            </a>
          ) : (
            <span>{post.title}</span>
          )}
        </div>
      )}
      {!compact && post.bodyHtml && (
        <div
          class="mt-3 prose text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
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
