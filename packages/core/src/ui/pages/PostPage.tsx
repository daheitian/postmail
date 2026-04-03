/**
 * Single Post Page
 *
 * Single post view — clean, no card border, with divider footer.
 * When `threadPosts` is provided, renders the full thread with the current
 * post highlighted and scroll-targeted.
 */

import type { FC } from "hono/jsx";
import type { PostPageProps, PostView } from "../../types.js";
import { TimelineItemFromPost } from "../feed/TimelineItem.js";

const ThreadDetail: FC<{ post: PostView; threadPosts: PostView[] }> = ({
  post,
  threadPosts,
}) => {
  return (
    <div class="thread-group thread-group-detail" data-page="post">
      {threadPosts.map((tp) => {
        const isCurrent = tp.id === post.id;
        return (
          <div
            key={tp.id}
            id={`post-${tp.id}`}
            class={`thread-item thread-detail-item${isCurrent ? " thread-item-current" : ""}`}
            {...(isCurrent ? { "data-post-current": "" } : {})}
          >
            <TimelineItemFromPost post={tp} mode="detail" />
          </div>
        );
      })}
    </div>
  );
};

export const PostPage: FC<PostPageProps> = ({ post, threadPosts }) => {
  return (
    <div
      data-post-view
      data-post-view-id={post.id}
      data-thread-root-id={post.threadRootId ?? post.id}
    >
      {threadPosts && threadPosts.length > 1 ? (
        <ThreadDetail post={post} threadPosts={threadPosts} />
      ) : (
        <TimelineItemFromPost post={post} mode="detail" />
      )}
    </div>
  );
};
