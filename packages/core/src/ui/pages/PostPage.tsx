/**
 * Single Post Page
 *
 * Single post view — clean, no card border, with divider footer.
 * When `threadPosts` is provided, renders the full thread with the current
 * post highlighted and scroll-targeted.
 */

import type { FC } from "hono/jsx";
import type { PostPageProps, PostView } from "../../types.js";
import { MediaGallery } from "../shared/MediaGallery.js";
import { StarRating } from "../shared/StarRating.js";
import { PostFooter } from "../shared/PostFooter.js";
import { TimelineItemFromPost } from "../feed/TimelineItem.js";

const SinglePost: FC<{ post: PostView }> = ({ post }) => {
  return (
    <article
      class="h-entry post-menu-target py-6"
      data-page="post"
      data-post
      data-format={post.format}
      data-post-id={post.id}
      data-post-permalink={post.permalink}
      {...(post.pinned ? { "data-post-pinned": "" } : {})}
      {...(post.featured ? { "data-post-featured": "" } : {})}
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

      <PostFooter post={post} detail />
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
