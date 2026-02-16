/**
 * Threads Theme - Quote Card
 *
 * Left-border accent blockquote — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " threads-compact" : ""}`}>
      {post.contentHtml && (
        <blockquote class="threads-quote">
          <div
            class={`e-content ${compact ? "text-sm" : "text-base"} leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
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
