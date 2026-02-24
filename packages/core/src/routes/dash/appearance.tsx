/**
 * Dashboard Appearance Routes
 *
 * Sub-pages: Navigation (default), Color Theme, Font Theme, Advanced (Custom CSS)
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { getI18n } from "../../i18n/index.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import { BUILTIN_FONT_THEMES } from "../../ui/font-themes.js";
import { ColorThemeContent } from "../../ui/dash/appearance/ColorThemeContent.js";
import { FontThemeContent } from "../../ui/dash/appearance/FontThemeContent.js";
import { NavigationContent } from "../../ui/dash/appearance/NavigationContent.js";
import { AdvancedContent } from "../../ui/dash/appearance/AdvancedContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const appearanceRoutes = new Hono<Env>();

// ===========================================================================
// Navigation (default tab)
// ===========================================================================

appearanceRoutes.get("/", async (c) => {
  const [navItems, availablePages] = await Promise.all([
    c.var.services.navItems.list(),
    c.var.services.pages.listNotInNav(),
  ]);
  const siteName = c.var.appConfig.siteName;
  const headerNavMaxVisible = c.var.appConfig.headerNavMaxVisible;

  return c.html(
    <DashLayout
      c={c}
      title="Appearance"
      siteName={siteName}
      currentPath="/dash/appearance"
    >
      <NavigationContent
        navItems={navItems}
        availablePages={availablePages}
        headerNavMaxVisible={headerNavMaxVisible}
        siteName={siteName}
      />
    </DashLayout>,
  );
});

// ===========================================================================
// Color Theme
// ===========================================================================

appearanceRoutes.get("/color", async (c) => {
  const siteName = c.var.appConfig.siteName;
  const defaultThemeId = c.var.appConfig.fallbacks.defaultTheme;
  const currentThemeId =
    c.var.allSettings[SETTINGS_KEYS.THEME] ?? defaultThemeId;
  const themes = getAvailableThemes();
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Appearance"
      siteName={siteName}
      currentPath="/dash/appearance"
      toast={saved ? { message: "Theme saved successfully." } : undefined}
    >
      <ColorThemeContent themes={themes} currentThemeId={currentThemeId} />
    </DashLayout>,
  );
});

appearanceRoutes.post("/color", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ theme: string }>();
  const { settings } = c.var.services;
  const themes = getAvailableThemes();

  const validTheme = themes.find((t) => t.id === body.theme);
  if (!validTheme) {
    return dsToast(
      i18n._(
        msg({
          message: "Invalid theme selected.",
          comment: "@context: Error toast when selected theme is not valid",
        }),
      ),
      "error",
    );
  }

  const defaultThemeId = c.var.appConfig.fallbacks.defaultTheme;
  if (validTheme.id === defaultThemeId) {
    await settings.remove(SETTINGS_KEYS.THEME);
  } else {
    await settings.set(SETTINGS_KEYS.THEME, validTheme.id);
  }

  return dsRedirect("/dash/appearance/color?saved");
});

// ===========================================================================
// Font Theme
// ===========================================================================

appearanceRoutes.get("/fonts", async (c) => {
  const siteName = c.var.appConfig.siteName;
  const currentFontThemeId = c.var.allSettings["FONT_THEME"] ?? "default";
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Appearance"
      siteName={siteName}
      currentPath="/dash/appearance"
      toast={saved ? { message: "Font theme saved successfully." } : undefined}
    >
      <FontThemeContent
        fontThemes={BUILTIN_FONT_THEMES}
        currentFontThemeId={currentFontThemeId}
      />
    </DashLayout>,
  );
});

appearanceRoutes.post("/font-theme", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ fontTheme: string }>();
  const { settings } = c.var.services;

  const validFont = BUILTIN_FONT_THEMES.find((f) => f.id === body.fontTheme);
  if (!validFont) {
    return dsToast(
      i18n._(
        msg({
          message: "Invalid font theme selected.",
          comment:
            "@context: Error toast when selected font theme is not valid",
        }),
      ),
      "error",
    );
  }

  if (validFont.id === "default") {
    await settings.remove("FONT_THEME");
  } else {
    await settings.set("FONT_THEME", validFont.id);
  }

  return dsRedirect("/dash/appearance/fonts?saved");
});

// ===========================================================================
// Advanced (Custom CSS)
// ===========================================================================

appearanceRoutes.get("/advanced", async (c) => {
  const siteName = c.var.appConfig.siteName;
  const customCSS = c.var.allSettings[SETTINGS_KEYS.CUSTOM_CSS] ?? "";

  return c.html(
    <DashLayout
      c={c}
      title="Appearance"
      siteName={siteName}
      currentPath="/dash/appearance"
    >
      <AdvancedContent customCSS={customCSS} />
    </DashLayout>,
  );
});

appearanceRoutes.post("/custom-css", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ customCSS: string }>();
  const { settings } = c.var.services;

  const css = body.customCSS?.trim() ?? "";

  if (css) {
    await settings.set(SETTINGS_KEYS.CUSTOM_CSS, css);
  } else {
    await settings.remove(SETTINGS_KEYS.CUSTOM_CSS);
  }

  return dsToast(
    i18n._(
      msg({
        message: "Custom CSS saved successfully.",
        comment: "@context: Toast after saving custom CSS",
      }),
    ),
  );
});
