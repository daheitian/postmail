/**
 * Navigation Helper
 *
 * Provides shared data fetching for public page navigation.
 */

import type { Context } from "hono";
import type { Collection, NavItemView } from "../types.js";
import { elapsedMs, logTiming } from "./request-timing.js";
import { toNavItemViews } from "./view.js";
import { render as renderMarkdown } from "./markdown.js";

/**
 * Navigation data needed by public page rendering
 */
export interface NavigationData {
  links: NavItemView[];
  currentPath: string;
  siteName: string;
  /** Used as meta description fallback and in RSS/Atom feeds */
  siteDescription: string;
  isAuthenticated: boolean;
  collections: Collection[];
  homeDefaultView: string;
  headerNavMaxVisible: number;
  siteAvatarUrl?: string;
  showHeaderAvatar?: boolean;
  siteFooterHtml?: string;
}

/**
 * Fetch navigation data for public pages.
 *
 * Returns NavItemView[] with pre-computed isActive/isExternal state.
 * Also checks authentication status and loads collections for authenticated users.
 *
 * @param c - Hono context
 * @returns Navigation data for SiteLayout
 *
 * @example
 * ```typescript
 * const navData = await getNavigationData(c);
 * return renderPublicPage(c, {
 *   title: "My Page",
 *   navData,
 *   content: <MyContent />,
 * });
 * ```
 */
export async function getNavigationData(c: Context): Promise<NavigationData> {
  const shouldLogTiming = c.var.requestTrace?.path === "/";
  const navigationStart = shouldLogTiming ? Date.now() : 0;

  const navItemsStart = shouldLogTiming ? Date.now() : 0;
  const items = await c.var.services.navItems.list();
  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.navigation.nav-items.loaded", {
      durationMs: elapsedMs(navItemsStart),
      itemCount: items.length,
    });
  }
  const currentPath = new URL(c.req.url).pathname;
  const appConfig = c.var.appConfig;

  const siteName = appConfig.siteName;
  const homeDefaultView = appConfig.homeDefaultView;
  const siteFooter = appConfig.siteFooter;

  // Only include description if explicitly set (DB or env), not the default
  const siteDescription = appConfig.siteDescriptionExplicit
    ? appConfig.siteDescription
    : "";

  // Avatar URL and display flag come from appConfig
  const siteAvatarUrl = appConfig.siteAvatarUrl || undefined;
  const showHeaderAvatar = appConfig.showHeaderAvatar;

  // Render footer markdown
  const siteFooterHtml = siteFooter ? renderMarkdown(siteFooter) : undefined;

  // Check auth status (needed for compose button and system nav items)
  let isAuthenticated = false;
  let collections: Collection[] = [];
  try {
    const sessionStart = shouldLogTiming ? Date.now() : 0;
    const session = await c.var.auth.api.getSession({
      headers: c.req.raw.headers,
    });
    isAuthenticated = !!session?.user;
    if (shouldLogTiming) {
      logTiming(c.var.requestTrace, "home.navigation.session.checked", {
        durationMs: elapsedMs(sessionStart),
        isAuthenticated,
      });
    }
  } catch {
    // Not authenticated
    if (shouldLogTiming) {
      logTiming(c.var.requestTrace, "home.navigation.session.checked", {
        isAuthenticated: false,
      });
    }
  }

  const links = toNavItemViews(items, currentPath, isAuthenticated);

  // Only load collections when authenticated (for compose dialog)
  if (isAuthenticated) {
    const collectionsStart = shouldLogTiming ? Date.now() : 0;
    collections = await c.var.services.collections.listByRecentActivity();
    if (shouldLogTiming) {
      logTiming(c.var.requestTrace, "home.navigation.collections.loaded", {
        durationMs: elapsedMs(collectionsStart),
        collectionsCount: collections.length,
      });
    }
  }

  if (shouldLogTiming) {
    logTiming(c.var.requestTrace, "home.navigation.completed", {
      durationMs: elapsedMs(navigationStart),
      isAuthenticated,
    });
  }

  return {
    links,
    currentPath,
    siteName,
    siteDescription,
    isAuthenticated,
    collections,
    homeDefaultView,
    headerNavMaxVisible: appConfig.headerNavMaxVisible,
    siteAvatarUrl,
    showHeaderAvatar: showHeaderAvatar && !!siteAvatarUrl,
    siteFooterHtml,
  };
}
