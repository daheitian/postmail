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
import { buildThemeStyle } from "../lib/theme.js";
import {
  elapsedMs,
  logTiming,
  shouldLogRequestTiming,
} from "../lib/request-timing.js";
import { BUILTIN_COLOR_THEMES } from "../ui/color-themes.js";
import { BUILTIN_FONT_THEMES } from "../ui/font-themes.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

/**
 * Middleware that loads settings, resolves app config, and builds theme CSS.
 *
 * Sets `allSettings`, `appConfig`, and `themeStyle` on the Hono context.
 */
export function withConfig(): MiddlewareHandler<Env> {
  return async (c, next) => {
    const shouldLogTiming = shouldLogRequestTiming(c.var.requestTrace.path);
    const configStart = shouldLogTiming ? Date.now() : 0;
    const allSettings = await c.var.services.settings.getAll();
    c.set("allSettings", allSettings);
    const appConfig = resolveConfig(c.env, allSettings);
    c.set("appConfig", appConfig);

    // Resolve active color theme
    const activeTheme = BUILTIN_COLOR_THEMES.find(
      (t) => t.id === (appConfig.themeId || appConfig.defaultThemeId),
    );

    // Build font override CSS variables
    const fontTheme = appConfig.fontThemeId
      ? BUILTIN_FONT_THEMES.find((f) => f.id === appConfig.fontThemeId)
      : undefined;
    const fontOverrides: Record<string, string> = {};
    if (fontTheme) {
      fontOverrides["--font-body"] = fontTheme.bodyFontFamily;
      fontOverrides["--font-heading"] = fontTheme.headingFontFamily;
    }

    const themeStyle = buildThemeStyle(activeTheme, fontOverrides);
    c.set("themeStyle", themeStyle);

    if (shouldLogTiming) {
      logTiming(c.var.requestTrace, "config.loaded", {
        durationMs: elapsedMs(configStart),
        settingsCount: Object.keys(allSettings).length,
      });
    }

    await next();
  };
}
