/**
 * Public Page Rendering Helper
 *
 * Provides a single entry point for rendering public pages with the
 * correct layout stack: BaseLayout > SiteLayout > content.
 */

import type { Context } from "hono";
import type { Child } from "hono/jsx";
import type { SiteLayoutProps } from "../types.js";
import { BaseLayout } from "../ui/layouts/BaseLayout.js";
import { SiteLayout } from "../ui/layouts/SiteLayout.js";
import type { NavigationData } from "./navigation.js";

export interface RenderPublicPageOptions {
  /** Page title for <title> tag */
  title: string;
  /** Page description for meta tag */
  description?: string;
  /** Navigation data (from getNavigationData) */
  navData: NavigationData;
  /** Page content JSX to render inside SiteLayout */
  content: Child;
}

/**
 * Render a public page with the standard layout stack.
 *
 * @param c - Hono context
 * @param options - Page rendering options
 * @returns Hono HTML response
 *
 * @example
 * ```typescript
 * const navData = await getNavigationData(c);
 * return renderPublicPage(c, {
 *   title: "My Page",
 *   navData,
 *   content: <MyPageComponent />,
 * });
 * ```
 */
export function renderPublicPage(c: Context, options: RenderPublicPageOptions) {
  const { title, description, navData, content } = options;

  const layoutProps: SiteLayoutProps = {
    siteName: navData.siteName,
    siteDescription: navData.siteDescription,
    links: navData.links,
    currentPath: navData.currentPath,
    isAuthenticated: navData.isAuthenticated,
    collections: navData.collections,
    homeDefaultView: navData.homeDefaultView,
    siteAvatarUrl: navData.siteAvatarUrl,
    showHeaderAvatar: navData.showHeaderAvatar,
    siteFooterHtml: navData.siteFooterHtml,
  };

  // Read favicon and noindex from context (set by theme middleware)
  const faviconUrl = c.get("faviconUrl") as string | undefined;
  const noindex = c.get("noindex") as boolean | undefined;

  return c.html(
    <BaseLayout
      title={title}
      description={description}
      c={c}
      faviconUrl={faviconUrl}
      noindex={noindex}
    >
      <SiteLayout {...layoutProps}>{content}</SiteLayout>
    </BaseLayout>,
  );
}
