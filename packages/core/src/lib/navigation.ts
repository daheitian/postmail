/**
 * Navigation Helper
 *
 * Provides shared data fetching for public page navigation.
 */

import type { Context } from "hono";
import { getSiteName } from "./config.js";
import type { NavItemView } from "../types.js";
import { toNavItemViews } from "./view.js";

/**
 * Navigation data needed by SiteLayout
 */
export interface NavigationData {
  links: NavItemView[];
  currentPath: string;
  siteName: string;
}

/**
 * Fetch navigation data for public pages.
 *
 * Returns NavItemView[] with pre-computed isActive/isExternal state.
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
  const siteName = await getSiteName(c);
  const links = toNavItemViews(items, currentPath);
  return { links, currentPath, siteName };
}
