/**
 * Card Theme - Link Card
 *
 * External link emphasis for type="link" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";

export const LinkCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry timeline-card timeline-card-link${compact ? " timeline-card-compact" : ""}`}
    >
      {post.sourceDomain && (
        <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <svg
            class="size-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
          >
            <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span>{post.sourceDomain}</span>
        </div>
      )}
      {post.title && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-base"} mb-1`}
        >
          <a
            href={post.sourceUrl || post.permalink}
            class="u-url hover:underline"
            target={post.sourceUrl ? "_blank" : undefined}
            rel={post.sourceUrl ? "noopener noreferrer" : undefined}
          >
            {post.title}
          </a>
        </h2>
      )}
      {!compact && post.contentHtml && (
        <div
          class="e-content prose prose-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      <footer class="mt-2 text-xs text-muted-foreground">
        <a href={post.permalink} class="hover:underline">
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
