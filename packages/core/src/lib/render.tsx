/**
 * Public Page Rendering Helper
 *
 * Provides a single entry point for rendering public pages with the
 * correct layout stack: BaseLayout > SiteLayout > content.
 */

import type { Context } from "hono";
import type { Child } from "hono/jsx";
import type { SiteLayoutProps } from "../types.js";
import { SETTINGS_KEYS } from "./constants.js";
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
  /**
   * Absolute canonical URL for this page. Forwarded to `BaseLayout` and
   * rendered as `<link rel="canonical">`. Only set when the page has a
   * different canonical location (e.g. thread reply pages point back to the
   * thread root).
   */
  canonicalHref?: string;
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
  /** Whether to render the home branding credit after the site footer */
  showHomeBranding?: boolean;
  /** When set, the mobile compose FAB pre-selects this collection. */
  composeCollectionId?: string;
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
    canonicalHref,
    navData,
    content,
    sidebar,
    toast,
    showComposeDialog,
    showHeader,
    showHomeBranding,
    composeCollectionId,
  } = options;

  // Use siteDescription as meta description fallback when not explicitly provided
  const metaDescription = description || navData.siteDescription || undefined;

  // Read favicon, version, and noindex from appConfig
  const appConfig = c.get("appConfig");
  const allSettings = c.get("allSettings") as Record<string, string>;

  const layoutProps: SiteLayoutProps = {
    siteName: navData.siteName,
    links: navData.links,
    currentPath: navData.currentPath,
    sitePathPrefix: navData.sitePathPrefix,
    isAuthenticated: navData.isAuthenticated,
    collections: navData.collections,
    siteAvatarUrl: navData.siteAvatarUrl,
    showHeaderAvatar: navData.showHeaderAvatar,
    siteDescriptionHtml: navData.siteDescriptionHtml,
    siteFooterHtml: navData.siteFooterHtml,
    showHomeBranding,
    sidebar,
    uploadMaxFileSize: appConfig.uploadMaxFileSize,
    showComposeDialog,
    showHeader,
    composeOpenShortcutDiscovered: Boolean(
      allSettings[SETTINGS_KEYS.DISCOVERY_COMPOSE_OPEN_SHORTCUT_AT],
    ),
    composeCollectionId,
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
      canonicalHref={canonicalHref}
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
