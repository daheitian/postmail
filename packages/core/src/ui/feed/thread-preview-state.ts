import type { PostView } from "../../types.js";

export function getThreadPreviewState({
  hasParentReply,
  totalReplyCount,
}: {
  hasParentReply: boolean;
  totalReplyCount: number;
}) {
  const hiddenCount = hasParentReply
    ? totalReplyCount - 2 // exclude latest + parent
    : totalReplyCount - 1; // exclude latest only

  return {
    hiddenCount,
  };
}

function getRenderedTextLength(post?: PostView): number {
  if (!post) return 0;

  return (
    (post.title?.length ?? 0) +
    (post.quoteText?.length ?? 0) +
    (post.summary?.length ?? 0) +
    (post.excerpt?.length ?? 0)
  );
}

export function isThreadContextLikelyOverflow({
  rootPost,
  parentReply,
  hiddenCount,
}: {
  rootPost: PostView;
  parentReply?: PostView;
  hiddenCount: number;
}): boolean {
  if (hiddenCount > 0) return true;

  const contextPosts = [rootPost, parentReply].filter(
    (post): post is PostView => post !== undefined,
  );

  if (
    contextPosts.some(
      (post) => post.media.length > 0 || post.summaryHasMore === true,
    )
  ) {
    return true;
  }

  const renderedTextLength = contextPosts.reduce(
    (sum, post) => sum + getRenderedTextLength(post),
    0,
  );

  return renderedTextLength > 220;
}
