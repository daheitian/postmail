/**
 * Minimal Theme - Timeline Load-More SSE Renderer
 *
 * Produces SSE DOM patches for incremental timeline loading.
 * Uses date-grouped layout matching TimelineFeed's initial render.
 */

import type {
  TimelineMoreProps,
  TimelinePatch,
  TimelineItemView,
} from "../../../types.js";
import { groupByDate } from "../../../lib/timeline.js";
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
 * Renders SSE patches for the minimal theme's load-more response.
 *
 * @param props - Timeline more props with items, pagination, and theme
 * @returns Array of DOM patch instructions for the SSE stream
 */
export function timelineMore(props: TimelineMoreProps): TimelinePatch[] {
  const { items, lastDate, hasMore, nextCursor, theme } = props;
  const patches: TimelinePatch[] = [];
  const groups = groupByDate(items);

  if (groups.length === 0) return patches;

  const firstGroup = groups[0]!;
  const isContinuation = lastDate === firstGroup.dateKey;

  // Continuation items: append into the existing date group's container
  if (isContinuation) {
    const continuationHtml = firstGroup.items
      .map((item) => {
        const content = renderItem(item, props);
        return `<div><hr class="border-border my-5"/>${content}</div>`;
      })
      .join("");

    if (continuationHtml) {
      patches.push({
        selector: `#date-items-${lastDate}`,
        content: continuationHtml,
        mode: "append",
      });
    }
  }

  // New date groups: append to #timeline-feed
  const newGroups = isContinuation ? groups.slice(1) : groups;
  if (newGroups.length > 0) {
    const newGroupsHtml = newGroups
      .map((group) => {
        const itemsHtml = group.items
          .map((item, i) => {
            const content = renderItem(item, props);
            return i > 0
              ? `<div><hr class="border-border my-5"/>${content}</div>`
              : `<div>${content}</div>`;
          })
          .join("");

        return (
          <div>
            <div class="flex items-center gap-4 my-5">
              <div class="h-px flex-1 bg-border" />
              <time
                class="text-xs text-muted-foreground shrink-0"
                datetime={group.dateKey}
              >
                {group.label}
              </time>
              <div class="h-px flex-1 bg-border" />
            </div>
            <div
              id={`date-items-${group.dateKey}`}
              class="flex flex-col"
              dangerouslySetInnerHTML={{ __html: itemsHtml }}
            />
          </div>
        ).toString();
      })
      .join("");

    patches.push({
      selector: "#timeline-feed",
      content: newGroupsHtml,
      mode: "append",
    });
  }

  // Load-more button
  const ResolvedLoadMore = theme?.TimelineLoadMore ?? DefaultTimelineLoadMore;
  const lastGroupDate = groups.at(-1)?.dateKey;

  if (hasMore && nextCursor) {
    patches.push({
      selector: "#load-more-container",
      content: (
        <ResolvedLoadMore
          nextCursor={nextCursor}
          lastDate={lastGroupDate}
          theme={theme}
        />
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
