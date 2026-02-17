/**
 * Timeline Load-More SSE Renderer
 *
 * Produces SSE DOM patches for incremental timeline loading.
 * Appends items to the flat list container with divider prefixes.
 */

import type {
  TimelineMoreProps,
  TimelinePatch,
  TimelineItemView,
} from "../../types.js";
import { TimelineItem } from "./TimelineItem.js";
import { ThreadPreview } from "./ThreadPreview.js";
import { TimelineLoadMore } from "./TimelineLoadMore.js";

function renderItem(item: TimelineItemView): string {
  if (item.threadPreview) {
    return (
      <ThreadPreview
        rootPost={item.post}
        previewReplies={item.threadPreview.replies}
        totalReplyCount={item.threadPreview.totalReplyCount}
      />
    ).toString();
  }
  return (<TimelineItem item={item} />).toString();
}

/**
 * Renders SSE patches for the load-more response.
 *
 * @param props - Timeline more props with items, pagination info
 * @returns Array of DOM patch instructions for the SSE stream
 */
export function timelineMore(props: TimelineMoreProps): TimelinePatch[] {
  const { items, hasMore, nextCursor } = props;
  const patches: TimelinePatch[] = [];

  if (items.length === 0) return patches;

  // Append all items to the flat list with divider prefixes
  const itemsHtml = items
    .map((item) => {
      const content = renderItem(item);
      return `<div><hr class="feed-divider"/>${content}</div>`;
    })
    .join("");

  patches.push({
    selector: "#timeline-items",
    content: itemsHtml,
    mode: "append",
  });

  // Load-more button
  if (hasMore && nextCursor) {
    patches.push({
      selector: "#load-more-container",
      content: (<TimelineLoadMore nextCursor={nextCursor} />).toString(),
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
