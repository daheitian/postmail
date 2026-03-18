/**
 * Public Page Rendering Helper
 *
 * Provides a single entry point for rendering public pages with the
 * correct layout stack: BaseLayout > SiteLayout > content.
 */

import type { Context } from "hono";
import type { Child } from "hono/jsx";
import type { SiteLayoutProps } from "../types.js";
import { BaseLayout, type ToastProps } from "../ui/layouts/BaseLayout.js";
import { SiteLayout } from "../ui/layouts/SiteLayout.js";
import type { NavigationData } from "./navigation.js";

export interface RenderPublicPageOptions {
  /** Page title for <title> tag */
  title: string;
  /** Page description for meta tag */
  description?: string;
  /** Optional explicit favicon asset href */
  faviconHref?: string;
  /** Optional explicit apple-touch-icon href */
  appleTouchHref?: string;
  /** Optional explicit social image href */
  socialImageUrl?: string;
  /** Navigation data (from getNavigationData) */
  navData: NavigationData;
  /** Page content JSX to render inside SiteLayout */
  content: Child;
  /** Optional sidebar content for sidebar layout */
  sidebar?: Child;
  /** Optional toast notification */
  toast?: ToastProps;
  /** Whether to render the shared compose dialog shell */
  showComposeDialog?: boolean;
  /** Whether to render the site header */
  showHeader?: boolean;
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
  const {
    title,
    description,
    faviconHref,
    appleTouchHref,
    socialImageUrl,
    navData,
    content,
    sidebar,
    toast,
    showComposeDialog,
    showHeader,
  } = options;

  // Use siteDescription as meta description fallback when not explicitly provided
  const metaDescription = description || navData.siteDescription || undefined;

  // Read favicon, version, and noindex from appConfig
  const appConfig = c.get("appConfig");

  const layoutProps: SiteLayoutProps = {
    siteName: navData.siteName,
    links: navData.links,
    currentPath: navData.currentPath,
    sitePathPrefix: navData.sitePathPrefix,
    isAuthenticated: navData.isAuthenticated,
    collections: navData.collections,
    homeDefaultView: navData.homeDefaultView,
    headerNavMaxVisible: navData.headerNavMaxVisible,
    siteAvatarUrl: navData.siteAvatarUrl,
    showHeaderAvatar: navData.showHeaderAvatar,
    siteFooterHtml: navData.siteFooterHtml,
    sidebar,
    uploadMaxFileSize: appConfig.uploadMaxFileSize,
    showComposeDialog,
    showHeader,
  };
  const faviconUrl = appConfig.siteAvatarUrl || undefined;
  const faviconVersion = appConfig.faviconVersion || undefined;
  const noindex = appConfig.noindex;

  return c.html(
    <BaseLayout
      title={title}
      description={metaDescription}
      c={c}
      faviconHref={faviconHref}
      appleTouchHref={appleTouchHref}
      socialImageUrl={socialImageUrl}
      faviconUrl={faviconUrl}
      faviconVersion={faviconVersion}
      noindex={noindex}
      isAuthenticated={navData.isAuthenticated}
      toast={toast}
    >
      <SiteLayout {...layoutProps}>{content}</SiteLayout>
    </BaseLayout>,
  );
}
