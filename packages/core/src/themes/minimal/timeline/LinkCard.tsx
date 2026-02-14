/**
 * Minimal Theme - Link Card
 *
 * Subtle external link indicator for type="link" posts.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../../types.js";

export const LinkCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article class={`h-entry${compact ? " text-sm" : ""}`}>
      {post.title && (
        <h2 class={`p-name font-semibold ${compact ? "text-sm" : "text-base"}`}>
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
      {post.sourceDomain && (
        <div class="text-xs text-muted-foreground mt-0.5">
          &#8599; {post.sourceDomain}
        </div>
      )}
      {!compact && post.contentHtml && (
        <div
          class="e-content prose prose-sm text-muted-foreground mt-1"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      )}
      <footer class="mt-2">
        <a
          href={post.permalink}
          class="text-xs text-muted-foreground hover:text-foreground"
        >
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
        </a>
      </footer>
    </article>
  );
};
