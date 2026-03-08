/**
 * Post Footer
 *
 * Shared footer for all post cards (feed + detail page).
 * Shows timestamp, collection tags, reply button, and menu trigger.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostView, CollectionTagView } from "../../types.js";

interface PostFooterProps {
  post: PostView;
  /** Detail page variant: border-top, shows permalink */
  detail?: boolean;
}

const CollectionTags: FC<{ collections: CollectionTagView[] }> = ({
  collections,
}) => {
  if (collections.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length checked above
  const first = collections[0]!;
  const rest = collections.slice(1);

  return (
    <span class="post-collection-tags">
      <span class="post-collection-sep" aria-hidden="true">
        &middot;
      </span>
      <a href={`/c/${first.slug}`} class="post-collection-tag">
        {first.iconHtml && (
          <span
            class="post-collection-icon"
            dangerouslySetInnerHTML={{ __html: first.iconHtml }}
          />
        )}
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
            {collections.map((c) => (
              <a
                key={c.slug}
                href={`/c/${c.slug}`}
                class="post-collection-popover-item"
              >
                {c.iconHtml && (
                  <span
                    class="post-collection-icon"
                    dangerouslySetInnerHTML={{ __html: c.iconHtml }}
                  />
                )}
                {c.title}
              </a>
            ))}
          </div>
        </span>
      )}
    </span>
  );
};

export const PostFooter: FC<PostFooterProps> = ({ post, detail }) => {
  const { t } = useLingui();

  return (
    <footer
      class={`post-menu-footer${detail ? " post-footer-detail" : ""}`}
      data-post-meta
    >
      <div class="post-footer-meta">
        {detail ? (
          <time
            class="dt-published"
            datetime={post.publishedAt}
            title={`${post.publishedAtFormatted} ${post.publishedAtTime} UTC`}
          >
            {post.publishedAtFormatted}
          </time>
        ) : (
          <a
            href={post.permalink}
            class="u-url text-xs text-muted-foreground hover:underline"
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
        {detail && (
          <a href={post.permalink} class="u-url ml-4">
            {t({
              message: "Permalink",
              comment: "@context: Link to permanent URL of post",
            })}
          </a>
        )}
        <CollectionTags collections={post.collections} />
      </div>
      <div class="post-menu-actions">
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
      </div>
    </footer>
  );
};
