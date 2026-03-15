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
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getNavigationData } from "../../lib/navigation.js";
import { getI18n } from "../../i18n/index.js";
import { formatPageLabel, parsePageNumber } from "../../lib/pagination.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import {
  assembleFeaturedTimeline,
  assembleTimeline,
} from "../../lib/timeline.js";
import { HomePage } from "../../ui/pages/HomePage.js";
import { FeaturedPage } from "../../ui/pages/FeaturedPage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const homeRoutes = new Hono<Env>();

homeRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);
  const i18n = getI18n(c);
  const page = parsePageNumber(c.req.query("page"));
  const paginatedPageTitle = formatPageLabel(page);

  if (navData.homeDefaultView === "featured") {
    const featuredTitle = i18n._(
      msg({
        message: "Featured",
        comment: "@context: Browser page title for the featured feed",
      }),
    );
    const { items, currentPage, totalPages } = await assembleFeaturedTimeline(
      c,
      {
        page,
        isAuthenticated: navData.isAuthenticated,
      },
    );

    return renderPublicPage(c, {
      title:
        page > 1
          ? buildPageTitle(featuredTitle, paginatedPageTitle, navData.siteName)
          : navData.siteName,
      navData,
      content: (
        <FeaturedPage
          items={items}
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/"
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

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
    isAuthenticated: navData.isAuthenticated,
  });

  return renderPublicPage(c, {
    title:
      page > 1
        ? buildPageTitle(latestTitle, paginatedPageTitle, navData.siteName)
        : navData.siteName,
    navData,
    content: (
      <HomePage
        items={items}
        baseUrl="/"
        currentPage={currentPage}
        totalPages={totalPages}
      />
    ),
  });
});
