/**
 * Home Page Route
 *
 * Timeline feed with per-type card components and thread previews.
 * Uses page-based pagination.
 *
 * The homepage shows whichever built-in feed comes first between
 * Latest and Featured in navigation. The explicit feed routes still work.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import {
  getHomeDefaultViewFromNavItems,
  getNavigationData,
} from "../../lib/navigation.js";
import { getI18n } from "../../i18n/index.js";
import { formatPageLabel, parsePageNumber } from "../../lib/pagination.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import {
  assembleFeaturedTimeline,
  assembleTimeline,
} from "../../lib/timeline.js";
import { toPublicPath } from "../../lib/url.js";
import { HomePage } from "../../ui/pages/HomePage.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const i18n = getI18n(c);
  const page = parsePageNumber(c.req.query("page"));
  const paginatedPageTitle = formatPageLabel(page);
  const isAuthenticated = c.var.isAuthenticated;

  // Fetch nav items once — we need `homeDefaultView` to decide which timeline
  // to assemble, but `getNavigationData` also consumes them. Passing them
  // through avoids a duplicate DB query and unlocks the Promise.all below.
  const navItems = await c.var.services.navItems.list();
  const homeDefaultView = getHomeDefaultViewFromNavItems(navItems);

  const timelinePromise =
    homeDefaultView === "featured"
      ? assembleFeaturedTimeline(c, { page, isAuthenticated })
      : assembleTimeline(c, { page, isAuthenticated });

  const [navData, timeline] = await Promise.all([
    getNavigationData(c, { preloadedItems: navItems }),
    timelinePromise,
  ]);

  const { items, currentPage, totalPages } = timeline;

  if (homeDefaultView === "featured") {
    const featuredTitle = i18n._(
      msg({
        message: "Featured",
        comment: "@context: Browser page title for the featured feed",
      }),
    );

    return renderPublicPage(c, {
      title:
        page > 1
          ? buildPageTitle(featuredTitle, paginatedPageTitle, navData.siteName)
          : navData.siteName,
      navData,
      showHomeBranding:
        c.var.appConfig.showJantBrandingOnHome && currentPage === 1,
      content: (
        <FeaturedPage
          items={items}
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl={toPublicPath("/", navData.sitePathPrefix)}
        />
      ),
    });
  }

  const latestTitle = i18n._(
    msg({
      message: "Latest",
      comment: "@context: Browser page title for the latest feed",
    }),
  );

  return renderPublicPage(c, {
    title:
      page > 1
        ? buildPageTitle(latestTitle, paginatedPageTitle, navData.siteName)
        : navData.siteName,
    navData,
    showHomeBranding:
      c.var.appConfig.showJantBrandingOnHome && currentPage === 1,
    content: (
      <HomePage
        items={items}
        baseUrl={toPublicPath("/", navData.sitePathPrefix)}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    ),
  });
});
