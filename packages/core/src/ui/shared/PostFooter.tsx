/**
 * Post Footer
 *
 * Shared footer for all post cards (feed + detail page).
 * Shows timestamp, collection tags, reply button, and menu trigger.
 */

import type { FC } from "hono/jsx";
import { msg } from "@lingui/core/macro";
import type {
  PostView,
  CollectionTagView,
  PostFooterDisplayOptions,
} from "../../types.js";
import { useLingui } from "../../i18n/context.js";
import { FEATURED_SPARKLE_PATH } from "../../lib/featured-icons.js";
import { sanitizeUrl } from "../../lib/url.js";

interface PostFooterProps {
  post: PostView;
  /** Detail page variant: border-top styling */
  detail?: boolean;
  display?: PostFooterDisplayOptions;
}

const CompactCollectionTags: FC<{
  collections: CollectionTagView[];
  showSeparator?: boolean;
}> = ({ collections, showSeparator = true }) => {
  const { t } = useLingui();

  if (collections.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked above
  const first = collections[0]!;
  const rest = collections.slice(1);

  return (
    <span class="post-collection-tags">
      {showSeparator && (
        <span class="post-collection-sep" aria-hidden="true">
          &middot;
        </span>
      )}
      <a href={first.url} class="post-collection-tag">
        <span class="post-collection-tag-text">{first.title}</span>
      </a>
      {rest.length > 0 && (
        <span class="post-collection-more-wrap">
          <button
            type="button"
            class="post-collection-more"
            data-collection-popover-trigger
          >
            {t({
              ...msg({
                message: "and {count} more",
                comment:
                  "@context: Button label for opening the hidden collection list in the post footer",
              }),
              values: { count: rest.length },
            })}
          </button>
          <div class="post-collection-popover" data-collection-popover>
            {rest.map((c) => (
              <a key={c.slug} href={c.url} class="post-collection-popover-item">
                {c.title}
              </a>
            ))}
          </div>
        </span>
      )}
    </span>
  );
};

interface PostPublishedLinkProps {
  post: Pick<
    PostView,
    "permalink" | "publishedAt" | "publishedAtFormatted" | "publishedAtTime"
  >;
  className: string;
}

export const PostPublishedLink: FC<PostPublishedLinkProps> = ({
  post,
  className,
}) => {
  const { t } = useLingui();
  const publishedLabel = t({
    ...msg({
      message: "Published on {date} at {time}",
      comment:
        "@context: Tooltip text for the published timestamp in post metadata",
    }),
    values: {
      date: post.publishedAtFormatted,
      time: post.publishedAtTime,
    },
  });

  return (
    <a href={post.permalink} class={className}>
      <time
        class="dt-published"
        datetime={post.publishedAt}
        title={publishedLabel}
      >
        {post.publishedAtFormatted}
      </time>
    </a>
  );
};

export const PostMenuTriggerButton: FC<{ className?: string }> = ({
  className = "post-menu-trigger",
}) => {
  const { t } = useLingui();

  return (
    <button
      type="button"
      class={className}
      aria-haspopup="menu"
      aria-label={t(
        msg({
          message: "More actions",
          comment: "@context: Post menu trigger label in post actions",
        }),
      )}
      aria-expanded="false"
      data-post-menu-trigger
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="5" cy="12" r="1.75" />
        <circle cx="12" cy="12" r="1.75" />
        <circle cx="19" cy="12" r="1.75" />
      </svg>
    </button>
  );
};

export const PostFooter: FC<PostFooterProps> = ({ post, detail, display }) => {
  const { t } = useLingui();
  const featuredLabel =
    post.featuredAtFormatted && post.featuredAtTime
      ? t({
          ...msg({
            message: "Featured on {date} at {time}",
            comment:
              "@context: Tooltip and screen reader label for the featured-post icon in the post footer",
          }),
          values: {
            date: post.featuredAtFormatted,
            time: post.featuredAtTime,
          },
        })
      : t(
          msg({
            message: "Featured",
            comment:
              "@context: Tooltip and screen reader label for the featured-post icon in the post footer when no featured date is available",
          }),
        );
  const safeExternalUrl =
    post.format === "link" && post.url ? sanitizeUrl(post.url) : "";
  const showTimestamp = !display?.hideTimestamp;
  const hideActions = !!display?.hideActions;
  const hideReply = !!display?.hideReply;
  const showReply = !hideReply && post.isLastInThread;
  const showCollectionSeparator =
    showTimestamp || !!safeExternalUrl || post.featured;

  return (
    <footer
      class={`post-menu-footer${detail ? " post-footer-detail" : ""}`}
      data-post-meta
    >
      <div class="post-footer-meta">
        <span
          class="post-footer-featured"
          tabindex={0}
          role="img"
          aria-label={featuredLabel}
          data-tooltip={featuredLabel}
          data-align="center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.35"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d={FEATURED_SPARKLE_PATH} />
          </svg>
        </span>
        {showTimestamp && (
          <PostPublishedLink post={post} className="u-url post-footer-link" />
        )}
        {safeExternalUrl && (
          <a
            href={safeExternalUrl}
            class="post-footer-external-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(
              msg({
                message: "Open external link",
                comment:
                  "@context: Accessible label for the external-link icon in the post footer",
              }),
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M7 17 17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </a>
        )}
        <CompactCollectionTags
          collections={post.collections}
          showSeparator={showCollectionSeparator}
        />
      </div>
      {!hideActions && (
        <div class="post-menu-actions">
          {showReply && (
            <button
              type="button"
              class="reply-trigger"
              aria-label={t(
                msg({
                  message: "Reply",
                  comment: "@context: Reply button label in the post footer",
                }),
              )}
              data-reply-trigger
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
            </button>
          )}
          <PostMenuTriggerButton />
        </div>
      )}
    </footer>
  );
};
