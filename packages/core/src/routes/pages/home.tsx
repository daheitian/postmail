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
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { HomePage } from "../../ui/pages/HomePage.js";
import { timelineMore } from "../../ui/feed/timelineMore.js";

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

    const patches = timelineMore({
      items,
      hasMore,
      nextCursor,
    });

    return sse(c, async (stream) => {
      for (const patch of patches) {
        if (patch.mode === "remove") {
          stream.remove(patch.selector);
        } else {
          stream.patchElements(patch.content, {
            mode: patch.mode,
            selector: patch.selector,
          });
        }
      }
    });
  }

  // Full page render
  const navData = await getNavigationData(c);

  // Fetch pinned posts
  const pinnedPosts = await c.var.services.posts.list({
    pinned: true,
    status: "published",
    excludeReplies: true,
  });
  const mediaCtx = createMediaContext(c);
  const pinnedItems = toPostViewsFromPosts(pinnedPosts, mediaCtx);

  return renderPublicPage(c, {
    title: navData.siteName,
    navData,
    content: (
      <HomePage
        items={items}
        pinnedItems={pinnedItems}
        hasMore={hasMore}
        nextCursor={nextCursor}
      />
    ),
  });
});
