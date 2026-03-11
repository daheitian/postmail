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
    shouldShowToggle: totalReplyCount > 1,
  };
}
