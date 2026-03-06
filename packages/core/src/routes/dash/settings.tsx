/**
 * Settings Routes
 *
 * Unified settings hub — root page with iOS-style grouped list,
 * plus sub-pages for General, Avatar, Navigation, Color Theme,
 * Font Theme, Custom CSS, and Password.
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { sse, dsRedirect, dsToast } from "../../lib/sse.js";
import { getI18n } from "../../i18n/index.js";
import { renderPublicPage } from "../../lib/render.js";
import { getNavigationData } from "../../lib/navigation.js";
import { AdminBreadcrumb } from "../../ui/shared/AdminBreadcrumb.js";
import { TIMEZONES } from "../../lib/timezones.js";
import { escapeHtml } from "../../lib/html.js";
import { ValidationError } from "../../lib/errors.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import { BUILTIN_FONT_THEMES } from "../../ui/font-themes.js";
import { SettingsRootContent } from "../../ui/dash/settings/SettingsRootContent.js";
import { GeneralContent } from "../../ui/dash/settings/GeneralContent.js";
import { AvatarContent } from "../../ui/dash/settings/AvatarContent.js";
import { AccountContent } from "../../ui/dash/settings/AccountContent.js";
import { NavigationContent } from "../../ui/dash/appearance/NavigationContent.js";
import { ColorThemeContent } from "../../ui/dash/appearance/ColorThemeContent.js";
import { FontThemeContent } from "../../ui/dash/appearance/FontThemeContent.js";
import { AdvancedContent } from "../../ui/dash/appearance/AdvancedContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsRoutes = new Hono<Env>();

// ===========================================================================
// Settings root — iOS-style grouped list
// ===========================================================================

settingsRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Settings - ${navData.siteName}`,
    navData,
    content: <SettingsRootContent />,
  });
});

// ===========================================================================
// General settings
// ===========================================================================

settingsRoutes.get("/general", async (c) => {
  const { allSettings, appConfig } = c.var;

  const dbSiteName = allSettings["SITE_NAME"] ?? "";
  const dbSiteDescription = allSettings["SITE_DESCRIPTION"] ?? "";

  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `General - ${navData.siteName}`,
    navData,
    toast: saved ? { message: "Settings updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="General"
        />
        <GeneralContent
          siteName={dbSiteName || ""}
          siteDescription={dbSiteDescription || ""}
          siteLanguage={appConfig.siteLanguage}
          siteNameFallback={appConfig.fallbacks.siteName}
          siteDescriptionFallback={appConfig.fallbacks.siteDescription}
          timeZone={appConfig.timeZone}
          siteFooter={appConfig.siteFooter}
          noindex={appConfig.noindex}
          timezones={TIMEZONES}
        />
      </>
    ),
  });
});

settingsRoutes.post("/general", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{
    siteName: string;
    siteDescription: string;
    siteFooter: string;
    siteLanguage: string;
    homeDefaultView?: string;
    headerNavMaxVisible?: string;
    timeZone: string;
  }>();

  const { languageChanged, displayName } =
    await c.var.services.settings.updateGeneral(body, {
      oldLanguage: c.var.allSettings["SITE_LANGUAGE"] ?? "en",
      fallbackSiteName: c.var.appConfig.fallbacks.siteName,
    });

  // Sync user.name with site name (better-auth requires this field)
  await c.var.auth.api.updateUser({
    body: { name: displayName },
    headers: c.req.raw.headers,
  });

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    if (languageChanged) {
      return c.json({
        status: "redirect" as const,
        url: "/settings/general?saved",
      });
    }
    return c.json({
      status: "ok" as const,
      toast: i18n._(
        msg({
          message: "Settings updated.",
          comment: "@context: Toast after saving general settings",
        }),
      ),
      siteName: displayName,
    });
  }

  return sse(c, async (stream) => {
    if (languageChanged) {
      await stream.redirect("/settings/general?saved");
    } else {
      const escaped = escapeHtml(displayName);
      await stream.patchElements(`General - ${escaped}`, {
        mode: "inner",
        selector: "title",
      });
      await stream.toast(
        i18n._(
          msg({
            message: "Settings updated.",
            comment: "@context: Toast after saving general settings",
          }),
        ),
      );
      await stream.patchSignals({
        _orig_siteName: body.siteName,
        _orig_siteDescription: body.siteDescription,
        _orig_siteFooter: body.siteFooter,
        _orig_siteLanguage: body.siteLanguage,
        _orig_timeZone: body.timeZone,
        _generalDirty: false,
      });
    }
  });
});

settingsRoutes.post("/general/seo", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ noindex: string }>();
  const { settings } = c.var.services;

  // Checkbox "noindex" is the allow-indexing signal:
  // checked (value "true") = indexing allowed -> remove NOINDEX
  // unchecked (value "") = indexing blocked -> set NOINDEX=true
  if (body.noindex === "true") {
    await settings.remove("NOINDEX");
  } else {
    await settings.set("NOINDEX", "true");
  }

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({
      status: "ok" as const,
      toast: i18n._(
        msg({
          message: "SEO settings updated.",
          comment: "@context: Toast after saving SEO settings",
        }),
      ),
    });
  }

  return sse(c, async (stream) => {
    await stream.toast(
      i18n._(
        msg({
          message: "SEO settings updated.",
          comment: "@context: Toast after saving SEO settings",
        }),
      ),
    );
    await stream.patchSignals({
      _orig_noindex: body.noindex,
      _seoDirty: false,
    });
  });
});

// ===========================================================================
// Avatar
// ===========================================================================

settingsRoutes.get("/avatar", async (c) => {
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Avatar - ${navData.siteName}`,
    navData,
    toast: saved ? { message: "Avatar updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Avatar"
        />
        <AvatarContent
          siteAvatarUrl={c.var.appConfig.siteAvatarUrl}
          showHeaderAvatar={c.var.appConfig.showHeaderAvatar}
        />
      </>
    ),
  });
});

settingsRoutes.post("/avatar", async (c) => {
  const i18n = getI18n(c);
  const storage = c.var.storage;
  if (!storage) {
    return dsToast(
      i18n._(
        msg({
          message: "File storage isn't set up. Check your server config.",
          comment: "@context: Error toast when file storage is not set up",
        }),
      ),
      "error",
    );
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return dsToast(
      i18n._(
        msg({
          message: "No file selected. Choose a file to upload.",
          comment: "@context: Error toast when no file was selected for upload",
        }),
      ),
      "error",
    );
  }

  const faviconFile = formData.get("favicon") as File | null;
  const appleTouchFile = formData.get("appleTouch") as File | null;

  try {
    await c.var.services.settings.uploadAvatar(
      {
        file,
        faviconIco: faviconFile ? await faviconFile.arrayBuffer() : undefined,
        appleTouchIcon: appleTouchFile
          ? await appleTouchFile.arrayBuffer()
          : undefined,
      },
      {
        media: c.var.services.media,
        storage,
        storageProvider: c.var.appConfig.storageDriver,
        maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
      },
    );

    return dsRedirect("/settings/avatar?saved");
  } catch (e) {
    if (e instanceof ValidationError) {
      return dsToast(e.message, "error");
    }
    return dsToast(
      i18n._(
        msg({
          message: "Upload didn't go through. Try again in a moment.",
          comment: "@context: Error toast when avatar upload fails",
        }),
      ),
      "error",
    );
  }
});

settingsRoutes.post("/avatar/remove", async (c) => {
  await c.var.services.settings.removeAvatar(c.var.storage);

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({
      status: "redirect" as const,
      url: "/settings/avatar?saved",
    });
  }

  return dsRedirect("/settings/avatar?saved");
});

settingsRoutes.post("/avatar/display", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ showHeaderAvatar: string }>();
  const { settings } = c.var.services;

  if (body.showHeaderAvatar === "true") {
    await settings.set("SHOW_HEADER_AVATAR", "true");
  } else {
    await settings.remove("SHOW_HEADER_AVATAR");
  }

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({
      status: "ok" as const,
      toast: i18n._(
        msg({
          message: "Avatar display updated.",
          comment: "@context: Toast after saving avatar display preference",
        }),
      ),
    });
  }

  return sse(c, async (stream) => {
    await stream.toast(
      i18n._(
        msg({
          message: "Avatar display updated.",
          comment: "@context: Toast after saving avatar display preference",
        }),
      ),
    );
    await stream.patchSignals({
      _orig_showHeaderAvatar: body.showHeaderAvatar,
      _avatarDisplayDirty: false,
    });
  });
});

// ===========================================================================
// Navigation (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/navigation", async (c) => {
  const navItems = await c.var.services.navItems.list();
  const headerNavMaxVisible = c.var.appConfig.headerNavMaxVisible;
  const homeDefaultView = c.var.appConfig.homeDefaultView;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Navigation - ${navData.siteName}`,
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Navigation"
        />
        <NavigationContent
          navItems={navItems}
          headerNavMaxVisible={headerNavMaxVisible}
          homeDefaultView={homeDefaultView}
          siteName={navData.siteName}
        />
      </>
    ),
  });
});

settingsRoutes.post("/navigation/nav-max-visible", async (c) => {
  const body = await c.req.json<{ value: number }>();
  const { settings } = c.var.services;

  const navMax = Math.max(0, Math.min(5, body.value ?? 3));
  if (navMax !== 3) {
    await settings.set("HEADER_NAV_MAX_VISIBLE", String(navMax));
  } else {
    await settings.remove("HEADER_NAV_MAX_VISIBLE");
  }

  return c.json({ ok: true });
});

settingsRoutes.post("/navigation/home-default-view", async (c) => {
  const body = await c.req.json<{ value: string }>();
  const { settings } = c.var.services;

  if (body.value === "featured") {
    await settings.set("HOME_DEFAULT_VIEW", "featured");
  } else {
    await settings.remove("HOME_DEFAULT_VIEW");
  }

  return c.json({ ok: true });
});

// ===========================================================================
// Color Theme (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/color-theme", async (c) => {
  const defaultThemeId = c.var.appConfig.fallbacks.defaultTheme;
  const currentThemeId =
    c.var.allSettings[SETTINGS_KEYS.THEME] ?? defaultThemeId;
  const themes = getAvailableThemes();
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Color Theme - ${navData.siteName}`,
    navData,
    toast: saved ? { message: "Theme updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Color Theme"
        />
        <ColorThemeContent themes={themes} currentThemeId={currentThemeId} />
      </>
    ),
  });
});

settingsRoutes.post("/color-theme", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ theme: string }>();
  const { settings } = c.var.services;
  const themes = getAvailableThemes();

  const validTheme = themes.find((t) => t.id === body.theme);
  if (!validTheme) {
    return dsToast(
      i18n._(
        msg({
          message: "That theme isn't available. Pick another one.",
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

  return dsRedirect("/settings/color-theme?saved");
});

// ===========================================================================
// Font Theme (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/font-theme", async (c) => {
  const currentFontThemeId = c.var.allSettings["FONT_THEME"] ?? "default";
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Font Theme - ${navData.siteName}`,
    navData,
    toast: saved ? { message: "Font theme updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Font Theme"
        />
        <FontThemeContent
          fontThemes={BUILTIN_FONT_THEMES}
          currentFontThemeId={currentFontThemeId}
        />
      </>
    ),
  });
});

settingsRoutes.post("/font-theme", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ fontTheme: string }>();
  const { settings } = c.var.services;

  const validFont = BUILTIN_FONT_THEMES.find((f) => f.id === body.fontTheme);
  if (!validFont) {
    return dsToast(
      i18n._(
        msg({
          message: "That font theme isn't available. Pick another one.",
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

  return dsRedirect("/settings/font-theme?saved");
});

// ===========================================================================
// Custom CSS (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/custom-css", async (c) => {
  const customCSS = c.var.allSettings[SETTINGS_KEYS.CUSTOM_CSS] ?? "";
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Custom CSS - ${navData.siteName}`,
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Custom CSS"
        />
        <AdvancedContent customCSS={customCSS} />
      </>
    ),
  });
});

settingsRoutes.post("/custom-css", async (c) => {
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
        message: "Custom CSS updated.",
        comment: "@context: Toast after saving custom CSS",
      }),
    ),
  );
});

// ===========================================================================
// Password
// ===========================================================================

settingsRoutes.get("/account", async (c) => {
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: `Password - ${navData.siteName}`,
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref="/settings"
          current="Password"
        />
        <AccountContent />
      </>
    ),
  });
});

settingsRoutes.post("/password", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  if (body.newPassword !== body.confirmPassword) {
    return dsToast(
      i18n._(
        msg({
          message:
            "Passwords don't match. Make sure both fields are identical.",
          comment:
            "@context: Error toast when new password and confirmation differ",
        }),
      ),
      "error",
    );
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
    return dsToast(
      i18n._(
        msg({
          message: "Current password doesn't match. Try again.",
          comment:
            "@context: Error toast when current password verification fails",
        }),
      ),
      "error",
    );
  }

  return sse(c, async (stream) => {
    await stream.toast(
      i18n._(
        msg({
          message: "Password changed.",
          comment: "@context: Toast after changing account password",
        }),
      ),
    );
    await stream.patchSignals({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  });
});
