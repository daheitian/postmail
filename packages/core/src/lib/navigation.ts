/**
 * Navigation Helper
 *
 * Provides shared data fetching for public page navigation.
 */

import type { Context } from "hono";
import { getSiteName } from "./config.js";
import type { NavLinkView } from "../types.js";
import { toNavLinkViews } from "./view.js";

/**
 * Navigation data needed by SiteLayout
 */
export interface NavigationData {
  links: NavLinkView[];
  currentPath: string;
  siteName: string;
}

/**
 * Fetch navigation data for public pages.
 *
 * Ensures default links exist (Home, Archive, RSS) and returns
 * NavLinkView[] with pre-computed isActive/isExternal state.
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
  const navigationLinks = await c.var.services.navigationLinks.ensureDefaults();
  const currentPath = new URL(c.req.url).pathname;
  const siteName = await getSiteName(c);
  const links = toNavLinkViews(navigationLinks, currentPath);
  return { links, currentPath, siteName };
}
