/**
 * Quote Card
 *
 * Left-border accent blockquote with full date in footer.
 *
 * Fields:
 * - quoteText: the quoted text
 * - title: attribution (who said it)
 * - url: source link
 * - bodyHtml: commentary
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry${compact ? " feed-compact" : ""}`}
      data-post
      data-format="quote"
    >
      {post.quoteText && (
        <blockquote class="feed-quote">
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
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}
      <footer class="mt-2" data-post-meta>
        <a
          href={post.permalink}
          class="u-url text-xs text-muted-foreground hover:underline"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
