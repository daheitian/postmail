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

export const QuoteCard: FC<TimelineCardProps> = ({
  post,
  mode = "feed",
  display,
}) => {
  const isCompact = mode === "compact";
  const isDetail = mode === "detail";
  const articleClass = `h-entry post-menu-target${isCompact ? " feed-compact" : isDetail ? " py-6" : " feed-quote-post"}`;
  const safeUrl = post.url ? sanitizeUrl(post.url) : "";
  const commentaryHtml = post.bodyHtml ?? null;

  return (
    <article
      class={articleClass}
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
      {!isCompact && !display?.hideStatusBadges && <PostStatusBadges />}
      {post.quoteText && (
        <blockquote class={`feed-quote${isCompact ? "" : " feed-quote-card"}`}>
          <div
            class={`e-content feed-quote-content${isCompact ? " text-sm" : ""}`}
          >
            {post.quoteText}
          </div>
        </blockquote>
      )}
      {!isCompact && (post.title || safeUrl) && (
        <div class="feed-quote-attribution">
          {safeUrl ? (
            <a
              href={safeUrl}
              class="feed-quote-source"
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
      {!isCompact && commentaryHtml && (
        <div
          class="feed-quote-commentary prose text-muted-foreground"
          data-post-body
          dangerouslySetInnerHTML={{ __html: commentaryHtml }}
        />
      )}
      {!isCompact && !display?.hideRating && (
        <StarRating rating={post.rating} />
      )}
      <PostFooter post={post} detail={isDetail} display={display?.footer} />
    </article>
  );
};
