/**
 * Latest Page Route
 *
 * Explicit /latest URL that always shows the latest posts timeline.
 * When Latest is the homepage default, this redirects to / to avoid
 * duplicate content. When Featured comes first, this serves as the
 * explicit latest view.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getI18n } from "../../i18n/index.js";
import { getNavigationData } from "../../lib/navigation.js";
import { formatPageLabel, parsePageNumber } from "../../lib/pagination.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { renderPublicPage } from "../../lib/render.js";
import { assembleTimeline } from "../../lib/timeline.js";
import { toPublicPath } from "../../lib/url.js";
import { defaultFeedRenderer } from "../../lib/feed.js";
import { buildFeedData, parseFormatQuery, renderFeed } from "../feed/feed.js";
import { HomePage } from "../../ui/pages/HomePage.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const latestRoutes = new Hono<Env>();

latestRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);
  const i18n = getI18n(c);

  // When homepage already shows latest, redirect to avoid duplicate content
  if (navData.homeDefaultView !== "featured") {
    return c.redirect(toPublicPath("/", navData.sitePathPrefix), 302);
  }

  const page = parsePageNumber(c.req.query("page"));
  const latestTitle = i18n._(
    msg({
      message: "Latest",
      comment: "@context: Browser page title for the latest feed",
    }),
  );
  const paginatedPageTitle = formatPageLabel(page);

  const { items, currentPage, totalPages } = await assembleTimeline(c, {
    page,
    isAuthenticated: navData.isAuthenticated,
  });

  return renderPublicPage(c, {
    title:
      page > 1
        ? buildPageTitle(latestTitle, paginatedPageTitle, navData.siteName)
        : buildPageTitle(latestTitle, navData.siteName),
    navData,
    content: (
      <HomePage
        items={items}
        baseUrl={toPublicPath("/latest", navData.sitePathPrefix)}
        currentPage={currentPage}
        totalPages={totalPages}
        isAuthenticated={navData.isAuthenticated}
        signinUrl={`${toPublicPath("/signin", navData.sitePathPrefix)}?redirect=${encodeURIComponent(toPublicPath("/latest", navData.sitePathPrefix))}`}
      />
    ),
  });
});

// Atom — /latest/feed (canonical latest feed; accepts ?format=note|link|quote)
latestRoutes.get("/feed", async (c) => {
  const format = parseFormatQuery(c);
  const feedData = await buildFeedData(c, {
    kind: "latest",
    selfPath: "/latest/feed",
    format,
  });
  return renderFeed(defaultFeedRenderer(feedData));
});

// Legacy atom.xml suffix → canonical /latest/feed (preserves ?format=)
latestRoutes.get("/feed/atom.xml", (c) => {
  const sitePathPrefix = c.var.appConfig.sitePathPrefix;
  const qs = c.req.url.includes("?")
    ? c.req.url.slice(c.req.url.indexOf("?"))
    : "";
  return c.redirect(
    `${toPublicPath("/latest/feed", sitePathPrefix)}${qs}`,
    308,
  );
});
