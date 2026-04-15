/**
 * Settings Routes
 *
 * Unified settings hub — root page with iOS-style grouped list,
 * plus sub-pages for General, Avatar, Navigation, Color Theme,
 * Font Theme, Custom CSS, Account (Sessions + Password), and API Tokens.
 */

import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { msg } from "@lingui/core/macro";
import { z } from "zod";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { sse, dsRedirect, dsToast } from "../../lib/sse.js";
import { getI18n } from "../../i18n/index.js";
import { renderPublicPage } from "../../lib/render.js";
import { getNavigationData } from "../../lib/navigation.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { AdminBreadcrumb } from "../../ui/shared/AdminBreadcrumb.js";
import { TIMEZONES } from "../../lib/timezones.js";
import { ValidationError } from "../../lib/errors.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import { THEME_MODES, type ThemeMode } from "../../types/config.js";
import { BUILTIN_FONT_THEMES } from "../../ui/font-themes.js";
import { SettingsRootContent } from "../../ui/dash/settings/SettingsRootContent.js";
import { GeneralContent } from "../../ui/dash/settings/GeneralContent.js";
import { AvatarContent } from "../../ui/dash/settings/AvatarContent.js";
import { AccountMenuContent } from "../../ui/dash/settings/AccountMenuContent.js";
import { AccountContent } from "../../ui/dash/settings/AccountContent.js";
import {
  SessionsContent,
  type SessionInfo,
} from "../../ui/dash/settings/SessionsContent.js";
import { NavigationContent } from "../../ui/dash/appearance/NavigationContent.js";
import { ColorThemeContent } from "../../ui/dash/appearance/ColorThemeContent.js";
import { FontThemeContent } from "../../ui/dash/appearance/FontThemeContent.js";
import { AdvancedContent } from "../../ui/dash/appearance/AdvancedContent.js";
import { ApiTokensContent } from "../../ui/dash/settings/ApiTokensContent.js";
import { DeleteAccountContent } from "../../ui/dash/settings/DeleteAccountContent.js";
import {
  GitHubSyncContent,
  type GitHubSyncStatus,
} from "../../ui/dash/settings/GitHubSyncContent.js";
import { toAbsoluteSiteUrl, toPublicPath } from "../../lib/url.js";
import { parseValidated, UpdateSiteSettingsSchema } from "../../lib/schemas.js";
import {
  getHostedControlPlaneAccountPasswordUrl,
  getHostedControlPlaneAccountUrl,
  getHostedControlPlaneProviderLabel,
  getHostedControlPlaneSiteDeleteUrl,
} from "../../lib/hosted-signin.js";
import { syncHostedControlPlaneSiteAvatar } from "../../lib/hosted-control-plane-sync.js";
import {
  getGitHubAppConfig,
  getHostedControlPlaneSsoSecret,
} from "../../lib/env.js";
import {
  buildInstallUrl,
  listInstallationRepos,
} from "../../lib/github-app.js";
import {
  generateInstallNonce,
  signInstallState,
  verifyInstallState,
} from "../../lib/github-app-state.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsRoutes = new Hono<Env>();

const UpdateLocaleSettingsSchema = z.object({
  siteLanguage: z.string(),
  cjkSerifFont: z.string(),
  timeZone: z.string(),
});

const UpdateFeedSettingsSchema = z.object({
  mainRssFeed: z.enum(["featured", "latest"]),
});

const UpdateHomeSettingsSchema = z.object({
  showJantBrandingOnHome: z.boolean(),
});

const UpdateSearchSettingsSchema = z.object({
  allowIndexing: z.boolean(),
});

function publicPath(c: Context<Env>, path: string): string {
  return toPublicPath(path, c.var.appConfig.sitePathPrefix);
}

type DemoRestriction = "sessions" | "password" | "accountDeletion";

function getDemoRestrictionMessage(
  c: Context<Env>,
  restriction: DemoRestriction,
): string {
  const i18n = getI18n(c);

  switch (restriction) {
    case "sessions":
      return i18n._(
        msg({
          message:
            "Session management is off in demo mode. Use the shared demo session instead.",
          comment:
            "@context: Error shown when session management is blocked in demo mode",
        }),
      );
    case "password":
      return i18n._(
        msg({
          message:
            "Password changes are off in demo mode. Sign in with the shared demo credentials.",
          comment:
            "@context: Error shown when password changes are blocked in demo mode",
        }),
      );
    case "accountDeletion":
      return i18n._(
        msg({
          message:
            "Account deletion is off in demo mode. The shared demo resets separately.",
          comment:
            "@context: Error shown when account deletion is blocked in demo mode",
        }),
      );
  }
}

