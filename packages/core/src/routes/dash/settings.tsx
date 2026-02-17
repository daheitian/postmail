/**
 * Dashboard Settings Routes
 *
 * Sub-pages: General, Appearance, Account
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../ui/layouts/DashLayout.js";
import { sse, dsRedirect, dsToast } from "../../lib/sse.js";
import {
  getSiteLanguage,
  getSiteName,
  getConfigFallback,
} from "../../lib/config.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import type { ColorTheme } from "../../ui/color-themes.js";

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

// ---------------------------------------------------------------------------
// Shared sub-navigation
// ---------------------------------------------------------------------------

type SettingsTab = "general" | "appearance" | "account";

function SettingsNav({ currentTab }: { currentTab: SettingsTab }) {
  const { t } = useLingui();

  const tabs: { id: SettingsTab; label: string; href: string }[] = [
    {
      id: "general",
      label: t({
        message: "General",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings",
    },
    {
      id: "appearance",
      label: t({
        message: "Appearance",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings/appearance",
    },
    {
      id: "account",
      label: t({
        message: "Account",
        comment: "@context: Settings sub-navigation tab",
      }),
      href: "/dash/settings/account",
    },
  ];

  return (
    <nav class="flex gap-1 mb-6">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          class={`px-3 py-2 text-sm rounded-md ${
            tab.id === currentTab
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// General tab
// ---------------------------------------------------------------------------

function GeneralContent({
  siteName,
  siteDescription,
  siteLanguage,
  siteNameFallback,
  siteDescriptionFallback,
}: {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  siteNameFallback: string;
  siteDescriptionFallback: string;
}) {
  const { t } = useLingui();

  const generalSignals = JSON.stringify({
    siteName,
    siteDescription,
    siteLanguage,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="general" />

      <div class="flex flex-col gap-6 max-w-lg">
        <form
          data-signals={generalSignals}
          data-on:submit__prevent="@post('/dash/settings')"
          data-indicator="_loading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "General",
                  comment: "@context: Settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Site Name",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <input
                  type="text"
                  data-bind="siteName"
                  class="input"
                  placeholder={siteNameFallback}
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Site Description",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <textarea
                  data-bind="siteDescription"
                  class="textarea"
                  rows={3}
                  placeholder={siteDescriptionFallback}
                >
                  {siteDescription}
                </textarea>
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Language",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <select data-bind="siteLanguage" class="select">
                  <option value="en" selected={siteLanguage === "en"}>
                    English
                  </option>
                  <option value="zh-Hans" selected={siteLanguage === "zh-Hans"}>
                    简体中文
                  </option>
                  <option value="zh-Hant" selected={siteLanguage === "zh-Hant"}>
                    繁體中文
                  </option>
                </select>
              </div>
            </section>
          </div>

          <button type="submit" class="btn mt-4" data-attr-disabled="$_loading">
            <span data-show="!$_loading">
              {t({
                message: "Save Settings",
                comment: "@context: Button to save settings",
              })}
            </span>
            <span data-show="$_loading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Appearance tab
// ---------------------------------------------------------------------------

function ThemeCard({
  theme,
  selected,
}: {
  theme: ColorTheme;
  selected: boolean;
}) {
  const expr = `$theme === '${theme.id}'`;
  const { preview } = theme;

  return (
    <label
      class={`block cursor-pointer rounded-lg border overflow-hidden transition-colors ${selected ? "border-primary" : "border-border"}`}
      data-class:border-primary={expr}
      data-class:border-border={`$theme !== '${theme.id}'`}
    >
      <div class="grid grid-cols-2">
        <div
          class="p-5"
          style={`background-color:${preview.lightBg};color:${preview.lightText}`}
        >
          <input
            type="radio"
            name="theme"
            value={theme.id}
            data-bind="theme"
            checked={selected || undefined}
            class="mb-1"
          />
          <h3 class="font-bold text-lg">{theme.name}</h3>
          <p class="text-sm mt-2 leading-relaxed">
            This is the {theme.name} theme in light mode. Links{" "}
            <a
              tabIndex={-1}
              class="underline"
              style={`color:${preview.lightLink}`}
            >
              look like this
            </a>
            . We'll show the correct light or dark mode based on your visitor's
            settings.
          </p>
        </div>
        <div
          class="p-5"
          style={`background-color:${preview.darkBg};color:${preview.darkText}`}
        >
          <h3 class="font-bold text-lg">{theme.name}</h3>
          <p class="text-sm mt-2 leading-relaxed">
            This is the {theme.name} theme in dark mode. Links{" "}
            <a
              tabIndex={-1}
              class="underline"
              style={`color:${preview.darkLink}`}
            >
              look like this
            </a>
            . We'll show the correct light or dark mode based on your visitor's
            settings.
          </p>
        </div>
      </div>
    </label>
  );
}

function AppearanceContent({
  themes,
  currentThemeId,
  customCSS,
}: {
  themes: ColorTheme[];
  currentThemeId: string;
  customCSS: string;
}) {
  const { t } = useLingui();

  const themeSignals = JSON.stringify({ theme: currentThemeId }).replace(
    /</g,
    "\\u003c",
  );

  const cssSignals = JSON.stringify({ customCSS }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="appearance" />

      <div
        data-signals={themeSignals}
        data-on:change="@post('/dash/settings/appearance')"
        class="max-w-3xl"
      >
        <fieldset>
          <legend class="text-lg font-semibold">
            {t({
              message: "Color theme",
              comment: "@context: Appearance settings heading",
            })}
          </legend>
          <p class="text-sm text-muted-foreground mb-4">
            {t({
              message:
                "This will theme both your site and your dashboard. All color themes support dark mode.",
              comment: "@context: Appearance settings description",
            })}
          </p>

          <div class="flex flex-col gap-4">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={theme.id === currentThemeId}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <form
        data-signals={cssSignals}
        data-on:submit__prevent="@post('/dash/settings/custom-css')"
        data-indicator="_cssLoading"
        class="max-w-3xl mt-8"
      >
        <fieldset>
          <legend class="text-lg font-semibold">
            {t({
              message: "Custom CSS",
              comment: "@context: Appearance settings heading for custom CSS",
            })}
          </legend>
          <p class="text-sm text-muted-foreground mb-4">
            {t({
              message:
                "Add custom CSS to override any styles. Use data attributes like [data-page], [data-post], [data-format] to target specific elements.",
              comment: "@context: Custom CSS settings description",
            })}
          </p>
          <textarea
            data-bind="customCSS"
            class="textarea font-mono text-sm min-h-32"
            rows={8}
            placeholder={t({
              message: "/* Your custom CSS here */",
              comment: "@context: Custom CSS textarea placeholder",
            })}
          >
            {customCSS}
          </textarea>
        </fieldset>
        <button
          type="submit"
          class="btn mt-4"
          data-attr-disabled="$_cssLoading"
        >
          <span data-show="!$_cssLoading">
            {t({
              message: "Save CSS",
              comment: "@context: Button to save custom CSS",
            })}
          </span>
          <span data-show="$_cssLoading">
            {t({
              message: "Processing...",
              comment:
                "@context: Loading text shown on submit button while request is in progress",
            })}
          </span>
        </button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Account tab
