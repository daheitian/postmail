/**
 * Dashboard Settings Routes
 *
 * Sub-pages: General, Appearance, Account
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { sse, dsRedirect, dsToast } from "../../lib/sse.js";
import {
  getSiteLanguage,
  getSiteName,
  getHomeDefaultView,
  getConfigFallback,
} from "../../lib/config.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import { GeneralContent } from "../../ui/dash/settings/GeneralContent.js";
import { AppearanceContent } from "../../ui/dash/settings/AppearanceContent.js";
import { AccountContent } from "../../ui/dash/settings/AccountContent.js";

/** Escape HTML special characters for safe insertion into HTML strings */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsRoutes = new Hono<Env>();

// ===========================================================================
// General settings
// ===========================================================================

settingsRoutes.get("/", async (c) => {
  const { settings } = c.var.services;

  const dbSiteName = await settings.get("SITE_NAME");
  const dbSiteDescription = await settings.get("SITE_DESCRIPTION");
  const [siteLanguage, homeDefaultView] = await Promise.all([
    getSiteLanguage(c),
    getHomeDefaultView(c),
  ]);

  const siteNameFallback = getConfigFallback(c, "SITE_NAME");
  const siteDescriptionFallback = getConfigFallback(c, "SITE_DESCRIPTION");

  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={dbSiteName || siteNameFallback}
      currentPath="/dash/settings"
      toast={saved ? { message: "Settings saved successfully." } : undefined}
    >
      <GeneralContent
        siteName={dbSiteName || ""}
        siteDescription={dbSiteDescription || ""}
        siteLanguage={siteLanguage}
        homeDefaultView={homeDefaultView}
        siteNameFallback={siteNameFallback}
        siteDescriptionFallback={siteDescriptionFallback}
      />
    </DashLayout>,
  );
});

settingsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    siteName: string;
    siteDescription: string;
    siteLanguage: string;
    homeDefaultView: string;
  }>();

  const { settings } = c.var.services;

  const oldLanguage = (await settings.get("SITE_LANGUAGE")) ?? "en";

  if (body.siteName.trim()) {
    await settings.set("SITE_NAME", body.siteName.trim());
  } else {
    await settings.remove("SITE_NAME");
  }

  if (body.siteDescription.trim()) {
    await settings.set("SITE_DESCRIPTION", body.siteDescription.trim());
  } else {
    await settings.remove("SITE_DESCRIPTION");
  }

  await settings.set("SITE_LANGUAGE", body.siteLanguage);

  // Save homepage default view (only store if non-default)
  if (body.homeDefaultView === "featured") {
    await settings.set("HOME_DEFAULT_VIEW", body.homeDefaultView);
  } else {
    await settings.remove("HOME_DEFAULT_VIEW");
  }

  const languageChanged = oldLanguage !== body.siteLanguage;
  const displayName = body.siteName.trim() || getConfigFallback(c, "SITE_NAME");

  return sse(c, async (stream) => {
    if (languageChanged) {
      await stream.redirect("/dash/settings?saved");
    } else {
      const escaped = escapeHtml(displayName);
      await stream.patchElements(
        `<a id="site-name" href="/dash" class="font-semibold">${escaped}</a>`,
      );
      await stream.patchElements(`Settings - ${escaped}`, {
        mode: "inner",
        selector: "title",
      });
      await stream.toast("Settings saved successfully.");
    }
  });
});

// ===========================================================================
// Appearance
// ===========================================================================

settingsRoutes.get("/appearance", async (c) => {
  const { settings } = c.var.services;
  const siteName = await getSiteName(c);
  const currentThemeId = (await settings.get(SETTINGS_KEYS.THEME)) ?? "default";
  const customCSS = (await settings.get(SETTINGS_KEYS.CUSTOM_CSS)) ?? "";
  const themes = getAvailableThemes(c.var.config);
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={siteName}
      currentPath="/dash/settings"
      toast={saved ? { message: "Theme saved successfully." } : undefined}
    >
      <AppearanceContent
        themes={themes}
        currentThemeId={currentThemeId}
        customCSS={customCSS}
      />
    </DashLayout>,
  );
});

settingsRoutes.post("/appearance", async (c) => {
  const body = await c.req.json<{ theme: string }>();
  const { settings } = c.var.services;
  const themes = getAvailableThemes(c.var.config);

  const validTheme = themes.find((t) => t.id === body.theme);
  if (!validTheme) {
    return dsToast("Invalid theme selected.", "error");
  }

  if (validTheme.id === "default") {
    await settings.remove(SETTINGS_KEYS.THEME);
  } else {
    await settings.set(SETTINGS_KEYS.THEME, validTheme.id);
  }

  return dsRedirect("/dash/settings/appearance?saved");
});

settingsRoutes.post("/custom-css", async (c) => {
  const body = await c.req.json<{ customCSS: string }>();
  const { settings } = c.var.services;

  const css = body.customCSS?.trim() ?? "";

  if (css) {
    await settings.set(SETTINGS_KEYS.CUSTOM_CSS, css);
  } else {
    await settings.remove(SETTINGS_KEYS.CUSTOM_CSS);
  }

  return dsToast("Custom CSS saved successfully.");
});

// ===========================================================================
// Account
// ===========================================================================

settingsRoutes.get("/account", async (c) => {
  const siteName = await getSiteName(c);
  const session = await c.var.auth.api.getSession({
    headers: c.req.raw.headers,
  });
  const userName = session?.user?.name ?? "";
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={siteName}
      currentPath="/dash/settings"
      toast={saved ? { message: "Profile saved successfully." } : undefined}
    >
      <AccountContent userName={userName} />
    </DashLayout>,
  );
});

settingsRoutes.post("/account", async (c) => {
  const body = await c.req.json<{ userName: string }>();
  const name = body.userName?.trim();

  if (!name) {
    return dsToast("Name is required.", "error");
  }

  try {
    await c.var.auth.api.updateUser({
      body: { name },
      headers: c.req.raw.headers,
    });
  } catch {
    return dsToast("Failed to update profile.", "error");
  }

  return dsToast("Profile saved successfully.");
});

settingsRoutes.post("/password", async (c) => {
  const body = await c.req.json<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  if (body.newPassword !== body.confirmPassword) {
    return dsToast("Passwords do not match.", "error");
  }

  try {
    await c.var.auth.api.changePassword({
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: false,
      },
      headers: c.req.raw.headers,
    });
  } catch {
    return dsToast("Current password is incorrect.", "error");
  }

  return sse(c, async (stream) => {
    await stream.toast("Password changed successfully.");
    await stream.patchSignals({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  });
});
