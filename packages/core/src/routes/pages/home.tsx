/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 * Uses page-based pagination.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { createMediaContext, toPostViewsFromPosts } from "../../lib/view.js";
import { HomePage } from "../../ui/pages/HomePage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const pageParam = c.req.query("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
  });

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
        currentPage={currentPage}
        totalPages={totalPages}
      />
    ),
  });
});
