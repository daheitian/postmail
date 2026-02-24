/**
 * Dashboard Settings Routes
 *
 * Sub-pages: General, Account
 */

import { Hono } from "hono";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { sse, dsRedirect, dsToast } from "../../lib/sse.js";
import { getI18n } from "../../i18n/index.js";
import { TIMEZONES } from "../../lib/timezones.js";
import { escapeHtml } from "../../lib/html.js";
import { ValidationError } from "../../lib/errors.js";
import { GeneralContent } from "../../ui/dash/settings/GeneralContent.js";
import { AccountContent } from "../../ui/dash/settings/AccountContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsRoutes = new Hono<Env>();

// ===========================================================================
// General settings
// ===========================================================================

settingsRoutes.get("/", async (c) => {
  const { allSettings, appConfig } = c.var;

  const dbSiteName = allSettings["SITE_NAME"] ?? "";
  const dbSiteDescription = allSettings["SITE_DESCRIPTION"] ?? "";

  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={dbSiteName || appConfig.fallbacks.siteName}
      currentPath="/dash/settings"
      toast={saved ? { message: "Settings saved successfully." } : undefined}
    >
      <GeneralContent
        siteName={dbSiteName || ""}
        siteDescription={dbSiteDescription || ""}
        siteLanguage={appConfig.siteLanguage}
        siteNameFallback={appConfig.fallbacks.siteName}
        siteDescriptionFallback={appConfig.fallbacks.siteDescription}
        siteAvatarUrl={appConfig.siteAvatarUrl}
        showHeaderAvatar={appConfig.showHeaderAvatar}
        timeZone={appConfig.timeZone}
        siteFooter={appConfig.siteFooter}
        noindex={appConfig.noindex}
        timezones={TIMEZONES}
      />
    </DashLayout>,
  );
});

settingsRoutes.post("/", async (c) => {
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

  // ── JSON response mode (used by Lit settings bridge) ──────────────
  const wantsJson = c.req.header("accept")?.includes("application/json");
  if (wantsJson) {
    if (languageChanged) {
      return c.json({
        status: "redirect" as const,
        url: "/dash/settings?saved",
      });
    }
    return c.json({
      status: "ok" as const,
      toast: i18n._(
        msg({
          message: "Settings saved successfully.",
          comment: "@context: Toast after saving general settings",
        }),
      ),
      siteName: displayName,
    });
  }

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
      await stream.toast(
        i18n._(
          msg({
            message: "Settings saved successfully.",
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

settingsRoutes.post("/seo", async (c) => {
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
          message: "SEO settings saved successfully.",
          comment: "@context: Toast after saving SEO settings",
        }),
      ),
    });
  }

  return sse(c, async (stream) => {
    await stream.toast(
      i18n._(
        msg({
          message: "SEO settings saved successfully.",
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
// Avatar upload & removal
// ===========================================================================

settingsRoutes.post("/avatar", async (c) => {
  const i18n = getI18n(c);
  const storage = c.var.storage;
  if (!storage) {
    return dsToast(
      i18n._(
        msg({
          message: "Storage not configured.",
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
          message: "No file provided.",
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
      },
    );

    return dsRedirect("/dash/settings?saved");
  } catch (e) {
    if (e instanceof ValidationError) {
      return dsToast(e.message, "error");
    }
    return dsToast(
      i18n._(
        msg({
          message: "Upload failed. Please try again.",
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
    return c.json({ status: "redirect" as const, url: "/dash/settings?saved" });
  }

  return dsRedirect("/dash/settings?saved");
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
          message: "Avatar display setting saved successfully.",
          comment: "@context: Toast after saving avatar display preference",
        }),
      ),
    });
  }

  return sse(c, async (stream) => {
    await stream.toast(
      i18n._(
        msg({
          message: "Avatar display setting saved successfully.",
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
// Account
// ===========================================================================

settingsRoutes.get("/account", async (c) => {
  const siteName = c.var.appConfig.siteName;
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
  const i18n = getI18n(c);
  const body = await c.req.json<{ userName: string }>();
  const name = body.userName?.trim();

  if (!name) {
    return dsToast(
      i18n._(
        msg({
          message: "Name is required.",
          comment: "@context: Error toast when display name is empty",
        }),
      ),
      "error",
    );
  }

  try {
    await c.var.auth.api.updateUser({
      body: { name },
      headers: c.req.raw.headers,
    });
  } catch {
    return dsToast(
      i18n._(
        msg({
          message: "Failed to update profile.",
          comment: "@context: Error toast when profile update fails",
        }),
      ),
      "error",
    );
  }

  return dsToast(
    i18n._(
      msg({
        message: "Profile saved successfully.",
        comment: "@context: Toast after saving user profile",
      }),
    ),
  );
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
          message: "Passwords do not match.",
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
          message: "Current password is incorrect.",
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
          message: "Password changed successfully.",
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
