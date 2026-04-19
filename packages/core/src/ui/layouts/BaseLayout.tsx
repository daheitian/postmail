/**
 * Base HTML Layout
 *
 * Provides the HTML shell with meta tags, styles, and scripts.
 * If Context is provided, automatically wraps children with I18nProvider.
 *
 * In dev mode (Vite), serves assets via Vite's dev server.
 * In production, serves pre-built assets with content-hashed filenames.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { Context } from "hono";
import { raw } from "hono/utils/html";
import { msg } from "@lingui/core/macro";
import {
  getPublicAssetBasePath,
  toAssetPath,
  toPublicAssetPath,
} from "../../lib/asset-path.js";
import { getJantIconHref } from "../../lib/jant-branding.js";
import { getThemeBrowserColors, resolveBuiltinTheme } from "../../lib/theme.js";
import { isFullUrl, toAbsoluteSiteUrl, toPublicPath } from "../../lib/url.js";
import {
  CLIENT_AUTH_JS_FILE,
  CLIENT_CJK_CSS_FILE,
  CLIENT_CJK_JP_CSS_FILE,
  CLIENT_CJK_KR_CSS_FILE,
  CLIENT_CJK_TC_CSS_FILE,
  CLIENT_CSS_FILE,
  CLIENT_JS_FILE,
  CORE_VERSION,
  IS_VITE_DEV,
} from "../../lib/version.js";
import { I18nProvider } from "../../i18n/index.js";

export interface ToastProps {
  message: string;
  type?: "success" | "error";
}

export interface BaseLayoutProps {
  title: string;
  description?: string;
  lang?: string;
  c?: Context;
  toast?: ToastProps;
  faviconHref?: string;
  appleTouchHref?: string;
  faviconUrl?: string;
  faviconVersion?: string;
  socialImageUrl?: string;
  noindex?: boolean;
  isAuthenticated?: boolean;
  clientBundle?: "public" | "full";
}

export const BaseLayout: FC<PropsWithChildren<BaseLayoutProps>> = ({
  title,
  description,
  lang,
  c,
  toast,
  faviconHref,
  appleTouchHref,
  faviconUrl,
  faviconVersion,
  socialImageUrl,
  noindex,
  isAuthenticated = false,
  clientBundle,
  children,
}) => {
  // Read lang from Hono context if available, otherwise use prop or default
  const resolvedLang = lang ?? (c ? c.get("lang") : "en");

  // Read favicon/noindex from appConfig when not provided as prop
  const appConfig = c ? c.get("appConfig") : undefined;
  const resolvedSocialImagePath =
    socialImageUrl ??
    faviconUrl ??
    appConfig?.siteAvatarUrl ??
    getJantIconHref("socialImage", appConfig?.sitePathPrefix || "");
  const resolvedFaviconVersion =
    faviconVersion ?? (appConfig?.faviconVersion || undefined);
  const resolvedNoindex = noindex ?? appConfig?.noindex;
  const sitePathPrefix = appConfig?.sitePathPrefix || "";
  const assetBasePath = IS_VITE_DEV
    ? "/"
    : appConfig?.assetBasePath || getPublicAssetBasePath(sitePathPrefix);
  const currentUrl = c ? c.get("publicRequestUrl") : undefined;
  const rawPath = c?.req?.path ?? "/";
  const manifestStartPath = sitePathPrefix
    ? rawPath.replace(
        new RegExp(`^${sitePathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        "",
      ) || "/"
    : rawPath;
  const siteName = appConfig?.siteName;
  const i18n = c ? c.get("i18n") : undefined;
  const assetPath = (path: string) =>
    IS_VITE_DEV ? path : toAssetPath(path, assetBasePath);

  // Automatically wrap with I18nProvider if Context is provided
  const content = c ? <I18nProvider c={c}>{children}</I18nProvider> : children;

  // Read theme style from Hono context if available
  const themeStyle = c ? c.get("themeStyle") : undefined;

  // Read custom CSS from appConfig
  const customCSS = appConfig?.customCSS || undefined;
  // Code-injection escape hatches: admin-only settings, rendered raw on every
  // page so analytics scripts, chat widgets, etc. can be installed site-wide.
  // These are deliberate exceptions to the "everything goes through escapeHtml"
  // rule — see CLAUDE.md / Code Injection settings page.
  const customHeadHtml = appConfig?.customHeadHtml || undefined;
  const customBodyEndHtml = appConfig?.customBodyEndHtml || undefined;
  const themeMode = appConfig?.themeMode ?? "auto";
  const activeTheme = resolveBuiltinTheme(appConfig?.themeId);
  const browserThemeColors = getThemeBrowserColors(activeTheme);
  const resolvedClientBundle =
    clientBundle ?? (isAuthenticated ? "full" : "public");
  const cjkSerifFont = appConfig?.cjkSerifFont ?? "off";
  const cjkStylesheetPath =
    cjkSerifFont === "zh-Hans"
      ? IS_VITE_DEV
        ? assetPath("/src/style-cjk.css")
        : toPublicAssetPath(CLIENT_CJK_CSS_FILE, assetBasePath)
      : cjkSerifFont === "zh-Hant"
        ? IS_VITE_DEV
          ? assetPath("/src/style-cjk-tc.css")
          : toPublicAssetPath(CLIENT_CJK_TC_CSS_FILE, assetBasePath)
        : cjkSerifFont === "ja"
          ? IS_VITE_DEV
            ? assetPath("/src/style-cjk-jp.css")
            : toPublicAssetPath(CLIENT_CJK_JP_CSS_FILE, assetBasePath)
          : cjkSerifFont === "ko"
            ? IS_VITE_DEV
              ? assetPath("/src/style-cjk-kr.css")
              : toPublicAssetPath(CLIENT_CJK_KR_CSS_FILE, assetBasePath)
            : null;
  const clientScriptPath = IS_VITE_DEV
    ? resolvedClientBundle === "full"
      ? assetPath("/src/client-auth.ts")
      : assetPath("/src/client.ts")
    : // Content-hashed filenames embedded from the Vite client manifest; the
      // hash changes whenever the bundle content changes, so the import path in
      // client-auth.js always references the correct (not stale-cached) client.js.
      toPublicAssetPath(
        resolvedClientBundle === "full" ? CLIENT_AUTH_JS_FILE : CLIENT_JS_FILE,
        assetBasePath,
      );
  const faviconAssetVersion = resolvedFaviconVersion || CORE_VERSION;
  const resolvedFaviconHref =
    faviconHref ??
    (faviconAssetVersion
      ? toPublicPath(`/favicon.ico?v=${faviconAssetVersion}`, sitePathPrefix)
      : toPublicPath("/favicon.ico", sitePathPrefix));
  const resolvedAppleTouchHref =
    appleTouchHref ??
    (faviconAssetVersion
      ? toPublicPath(
          `/apple-touch-icon.png?v=${faviconAssetVersion}`,
          sitePathPrefix,
        )
      : toPublicPath("/apple-touch-icon.png", sitePathPrefix));
  const socialImageHref =
    resolvedSocialImagePath &&
    (isFullUrl(resolvedSocialImagePath) ||
    resolvedSocialImagePath.startsWith("//")
      ? resolvedSocialImagePath
      : toAbsoluteSiteUrl(
          resolvedSocialImagePath,
          appConfig?.siteUrl || "",
          sitePathPrefix,
        ));
  const mainFeedHref = appConfig ? toPublicPath("/feed", sitePathPrefix) : null;
  const latestFeedHref = appConfig
    ? toPublicPath("/feed/latest", sitePathPrefix)
    : null;
  const featuredFeedHref = appConfig
    ? toPublicPath("/feed/featured", sitePathPrefix)
    : null;
  const mainFeedTitle =
    i18n?._(
      msg({
        message: "Main feed",
        comment: "@context: Feed autodiscovery title for the site's main feed",
      }),
    ) ?? "Main feed";
  const latestFeedTitle =
    i18n?._(
      msg({
        message: "Latest posts",
        comment:
          "@context: Feed autodiscovery title for the latest public posts feed",
      }),
    ) ?? "Latest posts";
  const featuredFeedTitle =
    i18n?._(
      msg({
        message: "Featured posts",
        comment:
          "@context: Feed autodiscovery title for the featured posts feed",
      }),
    ) ?? "Featured posts";
  const alternateFeed =
    appConfig?.mainRssFeed === "latest"
      ? { href: featuredFeedHref, title: featuredFeedTitle }
      : { href: latestFeedHref, title: latestFeedTitle };

  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html
        lang={resolvedLang}
        data-theme-mode={themeMode}
        data-site-path-prefix={sitePathPrefix}
        data-asset-base-path={assetBasePath}
      >
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          {themeMode === "dark" ? (
            <meta name="theme-color" content={browserThemeColors.dark} />
          ) : themeMode === "light" ? (
            <meta name="theme-color" content={browserThemeColors.light} />
          ) : (
            <>
              <meta name="theme-color" content={browserThemeColors.light} />
              <meta
                name="theme-color"
                content={browserThemeColors.light}
                media="(prefers-color-scheme: light)"
              />
              <meta
                name="theme-color"
                content={browserThemeColors.dark}
                media="(prefers-color-scheme: dark)"
              />
            </>
          )}
          <title>{title}</title>
          {description && <meta name="description" content={description} />}
          <meta property="og:title" content={title} />
          <meta property="og:type" content="website" />
          {description && (
            <meta property="og:description" content={description} />
          )}
          {socialImageHref && (
            <meta property="og:image" content={socialImageHref} />
          )}
          {siteName && <meta property="og:site_name" content={siteName} />}
          {currentUrl && <meta property="og:url" content={currentUrl} />}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={title} />
          {description && (
            <meta name="twitter:description" content={description} />
          )}
          {socialImageHref && (
            <meta name="twitter:image" content={socialImageHref} />
          )}
          {resolvedNoindex && (
            <meta name="robots" content="noindex, nofollow" />
          )}
          <link rel="icon" href={resolvedFaviconHref} sizes="16x16 32x32" />
          <link rel="apple-touch-icon" href={resolvedAppleTouchHref} />
          <link
            rel="manifest"
            href={toPublicPath(
              manifestStartPath && manifestStartPath !== "/"
                ? `/manifest.webmanifest?start=${encodeURIComponent(manifestStartPath)}&name=${encodeURIComponent(title)}`
                : "/manifest.webmanifest",
              sitePathPrefix,
            )}
          />
          {mainFeedHref && (
            <link
              rel="alternate"
              type="application/atom+xml"
              title={mainFeedTitle}
              href={mainFeedHref}
            />
          )}
          {alternateFeed.href && (
            <link
              rel="alternate"
              type="application/atom+xml"
              title={alternateFeed.title}
              href={alternateFeed.href}
            />
          )}
          {IS_VITE_DEV && (
            <script type="module" src={assetPath("/@vite/client")} />
          )}
          <link
            rel="stylesheet"
            href={
              IS_VITE_DEV
                ? assetPath("/src/style.css")
                : toPublicAssetPath(CLIENT_CSS_FILE, assetBasePath)
            }
          />
          {cjkStylesheetPath && (
            <link rel="stylesheet" href={cjkStylesheetPath} />
          )}
          {/* Critical inline style: prevent mobile nav jitter by applying
              responsive header layout before external CSS/JS loads */}
          <style
            dangerouslySetInnerHTML={{
              __html: `.site-header-search-link,.site-header-hamburger,.site-header-more-responsive-only,.site-header-more-link-responsive,.site-header-more-divider-responsive{display:none!important}@media(max-width:1200px){.site-header-search-form{display:none!important}.site-header-search-link{display:inline-flex!important}}@media(max-width:960px){.site-header-link-collapse-lg{display:none!important}.site-header-more-responsive-only.site-header-more-tier-lg{display:inline-flex!important}.site-header-more-link-show-lg{display:flex!important}.site-header-more-divider-responsive{display:block!important}}@media(max-width:780px){.site-header-link-collapse-md{display:none!important}.site-header-more-responsive-only.site-header-more-tier-md{display:inline-flex!important}.site-header-more-link-show-md{display:flex!important}}@media(max-width:580px){.site-header-link-collapse-sm{display:none!important}.site-header-more-responsive-only.site-header-more-tier-sm{display:inline-flex!important}.site-header-more-link-show-sm{display:flex!important}}@media(max-width:480px){.site-header-nav,.site-header-more{display:none!important}.site-header-search-slot{display:flex!important}.site-header-hamburger{display:flex!important}.site-header-right{margin-left:.35rem}}`,
            }}
          />
          {themeStyle && (
            <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
          )}
          {customCSS && (
            <style dangerouslySetInnerHTML={{ __html: customCSS }} />
          )}
          {customHeadHtml && raw(customHeadHtml)}
          <script type="module" src={clientScriptPath} />
        </head>
        <body
          class="bg-background text-foreground antialiased"
          {...(isAuthenticated ? { "data-authenticated": true } : {})}
        >
          {content}
          <div id="toast-container" class="toast-container" popover="manual">
            {toast && (
              <div
                class={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
                data-init="el.closest('[popover]').showPopover(); history.replaceState({}, '', location.pathname); setTimeout(() => { el.classList.add('toast-out'); el.addEventListener('animationend', () => el.remove()) }, 3000)"
              >
                {toast.type === "error" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                )}
                <span>{toast.message}</span>
                <button
                  class="toast-close"
                  data-on:click="el.closest('.toast').classList.add('toast-out'); el.closest('.toast').addEventListener('animationend', () => el.closest('.toast').remove())"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {customBodyEndHtml && raw(customBodyEndHtml)}
        </body>
      </html>
    </>
  );
};
