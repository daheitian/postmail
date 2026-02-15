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

    // Render items to HTML
    const itemsHtml = items
      .map((item) => {
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
          <div>
            <hr class="border-border" />
            <div class="py-6">{content}</div>
          </div>
        );
      })
      .map((jsx) => jsx.toString())
      .join("");

    // Build load-more button HTML
    const loadMoreHtml = nextCursor
      ? (<ResolvedLoadMore nextCursor={nextCursor} theme={theme} />).toString()
      : "";

    return sse(c, async (stream) => {
      stream.patchElements(itemsHtml, {
        mode: "append",
        selector: "#timeline-feed",
      });
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
