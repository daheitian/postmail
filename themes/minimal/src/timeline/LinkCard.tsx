/**
 * Minimal Theme - Link Card
 *
 * Compact link preview box — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "@jant/core";

export const LinkCard: FC<TimelineCardProps> = ({ post, compact }) => {
  // Extract domain from URL for display
  let domain: string | undefined;
  if (post.url) {
    try {
      domain = new URL(post.url).hostname.replace(/^www\./, "");
    } catch {
      // Invalid URL, skip domain display
    }
  }

  return (
    <article class={`h-entry${compact ? " minimal-compact" : ""}`}>
      {domain && (
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
          <span>{domain}</span>
        </div>
      )}
      {post.title && (
        <h2
          class={`p-name font-semibold ${compact ? "text-sm" : "text-base"} mb-1`}
        >
          <a
            href={post.url || post.permalink}
            class="u-url hover:underline"
            target={post.url ? "_blank" : undefined}
            rel={post.url ? "noopener noreferrer" : undefined}
          >
            {post.title}
          </a>
        </h2>
      )}
      {!compact && post.bodyHtml && (
        <div
          class="e-content prose text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
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
