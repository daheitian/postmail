/**
 * Public Page Rendering Helper
 *
 * Provides a single entry point for rendering public pages with the
 * correct layout stack: BaseLayout > SiteLayout > content.
 *
 * BaseLayout is always the built-in implementation (handles Vite assets,
 * I18nProvider, toast). SiteLayout is resolved from theme components.
 */

import type { Context } from "hono";
import type { Child } from "hono/jsx";
import type { ThemeComponents, SiteLayoutProps } from "../types.js";
import { BaseLayout } from "../theme/layouts/BaseLayout.js";
import { ThreadsSiteLayout as DefaultSiteLayout } from "../themes/threads/ThreadsSiteLayout.js";
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
 * Always uses the built-in BaseLayout, resolves SiteLayout from theme config.
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

  const components = c.var.config?.theme?.components as
    | ThemeComponents
    | undefined;
  const Layout = components?.SiteLayout ?? DefaultSiteLayout;

  const layoutProps: SiteLayoutProps = {
    siteName: navData.siteName,
    siteDescription: navData.siteDescription,
    links: navData.links,
    currentPath: navData.currentPath,
    isAuthenticated: navData.isAuthenticated,
    collections: navData.collections,
  };

  return c.html(
    <BaseLayout title={title} description={description} c={c}>
      <Layout {...layoutProps}>{content}</Layout>
    </BaseLayout>,
  );
}
