/**
 * Navigation Helper
 *
 * Provides shared data fetching for public page navigation.
 */

import type { Context } from "hono";
import { getSiteName } from "./config.js";
import type { NavigationLink } from "../types.js";

/**
 * Navigation data needed by SiteLayout
 */
export interface NavigationData {
  navigationLinks: NavigationLink[];
  currentPath: string;
  siteName: string;
}

/**
 * Fetch navigation data for public pages.
 *
 * Ensures default links exist (Home, Archive, RSS) and returns
 * the current path and site name alongside the links.
 *
 * @param c - Hono context
 * @returns Navigation data for SiteLayout
 *
 * @example
 * ```typescript
 * const navData = await getNavigationData(c);
 * return c.html(
 *   <BaseLayout c={c}>
 *     <SiteLayout {...navData}>
 *       <MyContent />
 *     </SiteLayout>
 *   </BaseLayout>
 * );
 * ```
 */
export async function getNavigationData(c: Context): Promise<NavigationData> {
  const navigationLinks = await c.var.services.navigationLinks.ensureDefaults();
  const currentPath = new URL(c.req.url).pathname;
  const siteName = await getSiteName(c);
  return { navigationLinks, currentPath, siteName };
}
