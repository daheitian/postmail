/**
 * Link Card
 *
 * Compact link preview box — date is shown at the feed level as a group header.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";
import { StarRating } from "../shared/StarRating.js";
import { PostFooter } from "../shared/PostFooter.js";
import { PostStatusBadges } from "./PostStatusBadges.js";
import { sanitizeUrl, extractDisplayDomain } from "../../lib/url.js";

export const LinkCard: FC<TimelineCardProps> = ({
  post,
  mode = "feed",
  display,
}) => {
  const isCompact = mode === "compact";
  const isDetail = mode === "detail";
  const articleClass = `h-entry post-menu-target${isCompact ? " feed-compact" : isDetail ? " py-6" : " feed-card feed-card-link"}`;

  const safeUrl = post.url ? sanitizeUrl(post.url) : "";
  const domain = safeUrl ? extractDisplayDomain(safeUrl) : null;

  return (
    <article
      class={articleClass}
      {...(isDetail ? { "data-page": "post" } : {})}
      data-post
      data-format="link"
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      {...(post.featured ? { "data-post-featured": "" } : {})}
      data-post-visibility={post.visibility}
      {...(!isDetail && post.threadRootId ? { "data-post-reply": "" } : {})}
    >
      {!isCompact && !display?.hideStatusBadges && <PostStatusBadges />}
      {domain &&
        (safeUrl ? (
          <a
            href={safeUrl}
            class="feed-link-domain"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              class="feed-link-domain-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
            >
              <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            <span>{domain}</span>
          </a>
        ) : (
          <div class="feed-link-domain">
            <svg
              class="feed-link-domain-icon"
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
        ))}
      {post.title &&
        (isDetail ? (
          <h1 class="p-name feed-link-title text-2xl font-semibold mb-4">
            <a
              href={safeUrl || post.permalink}
              class="u-url feed-link-title-link"
              target={safeUrl ? "_blank" : undefined}
              rel={safeUrl ? "noopener noreferrer" : undefined}
            >
              {post.title}
            </a>
          </h1>
        ) : (
          <h2
            class={`p-name feed-link-title font-semibold ${isCompact ? "text-sm" : ""} mb-1`}
          >
            <a
              href={safeUrl || post.permalink}
              class="u-url feed-link-title-link"
              target={safeUrl ? "_blank" : undefined}
              rel={safeUrl ? "noopener noreferrer" : undefined}
            >
              {post.title}
            </a>
          </h2>
        ))}
      {!isCompact && post.bodyHtml && (
        <div
          class="e-content prose text-muted-foreground feed-link-summary"
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}
      {!isCompact && !display?.hideRating && (
        <StarRating rating={post.rating} />
      )}
      <PostFooter post={post} detail={isDetail} display={display?.footer} />
    </article>
  );
};
