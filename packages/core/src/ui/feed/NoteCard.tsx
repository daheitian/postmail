/**
 * Note Card
 *
 * Without title: plain text note with full date in footer.
 * With title: article-style rendering with summary excerpt and "Read more" link.
 */

import type { FC } from "hono/jsx";
import type { TimelineCardProps } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";
import { StarRating } from "../shared/StarRating.js";
import {
  PostFooter,
  PostMenuTriggerButton,
  PostPublishedLink,
} from "../shared/PostFooter.js";
import { PostStatusBadges } from "./PostStatusBadges.js";

export const NoteCard: FC<TimelineCardProps> = ({
  post,
  mode = "feed",
  display,
}) => {
  const isCompact = mode === "compact";
  const isDetail = mode === "detail";
  const isArticle = !!post.title;
  const displayHtml = isDetail || !isArticle ? post.bodyHtml : post.summaryHtml;
  const hasVisibleRating =
    !!post.rating && post.rating > 0 && !display?.hideRating;
  const showHeaderRating = isDetail && isArticle && hasVisibleRating;
  const showHeaderActions = !display?.footer?.hideActions;
  const footerDisplay =
    isDetail && isArticle
      ? { ...display?.footer, hideTimestamp: true }
      : display?.footer;

  return (
    <article
      class={`h-entry post-menu-target${isCompact ? " feed-compact" : isDetail ? " py-6" : ""}`}
      {...(isDetail ? { "data-page": "post" } : {})}
      data-post
      data-format="note"
      data-post-id={post.id}
      data-thread-root-id={post.threadRootId ?? post.id}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      {...(post.featured ? { "data-post-featured": "" } : {})}
      data-post-visibility={post.visibility}
      {...(!isDetail && post.threadRootId ? { "data-post-reply": "" } : {})}
    >
      {!isCompact && !display?.hideStatusBadges && <PostStatusBadges />}
      {isArticle &&
        (isDetail ? (
          <div class="post-header-block post-header-block-detail">
            <h1 class="p-name post-detail-title text-2xl font-semibold">
              {post.title}
            </h1>
            <div class="post-header-meta-row">
              <PostPublishedLink
                post={post}
                className="u-url post-header-meta-link"
              />
              {showHeaderActions && (
                <div class="post-header-actions">
                  <PostMenuTriggerButton className="post-menu-trigger post-header-menu-trigger" />
                </div>
              )}
            </div>
            {showHeaderRating && <StarRating rating={post.rating} />}
          </div>
        ) : (
          <h2
            class={`p-name font-semibold ${isCompact ? "text-sm mb-1" : "feed-note-title mb-2"}`}
          >
            <a href={post.permalink} class="u-url hover:underline">
              {post.title}
            </a>
          </h2>
        ))}
      {displayHtml && (
        <div
          class={`e-content prose ${isCompact ? "prose-sm" : isDetail ? "post-detail-body" : isArticle ? "text-muted-foreground" : ""}`}
          data-post-body
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )}
      {!isCompact && post.media.length > 0 && (
        <div class="mt-3" data-post-media>
          <MediaGallery attachments={post.media} />
        </div>
      )}
      {!isDetail && !isCompact && isArticle && post.summaryHasMore && (
        <a
          href={`${post.permalink}#continue`}
          class="text-sm text-muted-foreground hover:underline mt-1 inline-block"
        >
          Continue →
        </a>
      )}
      {!isCompact && !showHeaderRating && !display?.hideRating && (
        <StarRating rating={post.rating} />
      )}
      <PostFooter post={post} detail={isDetail} display={footerDisplay} />
    </article>
  );
};