function demoRestrictionResponse(c: Context<Env>, message: string): Response {
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({ error: message, code: "FORBIDDEN" }, 403);
  }
  return dsToast(message, "error");
}

// ===========================================================================
// Settings root — iOS-style grouped list
// ===========================================================================

settingsRoutes.get("/", async (c) => {
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Settings", navData.siteName),
    navData,
    content: (
      <div class="py-6">
        <SettingsRootContent
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
          demoMode={c.var.appConfig.demoMode}
        />
      </div>
    ),
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
  const siteUrlForDisplay =
    appConfig.siteUrl || new URL(publicPath(c, "/"), c.req.url).toString();

  return renderPublicPage(c, {
    title: buildPageTitle("General", navData.siteName),
    navData,
    toast: saved ? { message: "Settings updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="General"
        />
        <GeneralContent
          siteName={dbSiteName || ""}
          siteDescription={dbSiteDescription || ""}
          siteLanguage={appConfig.siteLanguage}
          cjkSerifFont={appConfig.cjkSerifFont}
          siteNameFallback={appConfig.fallbacks.siteName}
          siteDescriptionFallback={appConfig.fallbacks.siteDescription}
          mainRssFeed={appConfig.mainRssFeed}
          mainFeedUrl={toAbsoluteSiteUrl(
            "/feed",
            siteUrlForDisplay,
            appConfig.sitePathPrefix,
          )}
          latestFeedUrl={toAbsoluteSiteUrl(
            "/feed/latest",
            siteUrlForDisplay,
            appConfig.sitePathPrefix,
          )}
          featuredFeedUrl={toAbsoluteSiteUrl(
            "/feed/featured",
            siteUrlForDisplay,
            appConfig.sitePathPrefix,
          )}
          timeZone={appConfig.timeZone}
          siteFooter={appConfig.siteFooter}
          showJantBrandingOnHome={appConfig.showJantBrandingOnHome}
          noindex={appConfig.noindex}
          demoMode={appConfig.demoMode}
          timezones={TIMEZONES}
        />
      </>
    ),
  });
});

settingsRoutes.post("/general", async (c) => {
  const i18n = getI18n(c);
  const body = parseValidated(UpdateSiteSettingsSchema, await c.req.json());
  const toast = i18n._(
    msg({
      message: "Site settings updated.",
      comment: "@context: Toast after saving site settings",
    }),
  );

  try {
    const { siteNameChanged } =
      await c.var.services.siteProfile.updateSiteSettings(
        body,
        {
          oldSiteName: c.var.allSettings["SITE_NAME"] ?? "",
          fallbackSiteName: c.var.appConfig.fallbacks.siteName,
        },
        {
          // better-auth requires user.name to stay aligned with the active
          // site display name for the current operator.
          updateCurrentUserName: async (nextDisplayName) => {
            await c.var.auth.api.updateUser({
              body: { name: nextDisplayName },
              headers: c.req.raw.headers,
            });
          },
        },
      );

    // ── JSON response mode (used by Lit settings bridge) ──────────────
    const wantsJson = c.req.header("accept")?.includes("application/json");
    if (wantsJson) {
      if (siteNameChanged) {
        return c.json({
          status: "redirect" as const,
          url: publicPath(c, "/settings/general?saved"),
        });
      }

      return c.json({
        status: "ok" as const,
        toast,
      });
    }

    if (siteNameChanged) {
      return dsRedirect(publicPath(c, "/settings/general?saved"));
    }

    return dsToast(toast);
  } catch (error) {
    if (error instanceof ValidationError) {
      const wantsJson = c.req.header("accept")?.includes("application/json");
      if (wantsJson) {
        return c.json({ error: error.message, code: error.code }, 400);
      }

      return dsToast(error.message, "error");
    }

    throw error;
  }
});

settingsRoutes.post("/general/language-time", async (c) => {
  const i18n = getI18n(c);
  const body = parseValidated(UpdateLocaleSettingsSchema, await c.req.json());
  const toast = i18n._(
    msg({
      message: "Language and time updated.",
      comment: "@context: Toast after saving language and time settings",
    }),
  );
  const { languageChanged } =
    await c.var.services.settings.updateLocaleSettings(body, {
      oldLanguage: c.var.appConfig.siteLanguage,
      oldCjkSerifFont: c.var.appConfig.cjkSerifFont,
    });

  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    if (languageChanged) {
      return c.json({
        status: "redirect" as const,
        url: publicPath(c, "/settings/general?saved"),
      });
    }

    return c.json({
      status: "ok" as const,
      toast,
    });
  }

  if (languageChanged) {
    return dsRedirect(publicPath(c, "/settings/general?saved"));
  }

  return dsToast(toast);
});

