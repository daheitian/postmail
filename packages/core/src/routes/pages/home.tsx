/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 * Handles both full-page rendering and load-more SSE responses.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { sse } from "../../lib/sse.js";
import { HomePage as DefaultHomePage } from "../../themes/minimal/pages/HomePage.js";
import { TimelineItem } from "../../themes/minimal/timeline/TimelineItem.js";
import { ThreadPreview as DefaultThreadPreview } from "../../themes/minimal/timeline/ThreadPreview.js";
import { TimelineLoadMore as DefaultTimelineLoadMore } from "../../themes/minimal/timeline/TimelineLoadMore.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const cursorParam = c.req.query("cursor");
  const cursor = cursorParam ? parseInt(cursorParam, 10) : undefined;
  const lastDate = c.req.query("lastDate");

  const { items, hasMore, nextCursor } = await assembleTimeline(c, {
    cursor: cursor && !isNaN(cursor) ? cursor : undefined,
  });

  // SSE load-more response
  if (cursor && !isNaN(cursor)) {
    if (items.length === 0) {
      return sse(c, async (stream) => {
        stream.remove("#load-more-container");
      });
    }

    // Resolve theme components
    const theme = c.var.config.theme?.components;
    const ResolvedThreadPreview = theme?.ThreadPreview ?? DefaultThreadPreview;
    const ResolvedLoadMore = theme?.TimelineLoadMore ?? DefaultTimelineLoadMore;

    // Group items by date and render to HTML
    const groups: { dateKey: string; label: string; items: typeof items }[] =
      [];
    let currentGroup: (typeof groups)[number] | null = null;
    for (const item of items) {
      const dateKey = item.post.publishedAt.slice(0, 10);
      if (!currentGroup || currentGroup.dateKey !== dateKey) {
        currentGroup = {
          dateKey,
          label: item.post.publishedAtFormatted,
          items: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.items.push(item);
    }

    // Split first group if it continues the previous page's last date
    const firstGroup = groups[0]!;
    const isContinuation = lastDate === firstGroup.dateKey;

    function renderGroupItems(groupItems: typeof items) {
      return groupItems.map((item, i) => {
        const content = item.threadPreview ? (
          <ResolvedThreadPreview
            rootPost={item.post}
            previewReplies={item.threadPreview.replies}
            totalReplyCount={item.threadPreview.totalReplyCount}
            theme={theme}
          />
        ) : (
          <TimelineItem item={item} theme={theme} />
        );
        return (
          <div key={i}>
            {i > 0 && <hr class="border-border my-5" />}
            {content}
          </div>
        );
      });
    }

    // Continuation items append into the existing date group's container
    // Prepend a divider since these follow existing items in the group
    const continuationHtml = isContinuation
      ? firstGroup.items
          .map((item, i) => {
            const content = item.threadPreview ? (
              <ResolvedThreadPreview
                rootPost={item.post}
                previewReplies={item.threadPreview.replies}
                totalReplyCount={item.threadPreview.totalReplyCount}
                theme={theme}
              />
            ) : (
              <TimelineItem item={item} theme={theme} />
            );
            return (
              <div key={i}>
                <hr class="border-border my-5" />
                {content}
              </div>
            );
          })
          .map((jsx) => jsx.toString())
          .join("")
      : "";

    // New date groups append to #timeline-feed
    const newGroups = isContinuation ? groups.slice(1) : groups;
    const newGroupsHtml = newGroups
      .map((group) => (
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
          <div id={`date-items-${group.dateKey}`} class="flex flex-col">
            {renderGroupItems(group.items)}
          </div>
        </div>
      ))
      .map((jsx) => jsx.toString())
      .join("");

    // Build load-more button HTML
    const lastGroupDate = groups.at(-1)?.dateKey;
    const loadMoreHtml = nextCursor
      ? (
          <ResolvedLoadMore
            nextCursor={nextCursor}
            lastDate={lastGroupDate}
            theme={theme}
          />
        ).toString()
      : "";

    return sse(c, async (stream) => {
      if (continuationHtml) {
        stream.patchElements(continuationHtml, {
          mode: "append",
          selector: `#date-items-${lastDate}`,
        });
      }
      if (newGroupsHtml) {
        stream.patchElements(newGroupsHtml, {
          mode: "append",
          selector: "#timeline-feed",
        });
      }
      if (loadMoreHtml) {
        stream.patchElements(loadMoreHtml);
      } else {
        stream.remove("#load-more-container");
      }
    });
  }

  // Full page render
  const navData = await getNavigationData(c);
  const components = c.var.config.theme?.components;
  const Page = components?.HomePage ?? DefaultHomePage;

  return renderPublicPage(c, {
    title: navData.siteName,
    navData,
    content: (
      <Page
        items={items}
        hasMore={hasMore}
        nextCursor={nextCursor}
        theme={components}
      />
    ),
  });
});
