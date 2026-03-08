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
import { StarRating } from "../shared/StarRating.js";
import { PostFooter } from "../shared/PostFooter.js";
import { PostStatusBadges } from "./PostStatusBadges.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, compact }) => {
  return (
    <article
      class={`h-entry post-menu-target${compact ? " feed-compact" : ""}`}
      data-post
      data-format="quote"
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
      {...(post.threadRootId ? { "data-post-reply": "" } : {})}
    >
      {!compact && <PostStatusBadges />}
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
      {!compact && <StarRating rating={post.rating} />}
      <PostFooter post={post} />
    </article>
  );
};
