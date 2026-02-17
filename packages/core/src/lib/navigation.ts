/**
 * Navigation Helper
 *
 * Provides shared data fetching for public page navigation.
 */

import type { Context } from "hono";
import { getSiteName, getHomeDefaultView } from "./config.js";
import type { Collection, NavItemView } from "../types.js";
import { toNavItemViews } from "./view.js";

/**
 * Navigation data needed by SiteLayout
 */
export interface NavigationData {
  links: NavItemView[];
  currentPath: string;
  siteName: string;
  siteDescription: string;
  isAuthenticated: boolean;
  collections: Collection[];
  homeDefaultView: string;
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
  const items = await c.var.services.navItems.list();
  const currentPath = new URL(c.req.url).pathname;
  const [siteName, homeDefaultView] = await Promise.all([
    getSiteName(c),
    getHomeDefaultView(c),
  ]);

  // Only include description if explicitly set (DB or env), not the default
  const dbDescription = await c.var.services.settings.get("SITE_DESCRIPTION");
  const envDescription = c.env.SITE_DESCRIPTION;
  const siteDescription =
    dbDescription || (typeof envDescription === "string" ? envDescription : "");

  const links = toNavItemViews(items, currentPath);

  // Check auth status for compose button
  let isAuthenticated = false;
  let collections: Collection[] = [];
  if (c.var.auth) {
    try {
      const session = await c.var.auth.api.getSession({
        headers: c.req.raw.headers,
      });
      isAuthenticated = !!session?.user;
    } catch {
      // Not authenticated
    }
  }

  // Only load collections when authenticated (for compose dialog)
  if (isAuthenticated) {
    collections = await c.var.services.collections.list();
  }

  return {
    links,
    currentPath,
    siteName,
    siteDescription,
    isAuthenticated,
    collections,
    homeDefaultView,
  };
}