settingsRoutes.post("/general/feeds", async (c) => {
  const i18n = getI18n(c);
  const body = parseValidated(UpdateFeedSettingsSchema, await c.req.json());
  await c.var.services.settings.updateFeedSettings(body);

  const toast = i18n._(
    msg({
      message: "Feed settings updated.",
      comment: "@context: Toast after saving feed settings",
    }),
  );
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({ status: "ok" as const, toast });
  }

  return dsToast(toast);
});

settingsRoutes.post("/general/home", async (c) => {
  const i18n = getI18n(c);
  const body = parseValidated(UpdateHomeSettingsSchema, await c.req.json());
  await c.var.services.settings.updateHomeBranding(body.showJantBrandingOnHome);

  const toast = i18n._(
    msg({
      message: "Home settings updated.",
      comment: "@context: Toast after auto-saving home settings",
    }),
  );
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({ status: "ok" as const, toast });
  }

  return dsToast(toast);
});

settingsRoutes.post("/general/search", async (c) => {
  const i18n = getI18n(c);
  const body = parseValidated(UpdateSearchSettingsSchema, await c.req.json());
  await c.var.services.settings.updateSearchSettings(body.allowIndexing, {
    demoMode: c.var.appConfig.demoMode,
  });

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({
      status: "ok" as const,
      toast: i18n._(
        msg({
          message: "Search settings updated.",
          comment: "@context: Toast after saving search settings",
        }),
      ),
    });
  }

  return dsToast(
    i18n._(
      msg({
        message: "Search settings updated.",
        comment: "@context: Toast after saving search settings",
      }),
    ),
  );
});

// ===========================================================================
// Avatar
// ===========================================================================

