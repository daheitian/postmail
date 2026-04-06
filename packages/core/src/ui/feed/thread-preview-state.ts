import type { PostView } from "../../types.js";

export function getThreadPreviewState({
  secondReply,
  penultimateReply,
  latestReply,
  totalReplyCount,
}: {
  secondReply?: PostView;
  penultimateReply?: PostView;
  latestReply: PostView;
  totalReplyCount: number;
}) {
  const visibleReplyIds = new Set(
    [secondReply, penultimateReply, latestReply]
      .filter((post): post is PostView => post !== undefined)
      .map((post) => post.id),
  );
  const hiddenCount = Math.max(0, totalReplyCount - visibleReplyIds.size);

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
  secondReply,
  penultimateReply,
  hiddenCount,
}: {
  rootPost: PostView;
  secondReply?: PostView;
  penultimateReply?: PostView;
  hiddenCount: number;
}): boolean {
  if (hiddenCount > 0) return true;

  const contextPosts = [rootPost];
  if (secondReply) {
    contextPosts.push(secondReply);
  }
  if (penultimateReply && penultimateReply.id !== secondReply?.id) {
    contextPosts.push(penultimateReply);
  }

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
