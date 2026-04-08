/**
 * Web App Manifest Route
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { toPublicPath } from "../../lib/url.js";
import { getThemeBrowserColors, resolveBuiltinTheme } from "../../lib/theme.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const manifestRoutes = new Hono<Env>();

manifestRoutes.get("/manifest.webmanifest", (c) => {
  const { appConfig } = c.var;
  const { sitePathPrefix } = appConfig;

  const activeTheme = resolveBuiltinTheme(appConfig.themeId);
  const themeColors = getThemeBrowserColors(activeTheme);
  const themeColor =
    appConfig.themeMode === "dark" ? themeColors.dark : themeColors.light;

  const faviconVersion = appConfig.faviconVersion;
  const versionSuffix = faviconVersion ? `?v=${faviconVersion}` : "";

  const startParam = c.req.query("start");
  const startPath = startParam && startParam.startsWith("/") ? startParam : "/";
  const nameParam = c.req.query("name");
  const manifestName = nameParam?.trim() || appConfig.siteName;

  const manifest: Record<string, unknown> = {
    name: manifestName,
    short_name: manifestName.slice(0, 12),
    start_url: toPublicPath(startPath, sitePathPrefix),
    scope: toPublicPath("/", sitePathPrefix),
    display: "standalone",
    theme_color: themeColor,
    background_color: themeColor,
    icons: [
      {
        src: toPublicPath(
          `/apple-touch-icon.png${versionSuffix}`,
          sitePathPrefix,
        ),
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: toPublicPath(`/favicon.ico${versionSuffix}`, sitePathPrefix),
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
    ],
  };

  if (appConfig.siteDescriptionExplicit) {
    manifest.description = appConfig.siteDescription;
  }

  return c.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