// ---------------------------------------------------------------------------

function AccountContent({ userName }: { userName: string }) {
  const { t } = useLingui();

  const profileSignals = JSON.stringify({ userName }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>
      <SettingsNav currentTab="account" />

      <div class="flex flex-col gap-6 max-w-lg">
        <form
          data-signals={profileSignals}
          data-on:submit__prevent="@post('/dash/settings/account')"
          data-indicator="_profileLoading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "Profile",
                  comment: "@context: Account settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Name",
                    comment: "@context: Account settings form field",
                  })}
                </label>
                <input
                  type="text"
                  data-bind="userName"
                  class="input"
                  required
                />
              </div>
            </section>
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr-disabled="$_profileLoading"
          >
            <span data-show="!$_profileLoading">
              {t({
                message: "Save Profile",
                comment: "@context: Button to save profile",
              })}
            </span>
            <span data-show="$_profileLoading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
        </form>

        <form
          data-signals="{currentPassword: '', newPassword: '', confirmPassword: ''}"
          data-on:submit__prevent="@post('/dash/settings/password')"
          data-indicator="_passwordLoading"
        >
          <div class="card">
            <header>
              <h2>
                {t({
                  message: "Change Password",
                  comment: "@context: Settings section heading",
                })}
              </h2>
            </header>
            <section class="flex flex-col gap-4">
              <div class="field">
                <label class="label">
                  {t({
                    message: "Current Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="currentPassword"
                  class="input"
                  required
                  autocomplete="current-password"
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "New Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="newPassword"
                  class="input"
                  required
                  minlength={8}
                  autocomplete="new-password"
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Confirm New Password",
                    comment: "@context: Password form field",
                  })}
                </label>
                <input
                  type="password"
                  data-bind="confirmPassword"
                  class="input"
                  required
                  minlength={8}
                  autocomplete="new-password"
                />
              </div>
            </section>
          </div>

          <button
            type="submit"
            class="btn mt-4"
            data-attr-disabled="$_passwordLoading"
          >
            <span data-show="!$_passwordLoading">
              {t({
                message: "Change Password",
                comment: "@context: Button to change password",
              })}
            </span>
            <span data-show="$_passwordLoading">
              {t({
                message: "Processing...",
                comment:
                  "@context: Loading text shown on submit button while request is in progress",
              })}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}

// ===========================================================================
// Route handlers
// ===========================================================================

// General settings page
settingsRoutes.get("/", async (c) => {
  const { settings } = c.var.services;

  const dbSiteName = await settings.get("SITE_NAME");
  const dbSiteDescription = await settings.get("SITE_DESCRIPTION");
  const siteLanguage = await getSiteLanguage(c);

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
        siteNameFallback={siteNameFallback}
        siteDescriptionFallback={siteDescriptionFallback}
      />
    </DashLayout>,
  );
});

// Save general settings
settingsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    siteName: string;
    siteDescription: string;
    siteLanguage: string;
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

// Appearance page
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

// Save theme
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

// Save custom CSS
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

// Account page
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

// Save account profile
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

// Change password
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
