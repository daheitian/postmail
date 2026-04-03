/**
 * Link Card
 *
 * Author commentary renders as first-class prose (same level as Note body).
 * The link reference (domain, title, preview) sits in a compact card below,
 * keeping the author's voice visually distinct from the referenced content.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";
import { StarRating } from "../shared/StarRating.js";
import { PostFooter } from "../shared/PostFooter.js";
import { PostStatusBadges } from "./PostStatusBadges.js";
import { sanitizeUrl, extractDisplayDomain } from "../../lib/url.js";
import { MediaGallery } from "../shared/MediaGallery.js";
import { LinkPreview } from "./LinkPreview.js";

export const LinkCard: FC<TimelineCardProps> = ({
  post,
  mode = "feed",
  display,
}) => {
  const isCompact = mode === "compact";
  const isDetail = mode === "detail";
  const articleClass = `h-entry post-menu-target${isCompact ? " feed-compact" : isDetail ? " py-6" : ""}`;
  const hasVisibleRating =
    !!post.rating && post.rating > 0 && !display?.hideRating;
  const showHeaderRating = isDetail && !!post.title && hasVisibleRating;

  const safeUrl = post.url ? sanitizeUrl(post.url) : "";
  const domain = safeUrl ? extractDisplayDomain(safeUrl) : null;

  const domainEl =
    domain &&
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
    ));

  const previewEl = !isCompact && post.previewImageUrl && (
    <LinkPreview
      imageUrl={post.previewImageUrl}
      linkUrl={safeUrl}
      kind={post.previewKind}
      provider={post.previewProvider}
    />
  );

  const bodyEl = !isCompact && post.bodyHtml && (
    <div
      class={`e-content prose${isDetail ? " post-detail-body" : ""}`}
      data-post-body
      dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
    />
  );

  const mediaEl = !isCompact && post.media.length > 0 && (
    <div class="mt-3" data-post-media>
      <MediaGallery attachments={post.media} />
    </div>
  );

  const ratingEl = !isCompact && !showHeaderRating && !display?.hideRating && (
    <StarRating rating={post.rating} />
  );

  /* -- Link reference: domain + title + preview (feed & compact only) -- */
  const linkRef = (
    <>
      {domainEl}
      {post.title && (
        <h2 class={`p-name feed-link-title ${isCompact ? "text-sm" : ""}`}>
          <a
            href={safeUrl || post.permalink}
            class="u-url feed-link-title-link"
            target={safeUrl ? "_blank" : undefined}
            rel={safeUrl ? "noopener noreferrer" : undefined}
          >
            {post.title}
          </a>
        </h2>
      )}
      {previewEl}
    </>
  );

  return (
    <article
      class={articleClass}
      {...(isDetail ? { "data-page": "post" } : {})}
      data-post
      data-format="link"
      data-post-id={post.id}
      data-post-slug={post.slug}
      data-thread-root-id={post.threadRootId ?? post.id}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      {...(post.featured ? { "data-post-featured": "" } : {})}
      data-post-visibility={post.visibility}
      {...(!isDetail && post.threadRootId ? { "data-post-reply": "" } : {})}
    >
      {!isCompact && !display?.hideStatusBadges && <PostStatusBadges />}
      {isDetail ? (
        <>
          {domainEl}
          {post.title && (
            <div class="post-header-block">
              <h1 class="p-name post-detail-title feed-link-title">
                <a
                  href={safeUrl || post.permalink}
                  class="u-url feed-link-title-link"
                  target={safeUrl ? "_blank" : undefined}
                  rel={safeUrl ? "noopener noreferrer" : undefined}
                >
                  {post.title}
                </a>
              </h1>
              {showHeaderRating && <StarRating rating={post.rating} />}
            </div>
          )}
          {bodyEl}
          {previewEl}
        </>
      ) : isCompact ? (
        linkRef
      ) : (
        <>
          {linkRef}
          {bodyEl}
        </>
      )}
      {mediaEl}
      {ratingEl}
      <PostFooter post={post} detail={isDetail} display={display?.footer} />
    </article>
  );
};
