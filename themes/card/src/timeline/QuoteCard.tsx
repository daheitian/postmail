/**
 * Card Theme - Quote Card
 *
 * Blockquote + attribution for format="quote" posts.
 *
 * v2 fields:
 * - quoteText: the quoted text
 * - title: attribution (who said it)
 * - url: source link
 * - bodyHtml: commentary
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry timeline-card timeline-card-quote${compact ? " timeline-card-compact" : ""}`}
    >
      {post.quoteText && (
        <blockquote
          class={`e-content italic ${compact ? "text-sm" : "text-base"} leading-relaxed`}
        >
          <div>{post.quoteText}</div>
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
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={post.permalink} class="u-url hover:underline">
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
