/**
 * Card Theme - Timeline Load-More SSE Renderer
 *
 * Produces SSE DOM patches for incremental timeline loading.
 * Flat layout (no date grouping) — simply appends items to #timeline-feed.
 */

import type {
  TimelineMoreProps,
  TimelinePatch,
  TimelineItemView,
} from "@jant/core";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "./TimelineLoadMore.js";

function renderItem(item: TimelineItemView, props: TimelineMoreProps): string {
  const theme = props.theme;
  const ResolvedThreadPreview = theme?.ThreadPreview ?? DefaultThreadPreview;

  if (item.threadPreview) {
    return (
      <ResolvedThreadPreview
        rootPost={item.post}
        previewReplies={item.threadPreview.replies}
        totalReplyCount={item.threadPreview.totalReplyCount}
        theme={theme}
      />
    ).toString();
  }
  return (<TimelineItem item={item} theme={theme} />).toString();
}

/**
 * Renders SSE patches for the card theme's load-more response.
 *
 * @param props - Timeline more props with items, pagination, and theme
 * @returns Array of DOM patch instructions for the SSE stream
 */
export function timelineMore(props: TimelineMoreProps): TimelinePatch[] {
  const { items, hasMore, nextCursor, theme } = props;
  const patches: TimelinePatch[] = [];

  // Append all items directly to #timeline-feed
  if (items.length > 0) {
    const itemsHtml = items.map((item) => renderItem(item, props)).join("");
    patches.push({
      selector: "#timeline-feed",
      content: itemsHtml,
      mode: "append",
    });
  }

  // Load-more button
  const ResolvedLoadMore = theme?.TimelineLoadMore ?? DefaultTimelineLoadMore;

  if (hasMore && nextCursor) {
    patches.push({
      selector: "#load-more-container",
      content: (
        <ResolvedLoadMore nextCursor={nextCursor} theme={theme} />
      ).toString(),
    });
  } else {
    patches.push({
      selector: "#load-more-container",
      content: "",
      mode: "remove",
    });
  }

  return patches;
}
