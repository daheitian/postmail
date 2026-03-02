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
      class={`h-entry post-menu-target${compact ? " feed-compact" : ""}`}
      data-post
      data-format="quote"
      data-post-id={post.sqid}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
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
      <footer class="post-menu-footer" data-post-meta>
        <span class="flex items-center gap-2">
          {post.pinned && (
            <span class="flex items-center gap-1 text-xs text-muted-foreground">
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
          <a
            href={post.permalink}
            class="u-url text-xs text-muted-foreground hover:underline"
          >
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
