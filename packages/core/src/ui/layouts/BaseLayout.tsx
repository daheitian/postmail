/**
 * Base HTML Layout
 *
 * Provides the HTML shell with meta tags, styles, and scripts.
 * If Context is provided, automatically wraps children with I18nProvider.
 *
 * In dev mode (Vite), serves assets via Vite's dev server.
 * In production, serves pre-built assets with version cache-busting.
 */

import type { FC, PropsWithChildren } from "hono/jsx";
import type { Context } from "hono";
import { toAssetPath } from "../../lib/asset-path.js";
import { getJantIconHref } from "../../lib/jant-branding.js";
import { isFullUrl, toAbsoluteSiteUrl, toPublicPath } from "../../lib/url.js";
import { CORE_VERSION, IS_VITE_DEV } from "../../lib/version.js";
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
    : appConfig?.assetBasePath || toAssetPath("");
  const currentUrl = c ? c.get("publicRequestUrl") : undefined;
  const siteName = appConfig?.siteName;
  const assetPath = (path: string) => (IS_VITE_DEV ? path : toAssetPath(path));

  // Automatically wrap with I18nProvider if Context is provided
  const content = c ? <I18nProvider c={c}>{children}</I18nProvider> : children;

  // Read theme style from Hono context if available
  const themeStyle = c ? c.get("themeStyle") : undefined;

  // Read custom CSS from appConfig
  const customCSS = appConfig?.customCSS || undefined;
  const themeMode = appConfig?.themeMode ?? "auto";
  const resolvedClientBundle =
    clientBundle ?? (isAuthenticated ? "full" : "public");
  const fontLanguage = appConfig?.siteLanguage?.toLowerCase() ?? "";
  const cjkStylesheetPath =
    fontLanguage === "zh-hans" ||
    fontLanguage === "zh-cn" ||
    fontLanguage === "zh-sg"
      ? IS_VITE_DEV
        ? assetPath("/src/style-cjk.css")
        : toAssetPath(`/client-cjk.css?v=${CORE_VERSION}`)
      : fontLanguage === "zh-hant" ||
          fontLanguage === "zh-tw" ||
          fontLanguage === "zh-hk" ||
          fontLanguage === "zh-mo"
        ? IS_VITE_DEV
          ? assetPath("/src/style-cjk-tc.css")
          : toAssetPath(`/client-cjk-tc.css?v=${CORE_VERSION}`)
        : null;
  const clientScriptPath = IS_VITE_DEV
    ? resolvedClientBundle === "full"
      ? assetPath("/src/client-auth.ts")
      : assetPath("/src/client.ts")
    : resolvedClientBundle === "full"
      ? toAssetPath(`/client-auth.js?v=${CORE_VERSION}`)
      : toAssetPath(`/client.js?v=${CORE_VERSION}`);
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

  return (
    <html
      lang={resolvedLang}
      data-theme-mode={themeMode}
      data-site-path-prefix={sitePathPrefix}
      data-asset-base-path={assetBasePath}
    >
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
        {resolvedNoindex && <meta name="robots" content="noindex, nofollow" />}
        <link rel="icon" href={resolvedFaviconHref} sizes="16x16 32x32" />
        <link
          rel="apple-touch-icon"
          href={resolvedAppleTouchHref}
          sizes="180x180"
        />
        {IS_VITE_DEV && (
          <script type="module" src={assetPath("/@vite/client")} />
        )}
        <link
          rel="stylesheet"
          href={
            IS_VITE_DEV
              ? assetPath("/src/style.css")
              : toAssetPath(`/client.css?v=${CORE_VERSION}`)
          }
        />
        {cjkStylesheetPath && (
          <link rel="stylesheet" href={cjkStylesheetPath} />
        )}
        {themeStyle && (
          <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        )}
        {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
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
      </body>
    </html>
  );
};
