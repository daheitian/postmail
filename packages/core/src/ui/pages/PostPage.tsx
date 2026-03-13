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
    <div class="thread-group" data-page="post">
      {threadPosts.map((tp) => {
        const isCurrent = tp.id === post.id;
        return (
          <div
            key={tp.id}
            id={`post-${tp.id}`}
            class={`thread-item thread-detail-item${isCurrent ? " thread-detail-current" : ""}`}
            {...(isCurrent ? { "data-post-current": "" } : {})}
          >
            <TimelineItemFromPost post={tp} />
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
  return <TimelineItemFromPost post={post} mode="detail" />;
};
