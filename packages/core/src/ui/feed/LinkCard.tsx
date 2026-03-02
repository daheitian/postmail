/**
 * Link Card
 *
 * Compact link preview box — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";

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
    <article
      class={`h-entry post-menu-target${compact ? " feed-compact" : ""}`}
      data-post
      data-format="link"
      data-post-id={post.sqid}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
    >
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
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}
      <footer
        class="post-menu-footer text-xs text-muted-foreground"
        data-post-meta
      >
        <span class="flex items-center gap-2">
          {post.pinned && (
            <span class="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" x2="12" y1="17" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
              Pinned
            </span>
          )}
          <a href={post.permalink} class="hover:underline">
            <time class="dt-published" datetime={post.publishedAt}>
              {post.publishedAtFormatted}
            </time>
          </a>
        </span>
        <button
          type="button"
          class="post-menu-trigger"
          aria-label="More actions"
          data-post-menu-trigger
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </footer>
    </article>
  );
};
