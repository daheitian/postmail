/**
 * Quote Card Component
 *
 * Blockquote + attribution for type="quote" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry timeline-card timeline-card-quote${compact ? " timeline-card-compact" : ""}`}
    >
      {post.contentHtml && (
        <blockquote
          class={`e-content italic ${compact ? "text-sm" : "text-base"} leading-relaxed`}
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