settingsRoutes.get("/avatar", async (c) => {
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Avatar", navData.siteName),
    navData,
    toast: saved ? { message: "Avatar updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
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
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (!storage) {
    const message = i18n._(
      msg({
        message: "File storage isn't set up. Check your server config.",
        comment: "@context: Error toast when file storage is not set up",
      }),
    );

    if (wantsJson) {
      return c.json({ error: message }, 500);
    }

    return dsToast(message, "error");
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    const message = i18n._(
      msg({
        message: "No file selected. Choose a file to upload.",
        comment: "@context: Error toast when no file was selected for upload",
      }),
    );

    if (wantsJson) {
      return c.json({ error: message }, 400);
    }

    return dsToast(message, "error");
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
    try {
      await syncHostedControlPlaneSiteAvatar({
        appConfig: c.var.appConfig,
        env: c.env,
        settings: c.var.services.settings,
        siteId: c.var.currentSite.id,
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error(
        "[Jant] Failed to sync hosted control plane avatar metadata:",
        error,
      );
    }

    if (wantsJson) {
      return c.json({
        status: "redirect" as const,
        url: publicPath(c, "/settings/avatar?saved"),
      });
    }

    return dsRedirect(publicPath(c, "/settings/avatar?saved"));
  } catch (e) {
    if (e instanceof ValidationError) {
      if (wantsJson) {
        return c.json({ error: e.message, code: e.code }, 400);
      }

      return dsToast(e.message, "error");
    }

    const message = i18n._(
      msg({
        message: "Upload didn't go through. Try again in a moment.",
        comment: "@context: Error toast when avatar upload fails",
      }),
    );

    if (wantsJson) {
      return c.json({ error: message }, 500);
    }

    return dsToast(message, "error");
  }
});

settingsRoutes.post("/avatar/remove", async (c) => {
  await c.var.services.settings.removeAvatar(c.var.storage);
  try {
    await syncHostedControlPlaneSiteAvatar({
      appConfig: c.var.appConfig,
      env: c.env,
      settings: c.var.services.settings,
      siteId: c.var.currentSite.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error(
      "[Jant] Failed to sync hosted control plane avatar metadata:",
      error,
    );
  }

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    return c.json({
      status: "redirect" as const,
      url: publicPath(c, "/settings/avatar?saved"),
    });
  }

  return dsRedirect(publicPath(c, "/settings/avatar?saved"));
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
  const [navItems, directoryData] = await Promise.all([
    c.var.services.navItems.list(),
    c.var.services.collections.listDirectoryData(),
  ]);
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Navigation", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="Navigation"
        />
        <NavigationContent
          navItems={navItems}
          directoryData={directoryData}
          mainRssFeed={c.var.appConfig.mainRssFeed}
          siteName={navData.siteName}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

// ===========================================================================
// Color Theme (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/color-theme", async (c) => {
  const currentThemeId = c.var.appConfig.themeId;
  const currentThemeMode = c.var.appConfig.themeMode;
  const themes = getAvailableThemes();
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Color Theme", navData.siteName),
    navData,
    toast: saved ? { message: "Theme updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="Color Theme"
        />
        <ColorThemeContent
          themes={themes}
          currentThemeId={currentThemeId}
          currentThemeMode={currentThemeMode}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

settingsRoutes.post("/color-theme", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json<{ theme: string; themeMode?: string }>();
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

  await settings.set(SETTINGS_KEYS.THEME, validTheme.id);

  const themeMode: ThemeMode = THEME_MODES.includes(body.themeMode as ThemeMode)
    ? (body.themeMode as ThemeMode)
    : "auto";

  if (themeMode === "auto") {
    await settings.remove(SETTINGS_KEYS.THEME_MODE);
  } else {
    await settings.set(SETTINGS_KEYS.THEME_MODE, themeMode);
  }

  return dsRedirect(publicPath(c, "/settings/color-theme?saved"));
});

// ===========================================================================
// Font Theme (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/font-theme", async (c) => {
  const currentFontThemeId = c.var.appConfig.fontThemeId;
  const saved = c.req.query("saved") !== undefined;
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Font Theme", navData.siteName),
    navData,
    toast: saved ? { message: "Font theme updated." } : undefined,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="Font Theme"
        />
        <FontThemeContent
          fontThemes={BUILTIN_FONT_THEMES}
          currentFontThemeId={currentFontThemeId}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
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

  await settings.set("FONT_THEME", validFont.id);

  return dsRedirect(publicPath(c, "/settings/font-theme?saved"));
});

// ===========================================================================
// Custom CSS (moved from appearance routes)
// ===========================================================================

settingsRoutes.get("/custom-css", async (c) => {
  const customCSS = c.var.allSettings[SETTINGS_KEYS.CUSTOM_CSS] ?? "";
  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Custom CSS", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="Custom CSS"
        />
        <AdvancedContent
          customCSS={customCSS}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
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
// Account sub-menu
// ===========================================================================

settingsRoutes.get("/account", async (c) => {
  const navData = await getNavigationData(c);
  const hostedControlPlaneAccountUrl = getHostedControlPlaneAccountUrl(c.env);
  const hostedControlPlaneProviderLabel = getHostedControlPlaneProviderLabel(
    c.env,
  );
  const hostedControlPlaneSiteDeleteUrl = getHostedControlPlaneSiteDeleteUrl(
    c.env,
    c.var.currentSite.id,
  );

  return renderPublicPage(c, {
    title: buildPageTitle("Account", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="Account"
        />
        <AccountMenuContent
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
          demoMode={c.var.appConfig.demoMode}
          hostedControlPlaneAccountUrl={hostedControlPlaneAccountUrl}
          hostedControlPlaneProviderLabel={hostedControlPlaneProviderLabel}
          hostedControlPlaneSiteDeleteUrl={hostedControlPlaneSiteDeleteUrl}
        />
      </>
    ),
  });
});

// ===========================================================================
// Sessions
// ===========================================================================

settingsRoutes.get("/account/sessions", async (c) => {
  if (c.var.appConfig.demoMode) {
    return c.redirect(publicPath(c, "/settings/account"));
  }

  const navData = await getNavigationData(c);

  // Get current session to mark it
  const currentSession = await c.var.auth.api.getSession({
    headers: c.req.raw.headers,
  });
  const currentToken = currentSession?.session?.token ?? "";

  // List all active sessions
  const rawSessions = await c.var.auth.api.listSessions({
    headers: c.req.raw.headers,
  });

  const sessions: SessionInfo[] = (rawSessions ?? []).map(
    (s: {
      token: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      createdAt: Date;
    }) => ({
      token: s.token,
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
      createdAt: Math.floor(new Date(s.createdAt).getTime() / 1000),
      isCurrent: s.token === currentToken,
    }),
  );

  // Sort: current session first, then by creation date descending
  sessions.sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    return b.createdAt - a.createdAt;
  });

  return renderPublicPage(c, {
    title: buildPageTitle("Sessions", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Account"
          parentHref={publicPath(c, "/settings/account")}
          current="Sessions"
        />
        <SessionsContent
          sessions={sessions}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

settingsRoutes.post("/account/sessions/:token/revoke", async (c) => {
  if (c.var.appConfig.demoMode) {
    return demoRestrictionResponse(c, getDemoRestrictionMessage(c, "sessions"));
  }

  const token = c.req.param("token");

  try {
    await c.var.auth.api.revokeSession({
      body: { token },
      headers: c.req.raw.headers,
    });
  } catch {
    // Session may already be expired/revoked — still redirect
  }

  return dsRedirect(publicPath(c, "/settings/account/sessions"));
});

// ===========================================================================
// Password
// ===========================================================================

settingsRoutes.get("/account/password", async (c) => {
  const hostedControlPlaneAccountPasswordUrl =
    getHostedControlPlaneAccountPasswordUrl(c.env);
  if (hostedControlPlaneAccountPasswordUrl) {
    return c.redirect(hostedControlPlaneAccountPasswordUrl);
  }

  if (c.var.appConfig.demoMode) {
    return c.redirect(publicPath(c, "/settings/account"));
  }

  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("Password", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Account"
          parentHref={publicPath(c, "/settings/account")}
          current="Password"
        />
        <AccountContent sitePathPrefix={c.var.appConfig.sitePathPrefix} />
      </>
    ),
  });
});

settingsRoutes.post("/account/password", async (c) => {
  const hostedControlPlaneAccountPasswordUrl =
    getHostedControlPlaneAccountPasswordUrl(c.env);
  if (hostedControlPlaneAccountPasswordUrl) {
    return dsRedirect(hostedControlPlaneAccountPasswordUrl);
  }

  if (c.var.appConfig.demoMode) {
    return demoRestrictionResponse(c, getDemoRestrictionMessage(c, "password"));
  }

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

// ===========================================================================
// Delete Account
// ===========================================================================

settingsRoutes.get("/account/delete-account", async (c) => {
  const hostedControlPlaneAccountUrl = getHostedControlPlaneAccountUrl(c.env);
  const hostedControlPlaneSiteDeleteUrl = getHostedControlPlaneSiteDeleteUrl(
    c.env,
    c.var.currentSite.id,
  );
  if (hostedControlPlaneSiteDeleteUrl) {
    return c.redirect(hostedControlPlaneSiteDeleteUrl);
  }
  if (hostedControlPlaneAccountUrl) {
    return c.redirect(hostedControlPlaneAccountUrl);
  }

  if (c.var.appConfig.demoMode) {
    return c.redirect(publicPath(c, "/settings/account"));
  }

  const navData = await getNavigationData(c);
  const csrfToken = await c.var.services.auth.generateDeleteCsrfToken();

  return renderPublicPage(c, {
    title: buildPageTitle("Delete Account", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Account"
          parentHref={publicPath(c, "/settings/account")}
          current="Delete Account"
        />
        <DeleteAccountContent
          siteName={navData.siteName}
          csrfToken={csrfToken}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

settingsRoutes.post("/account/delete-account", async (c) => {
  const hostedControlPlaneAccountUrl = getHostedControlPlaneAccountUrl(c.env);
  const hostedControlPlaneSiteDeleteUrl = getHostedControlPlaneSiteDeleteUrl(
    c.env,
    c.var.currentSite.id,
  );
  if (hostedControlPlaneSiteDeleteUrl) {
    return dsRedirect(hostedControlPlaneSiteDeleteUrl);
  }
  if (hostedControlPlaneAccountUrl) {
    return dsRedirect(hostedControlPlaneAccountUrl);
  }

  if (c.var.appConfig.demoMode) {
    return demoRestrictionResponse(
      c,
      getDemoRestrictionMessage(c, "accountDeletion"),
    );
  }

  const i18n = getI18n(c);
  const csrfToken = c.req.header("x-csrf-token");

  if (!csrfToken) {
    return dsToast(
      i18n._(
        msg({
          message: "Security token missing. Refresh the page and try again.",
          comment:
            "@context: Error toast when CSRF token is missing from delete request",
        }),
      ),
      "error",
    );
  }

  const isValid = await c.var.services.auth.validateDeleteCsrfToken(csrfToken);
  if (!isValid) {
    return dsToast(
      i18n._(
        msg({
          message: "Security token expired. Refresh the page and try again.",
          comment:
            "@context: Error toast when CSRF token is invalid or expired",
        }),
      ),
      "error",
    );
  }

  await c.var.services.auth.deleteAllData({
    storage: c.var.storage,
  });

  return dsRedirect(publicPath(c, "/setup"));
});

// ===========================================================================
// API Tokens
// ===========================================================================

settingsRoutes.get("/api-tokens", async (c) => {
  const tokens = await c.var.services.apiTokens.list();
  const navData = await getNavigationData(c);
  const siteUrl = c.var.appConfig.siteUrl;

  return renderPublicPage(c, {
    title: buildPageTitle("API Tokens", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="API Tokens"
        />
        <ApiTokensContent
          tokens={tokens}
          siteUrl={siteUrl}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

settingsRoutes.post("/api-tokens", async (c) => {
  const body = await c.req.json<{ tokenName: string }>();
  const name = body.tokenName?.trim();

  if (!name) {
    return dsToast("Token name is required.", "error");
  }

  const { plaintext } = await c.var.services.apiTokens.create(name);

  return sse(c, async (stream) => {
    await stream.patchSignals({
      _newPlaintext: plaintext,
      tokenName: "",
    });
  });
});

settingsRoutes.post("/api-tokens/:id/delete", async (c) => {
  const id = c.req.param("id");
  await c.var.services.apiTokens.delete(id);

  return dsRedirect(publicPath(c, "/settings/api-tokens"));
});

// ===========================================================================
// GitHub Sync
// ===========================================================================

settingsRoutes.post("/github-sync/connect", async (c) => {
  // When a GitHub App is configured on this deployment, PAT connect is
  // disabled — users must go through the App install flow so we don't end
  // up with a mix of auth modes per site (harder to audit, easier to leak
  // a long-lived token by accident). The UI hides the PAT form too.
  if (getGitHubAppConfig(c.env)) {
    return dsToast(
      "This deployment uses GitHub App authentication. Use Install GitHub App instead.",
      "error",
    );
  }

  const body = await c.req.json<{ token: string; repo: string }>();

  if (!body.token?.trim() || !body.repo?.trim()) {
    return dsToast("Token and repository are required.", "error");
  }

  const { parseRepoSlug, createGitHubClient } =
    await import("../../lib/github-api.js");
  const parsed = parseRepoSlug(body.repo);
  if (!parsed) {
    return dsToast("Invalid repository format. Use owner/repo.", "error");
  }

  // Validate token
  const client = createGitHubClient(body.token);
  try {
    await client.getRepo(parsed.owner, parsed.repo);
  } catch (err) {
    const detail = err instanceof Error ? err.message : JSON.stringify(err);
    process.stderr.write(
      `[Jant] GitHub Sync connect failed for ${body.repo}: ${detail}\n`,
    );
    return dsToast(`Could not access the repository: ${detail}`, "error");
  }

  // Check if this repo already has a Jant webhook
  try {
    const hooks = await client.listWebhooks(parsed.owner, parsed.repo);
    const existingJantHook = hooks.find((h) =>
      h.config.url?.includes("/api/github-sync/webhook"),
    );
    if (existingJantHook) {
      return dsToast(
        "This repository is already connected to a Jant site. Disconnect it first before connecting to a new site.",
        "error",
      );
    }
  } catch {
    // If listing webhooks fails (permissions), skip the check and continue
  }

  // Save config
  await c.var.services.settings.set("GITHUB_SYNC_TOKEN", body.token);
  await c.var.services.settings.set("GITHUB_SYNC_REPO", body.repo);
  await c.var.services.settings.set("GITHUB_SYNC_AUTH_MODE", "pat");
  await c.var.services.settings.set("GITHUB_SYNC_APP_INSTALLATION_ID", "");
  await c.var.services.settings.set("GITHUB_SYNC_ENABLED", "true");

  // Create webhook
  const { createGitHubSyncService } =
    await import("../../services/github-sync.js");
  const syncService = createGitHubSyncService(
    c.var.services,
    buildGitHubSyncSiteConfig(c),
    { githubApp: getGitHubAppConfig(c.env) },
  );
  const siteUrl = c.var.appConfig.siteUrl.replace(/\/+$/, "");
  try {
    await syncService.setupWebhook(`${siteUrl}/api/github-sync/webhook`);
  } catch {
    return dsToast(
      "Connected, but webhook creation failed. You may need to create it manually.",
      "error",
    );
  }

  return dsRedirect(publicPath(c, "/settings/github-sync"));
});

settingsRoutes.post("/github-sync/push", async (c) => {
  const { createGitHubSyncService } =
    await import("../../services/github-sync.js");
  const syncService = createGitHubSyncService(
    c.var.services,
    buildGitHubSyncSiteConfig(c),
    { storage: c.var.storage, githubApp: getGitHubAppConfig(c.env) },
  );

  const config = await syncService.getConfig();
  if (!config) {
    return dsToast("GitHub Sync is not configured.", "error");
  }

  try {
    const { commitSha } = await syncService.pushFullSync();
    return dsToast(`Pushed to GitHub. Commit: ${commitSha.slice(0, 7)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed.";
    return dsToast(message, "error");
  }
});

settingsRoutes.post("/github-sync/disconnect", async (c) => {
  const { createGitHubSyncService } =
    await import("../../services/github-sync.js");
  const syncService = createGitHubSyncService(
    c.var.services,
    buildGitHubSyncSiteConfig(c),
    { githubApp: getGitHubAppConfig(c.env) },
  );
  await syncService.teardownWebhook();

  return dsRedirect(publicPath(c, "/settings/github-sync"));
});

// ---------------------------------------------------------------------------
// GitHub App install flow
// ---------------------------------------------------------------------------

/**
 * Redirect the user to GitHub to install the App on their account/org.
 *
 * Only available when GitHub App env vars are configured. Uses a signed
 * state cookie for CSRF protection.
 */
settingsRoutes.get("/github-sync/app/install", async (c) => {
  const app = getGitHubAppConfig(c.env);
  if (!app) {
    return c.text("GitHub App is not configured on this deployment.", 404);
  }

  // Build the state token. When running behind a hosted control plane we
  // sign host+nonce with the shared SSO secret so the control plane can
  // verify and route the callback back to the correct site host. In
  // self-hosted single-site mode the secret is absent and a plain nonce
  // suffices (the App's Callback URL points directly at this site).
  const nonce = generateInstallNonce();
  const ssoSecret = getHostedControlPlaneSsoSecret(c.env);
  const host = new URL(c.var.appConfig.siteUrl).host;
  const state = ssoSecret
    ? await signInstallState(host, nonce, ssoSecret)
    : nonce;

  // Cookie is pinned to this host; compared byte-for-byte on the callback
  // to defeat CSRF regardless of whether the state is signed.
  setCookie(c, "jant_gh_app_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(buildInstallUrl(app.slug, state));
});

/**
 * Landing page after the user installs the GitHub App.
 *
 * GitHub redirects here with `installation_id`, `setup_action`, and the
 * `state` we sent. We verify the state, list the installation's repos, and
 * render a repo picker that POSTs back to `/github-sync/app/connect`.
 */
settingsRoutes.get("/github-sync/app/callback", async (c) => {
  const app = getGitHubAppConfig(c.env);
  if (!app) {
    return c.text("GitHub App is not configured on this deployment.", 404);
  }

  const installationId = c.req.query("installation_id");
  const state = c.req.query("state");
  if (!installationId) {
    return c.text("Missing installation_id.", 400);
  }

  const expected = getCookie(c, "jant_gh_app_state");
  if (!state || !expected || expected !== state) {
    return c.text("Invalid or expired state.", 400);
  }

  // Defense in depth: when an SSO secret is present the state should also
  // HMAC-verify and its embedded host must match the host serving this
  // request. This blocks a rogue control plane from redirecting a victim
  // to the wrong site with a replayed token.
  const ssoSecret = getHostedControlPlaneSsoSecret(c.env);
  if (ssoSecret) {
    const payload = await verifyInstallState(state, ssoSecret);
    const currentHost = new URL(c.var.appConfig.siteUrl).host;
    if (!payload || payload.host !== currentHost) {
      return c.text("State signature invalid for this host.", 400);
    }
  }

  // One-shot: clear the cookie so it can't be replayed.
  setCookie(c, "jant_gh_app_state", "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });

  let repos: Awaited<ReturnType<typeof listInstallationRepos>>;
  try {
    repos = await listInstallationRepos(app, installationId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return c.text(`Could not list installation repositories: ${detail}`, 500);
  }

  const navData = await getNavigationData(c);
  const base = publicPath(c, "/settings/github-sync");

  return renderPublicPage(c, {
    title: buildPageTitle("GitHub Sync — Pick Repository", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="GitHub Sync"
        />
        <div class="flex flex-col gap-6 max-w-form">
          <div>
            <h2 class="text-lg font-medium mb-1">Pick a repository</h2>
            <p class="text-sm text-muted-foreground">
              The GitHub App is installed. Choose which repository should back
              up this site.
            </p>
          </div>
          {repos.length === 0 ? (
            <p class="text-sm text-muted-foreground">
              No repositories are accessible to this installation. Grant the App
              access to a repository on GitHub, then reload this page.
            </p>
          ) : (
            <form
              class="flex flex-col gap-3"
              method="post"
              action={`${base}/app/connect`}
            >
              <input
                type="hidden"
                name="installationId"
                value={installationId}
              />
              <div class="field">
                <label class="label" for="app-repo">
                  Repository
                </label>
                <select id="app-repo" name="repo" class="input" required>
                  {repos.map((r) => (
                    <option value={r.fullName}>
                      {r.fullName}
                      {r.private ? " (private)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div class="flex mt-2">
                <button type="submit" class="btn">
                  Connect
                </button>
              </div>
            </form>
          )}
        </div>
      </>
    ),
  });
});

/**
 * Finalize the App connection: validate access, persist the installation id
 * and chosen repo, then register the webhook.
 */
settingsRoutes.post("/github-sync/app/connect", async (c) => {
  const app = getGitHubAppConfig(c.env);
  if (!app) {
    return c.text("GitHub App is not configured on this deployment.", 404);
  }

  const form = await c.req.parseBody();
  const installationId = String(form.installationId ?? "").trim();
  const repo = String(form.repo ?? "").trim();
  if (!installationId || !repo) {
    return c.text("Missing installationId or repo.", 400);
  }

  const { parseRepoSlug } = await import("../../lib/github-api.js");
  const parsed = parseRepoSlug(repo);
  if (!parsed) {
    return c.text("Invalid repository format.", 400);
  }

  // Persist config before creating webhook so the sync service can load it.
  await c.var.services.settings.set("GITHUB_SYNC_AUTH_MODE", "app");
  await c.var.services.settings.set(
    "GITHUB_SYNC_APP_INSTALLATION_ID",
    installationId,
  );
  await c.var.services.settings.set("GITHUB_SYNC_REPO", repo);
  await c.var.services.settings.set("GITHUB_SYNC_TOKEN", "");
  await c.var.services.settings.set("GITHUB_SYNC_ENABLED", "true");

  const { createGitHubSyncService } =
    await import("../../services/github-sync.js");
  const syncService = createGitHubSyncService(
    c.var.services,
    buildGitHubSyncSiteConfig(c),
    { githubApp: app },
  );
  const siteUrl = c.var.appConfig.siteUrl.replace(/\/+$/, "");
  try {
    await syncService.setupWebhook(`${siteUrl}/api/github-sync/webhook`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return c.text(
      `Connected, but webhook creation failed: ${detail}. You may need to create it manually.`,
      500,
    );
  }

  return c.redirect(publicPath(c, "/settings/github-sync"));
});

settingsRoutes.get("/github-sync", async (c) => {
  const [enabled, repo, lastPushSha, webhookId, lastPushAt, authMode] =
    await Promise.all([
      c.var.services.settings.get("GITHUB_SYNC_ENABLED"),
      c.var.services.settings.get("GITHUB_SYNC_REPO"),
      c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_SHA"),
      c.var.services.settings.get("GITHUB_SYNC_WEBHOOK_ID"),
      c.var.services.settings.get("GITHUB_SYNC_LAST_PUSH_AT"),
      c.var.services.settings.get("GITHUB_SYNC_AUTH_MODE"),
    ]);

  const status: GitHubSyncStatus = {
    enabled: enabled === "true",
    repo: repo ?? null,
    lastPushSha: lastPushSha ?? null,
    webhookId: webhookId ?? null,
    lastPushAt: lastPushAt ? Number(lastPushAt) : null,
    authMode: authMode === "app" ? "app" : "pat",
    appConfigured: getGitHubAppConfig(c.env) !== null,
  };

  const navData = await getNavigationData(c);

  return renderPublicPage(c, {
    title: buildPageTitle("GitHub Sync", navData.siteName),
    navData,
    content: (
      <>
        <AdminBreadcrumb
          parent="Settings"
          parentHref={publicPath(c, "/settings")}
          current="GitHub Sync"
        />
        <GitHubSyncContent
          status={status}
          sitePathPrefix={c.var.appConfig.sitePathPrefix}
        />
      </>
    ),
  });
});

function buildGitHubSyncSiteConfig(c: Context<Env>) {
  const cfg = c.var.appConfig;
  return {
    siteName: cfg.siteName,
    siteUrl: cfg.siteUrl,
    siteDescription: cfg.siteDescription,
    siteLanguage: cfg.siteLanguage,
    showJantBrandingOnHome: cfg.showJantBrandingOnHome,
    homeDefaultView: cfg.homeDefaultView,
    siteFooter: cfg.siteFooter,
    showHeaderAvatar: cfg.showHeaderAvatar,
    siteAvatarUrl: cfg.siteAvatarUrl,
    themeId: cfg.themeId,
    defaultThemeId: cfg.defaultThemeId,
    fontThemeId: cfg.fontThemeId,
    themeMode: cfg.themeMode,
    noindex: cfg.noindex,
    customCss: cfg.customCSS,
    r2PublicUrl: cfg.r2PublicUrl,
    s3PublicUrl: cfg.s3PublicUrl,
    localPublicUrl: cfg.localPublicUrl,
    imageTransformUrl: cfg.imageTransformUrl,
    sitePathPrefix: cfg.sitePathPrefix,
    navItems: [] as Pick<
      import("../../types.js").NavItem,
      "type" | "systemKey" | "label" | "url" | "position" | "placement"
    >[],
    pageSize: cfg.pageSize,
  };
}
