/**
 * Config Middleware
 *
 * Loads settings from DB, resolves app config and theme.
 * Apply only to route groups that need config/theme data —
 * skip for /health, /media/*, /favicon.ico, /api/auth/*, etc.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { resolveConfig } from "../lib/resolve-config.js";
import {
  getConfiguredSingleSitePathPrefix,
  getConfiguredSingleSiteUrl,
  getSiteResolutionMode,
} from "../lib/env.js";
import { buildThemeStyle } from "../lib/theme.js";
import { BUILTIN_COLOR_THEMES } from "../ui/color-themes.js";
import {
  BUILTIN_FONT_THEMES,
  getCjkSerifCssVariables,
  getFontThemeCssVariables,
} from "../ui/font-themes.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Middleware that loads settings, resolves app config, and builds theme CSS.
 *
 * Sets `allSettings`, `appConfig`, and `themeStyle` on the Hono context.
 */
export function withConfig(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const allSettings = await c.var.services.settings.getAll();
    c.set("allSettings", allSettings);
    const publicRequestOrigin = new URL(c.var.publicRequestUrl).origin;
    const siteUrlOverride =
      getSiteResolutionMode(c.env) === "host-based"
        ? `${publicRequestOrigin}${c.var.currentSiteDomain?.pathPrefix ?? ""}`
        : getConfiguredSingleSiteUrl(c.env) ||
          `${publicRequestOrigin}${getConfiguredSingleSitePathPrefix(c.env)}`;
    const appConfig = resolveConfig(c.env, allSettings, {
      siteUrl: siteUrlOverride,
    });
    c.set("appConfig", appConfig);

    // Resolve active color theme
    const activeTheme = BUILTIN_COLOR_THEMES.find(
      (t) => t.id === (appConfig.themeId || appConfig.defaultThemeId),
    );

    // Build font theme CSS variables
    const fontTheme = appConfig.fontThemeId
      ? BUILTIN_FONT_THEMES.find((f) => f.id === appConfig.fontThemeId)
      : undefined;
    const fontOverrides = {
      ...getCjkSerifCssVariables(appConfig.siteLanguage),
      ...(fontTheme ? getFontThemeCssVariables(fontTheme) : {}),
    };

    const themeStyle = buildThemeStyle(
      activeTheme,
      appConfig.themeMode,
      fontOverrides,
    );
    c.set("themeStyle", themeStyle);

    await next();
  };
}
