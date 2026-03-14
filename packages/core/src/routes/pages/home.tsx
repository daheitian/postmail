/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 * Uses page-based pagination.
 *
 * When HOME_DEFAULT_VIEW is "featured", the homepage shows featured posts
 * instead of latest. The /latest route always shows latest posts explicitly.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { elapsedMs, logTiming } from "../../lib/request-timing.js";
import {
  createMediaContext,
  toPostViewsFromPosts,
  loadThreadRootPermalinks,
} from "../../lib/view.js";
import { HomePage } from "../../ui/pages/HomePage.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const routeStart = Date.now();
  const navData = await getNavigationData(c);

  if (navData.homeDefaultView === "featured") {
    // Show featured posts on homepage
    const featuredStart = Date.now();
    const posts = await c.var.services.posts.list({
      featured: true,
      status: "published",
      excludePrivate: !navData.isAuthenticated,
    });
    const mediaCtx = createMediaContext(c.var.appConfig);

    const rootPermalinkMap = await loadThreadRootPermalinks(
      posts,
      c.var.services.posts.getById.bind(c.var.services.posts),
    );

    const postViews = toPostViewsFromPosts(posts, mediaCtx, rootPermalinkMap);
    const items = postViews.map((post) => ({ post }));

    logTiming(c.var.requestTrace, "home.featured.completed", {
      durationMs: elapsedMs(featuredStart),
      itemCount: items.length,
      isAuthenticated: navData.isAuthenticated,
    });
    logTiming(c.var.requestTrace, "home.route.completed", {
      durationMs: elapsedMs(routeStart),
      isAuthenticated: navData.isAuthenticated,
      view: "featured",
    });

    return renderPublicPage(c, {
      title: navData.siteName,
      navData,
      content: <FeaturedPage items={items} />,
    });
  }

  // Default: show latest posts (pinned posts sort to top via service layer)
  const pageParam = c.req.query("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
    isAuthenticated: navData.isAuthenticated,
  });

  logTiming(c.var.requestTrace, "home.route.completed", {
    durationMs: elapsedMs(routeStart),
    isAuthenticated: navData.isAuthenticated,
    view: "latest",
    itemCount: items.length,
    currentPage,
    totalPages,
  });

  return renderPublicPage(c, {
    title: navData.siteName,
    navData,
    content: (
      <HomePage
        items={items}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    ),
  });
});
