/**
 * Post Footer
 *
 * Shared footer for all post cards (feed + detail page).
 * Shows timestamp, collection tags, reply button, and menu trigger.
 */

import type { FC } from "hono/jsx";
import type {
  PostView,
  CollectionTagView,
  PostFooterDisplayOptions,
} from "../../types.js";
import { sanitizeUrl } from "../../lib/url.js";

interface PostFooterProps {
  post: PostView;
  /** Detail page variant: border-top, shows permalink */
  detail?: boolean;
  display?: PostFooterDisplayOptions;
}

const CompactCollectionTags: FC<{
  collections: CollectionTagView[];
  showSeparator?: boolean;
}> = ({ collections, showSeparator = true }) => {
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
        {first.title}
      </a>
      {rest.length > 0 && (
        <span class="post-collection-more-wrap">
          <button
            type="button"
            class="post-collection-more"
            data-collection-popover-trigger
          >
            and {rest.length} more
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

export const PostFooter: FC<PostFooterProps> = ({ post, detail, display }) => {
  const safeExternalUrl =
    post.format === "link" && post.url ? sanitizeUrl(post.url) : "";
  const showTimestamp = !display?.hideTimestamp;
  const showThreadLink = !!post.threadRootPermalink && !display?.hideThreadLink;
  const hideActions = !!display?.hideActions;
  const showThreadSeparator =
    showThreadLink && (showTimestamp || !!safeExternalUrl || !!detail);
  const showCollectionSeparator =
    showTimestamp || !!safeExternalUrl || !!detail || showThreadLink;

  return (
    <footer
      class={`post-menu-footer${detail ? " post-footer-detail" : ""}`}
      data-post-meta
    >
      <div class="post-footer-meta">
        {showTimestamp && (
          <a
            href={post.permalink}
            class={`u-url hover:underline${detail ? "" : " text-xs text-muted-foreground"}`}
          >
            <time
              class="dt-published"
              datetime={post.publishedAt}
              title={`${post.publishedAtFormatted} ${post.publishedAtTime} UTC`}
            >
              {post.publishedAtFormatted}
            </time>
          </a>
        )}
        {safeExternalUrl && (
          <a
            href={safeExternalUrl}
            class="post-footer-external-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open external link"
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
        {showThreadSeparator && (
          <span class="post-collection-sep" aria-hidden="true">
            &middot;
          </span>
        )}
        {showThreadLink && post.threadRootPermalink && (
          <a
            href={post.threadRootPermalink}
            class="text-xs text-muted-foreground hover:underline"
          >
            In thread &rarr;
          </a>
        )}
        <CompactCollectionTags
          collections={post.collections}
          showSeparator={showCollectionSeparator}
        />
      </div>
      {!hideActions && (
        <div class="post-menu-actions">
          {post.isLastInThread && (
            <button
              type="button"
              class="reply-trigger"
              aria-label="Reply"
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
          <button
            type="button"
            class="post-menu-trigger"
            aria-haspopup="menu"
            aria-label="More actions"
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
        </div>
      )}
    </footer>
  );
};
