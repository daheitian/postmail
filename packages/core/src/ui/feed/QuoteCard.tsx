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
import { sanitizeUrl } from "../../lib/url.js";

export const QuoteCard: FC<TimelineCardProps> = ({ post, mode = "feed" }) => {
  const isCompact = mode === "compact";
  const isDetail = mode === "detail";
  const safeUrl = post.url ? sanitizeUrl(post.url) : "";

  return (
    <article
      class={`h-entry post-menu-target${isCompact ? " feed-compact" : isDetail ? " py-6" : ""}`}
      {...(isDetail ? { "data-page": "post" } : {})}
      data-post
      data-format="quote"
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      {...(post.featured ? { "data-post-featured": "" } : {})}
      data-post-visibility={post.visibility}
      {...(!isDetail && post.threadRootId ? { "data-post-reply": "" } : {})}
    >
      {!isCompact && <PostStatusBadges />}
      {post.quoteText && (
        <blockquote class="feed-quote">
          <div
            class={`e-content ${isCompact ? "text-sm" : "text-base"} leading-relaxed`}
          >
            {post.quoteText}
          </div>
        </blockquote>
      )}
      {!isCompact && (post.title || safeUrl) && (
        <div class="mt-2 text-sm text-muted-foreground">
          &mdash;{" "}
          {safeUrl ? (
            <a
              href={safeUrl}
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
      {!isCompact && post.bodyHtml && (
        <div
          class="mt-3 prose text-muted-foreground"
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}
      {!isCompact && <StarRating rating={post.rating} />}
      <PostFooter post={post} detail={isDetail} />
    </article>
  );
};
