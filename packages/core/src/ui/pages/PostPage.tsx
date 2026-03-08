/**
 * Single Post Page
 *
 * Single post view — clean, no card border, with divider footer.
 * When `threadPosts` is provided, renders the full thread with the current
 * post highlighted and scroll-targeted.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { PostPageProps, PostView } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";
import { StarRating } from "../shared/StarRating.js";
import { TimelineItemFromPost } from "../feed/TimelineItem.js";

const SinglePost: FC<{ post: PostView }> = ({ post }) => {
  const { t } = useLingui();

  return (
    <article
      class="h-entry post-menu-target py-6"
      data-page="post"
      data-post
      data-format={post.format}
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      data-post-visibility={post.visibility}
    >
      {post.title && (
        <h1 class="p-name text-2xl font-semibold mb-4">{post.title}</h1>
      )}

      {post.bodyHtml && (
        <div
          class="e-content prose"
          data-post-body
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      )}

      {post.media.length > 0 && (
        <div class="mt-4" data-post-media>
          <MediaGallery attachments={post.media} />
        </div>
      )}

      <StarRating rating={post.rating} />

      <footer
        class="mt-6 pt-4 border-t text-sm text-muted-foreground post-menu-footer"
        data-post-meta
      >
        <div>
          <time class="dt-published" datetime={post.publishedAt}>
            {post.publishedAtFormatted}
          </time>
          <a href={post.permalink} class="u-url ml-4">
            {t({
              message: "Permalink",
              comment: "@context: Link to permanent URL of post",
            })}
          </a>
        </div>
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
      </footer>
    </article>
  );
};

const ThreadDetail: FC<{ post: PostView; threadPosts: PostView[] }> = ({
  post,
  threadPosts,
}) => {
  return (
    <div class="thread-group" data-page="post">
      {threadPosts.map((tp, i) => {
        const isCurrent = tp.id === post.id;
        return (
          <div key={tp.id}>
            {i > 0 && <hr class="feed-divider" />}
            <div
              id={`post-${tp.id}`}
              class={`thread-item thread-detail-item${isCurrent ? " thread-detail-current" : ""}`}
              {...(isCurrent ? { "data-post-current": "" } : {})}
            >
              <TimelineItemFromPost post={tp} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PostPage: FC<PostPageProps> = ({ post, threadPosts }) => {
  if (threadPosts && threadPosts.length > 1) {
    return <ThreadDetail post={post} threadPosts={threadPosts} />;
  }
  return <SinglePost post={post} />;
};
