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
import { HomePage as DefaultHomePage } from "../../themes/threads/pages/HomePage.js";

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

    const themeConfig = c.var.config.theme;
    const renderMore = themeConfig?.timelineMore;
    if (!renderMore) {
      // Should never happen — default theme always provides timelineMore
      return sse(c, async (stream) => {
        stream.remove("#load-more-container");
      });
    }

    const patches = renderMore({
      items,
      lastDate: lastDate ?? undefined,
      hasMore,
      nextCursor,
      theme: themeConfig?.components,
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
