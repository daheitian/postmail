/**
 * Dashboard Settings Routes
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../theme/layouts/index.js";
import { sse } from "../../lib/sse.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsRoutes = new Hono<Env>();

function SettingsContent({
  siteName,
  siteDescription,
  siteLanguage,
  saved,
}: {
  siteName: string;
  siteDescription: string;
  siteLanguage: string;
  saved: boolean;
}) {
  const { t } = useLingui();

  const generalSignals = JSON.stringify({
    siteName,
    siteDescription,
    siteLanguage,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({ message: "Settings", comment: "@context: Dashboard heading" })}
      </h1>

      {saved && (
        <div
          id="settings-saved-toast"
          class="alert mb-4 max-w-lg transition-opacity duration-300"
          data-init={`console.log('[toast] init fired at', Date.now()); history.replaceState({}, '', '/dash/settings'); setTimeout(() => { console.log('[toast] hiding at', Date.now()); const el = document.getElementById('settings-saved-toast'); if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) } }, 3000)`}
        >
          <h2>
            {t({
              message: "Settings saved successfully.",
              comment: "@context: Toast message after saving settings",
            })}
          </h2>
        </div>
      )}

      <div class="flex flex-col gap-6 max-w-lg">
        <form
          data-signals={generalSignals}
          data-on:submit__prevent="@post('/dash/settings')"
        >
          <div id="settings-message"></div>
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
                  required
                />
              </div>

              <div class="field">
                <label class="label">
                  {t({
                    message: "Site Description",
                    comment: "@context: Settings form field",
                  })}
                </label>
                <textarea data-bind="siteDescription" class="textarea" rows={3}>
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

          <button type="submit" class="btn mt-4">
            {t({
              message: "Save Settings",
              comment: "@context: Button to save settings",
            })}
          </button>
        </form>

        <form
          data-signals="{currentPassword: '', newPassword: '', confirmPassword: ''}"
          data-on:submit__prevent="@post('/dash/settings/password')"
        >
          <div id="password-message"></div>
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

          <button type="submit" class="btn mt-4">
            {t({
              message: "Change Password",
              comment: "@context: Button to change password",
            })}
          </button>
        </form>
      </div>
    </>
  );
}

// Settings page
settingsRoutes.get("/", async (c) => {
  const all = await c.var.services.settings.getAll();
  const siteName = all["SITE_NAME"] ?? "Jant";
  const siteDescription = all["SITE_DESCRIPTION"] ?? "";
  const siteLanguage = all["SITE_LANGUAGE"] ?? "en";
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Settings"
      siteName={siteName}
      currentPath="/dash/settings"
    >
      <SettingsContent
        siteName={siteName}
        siteDescription={siteDescription}
        siteLanguage={siteLanguage}
        saved={saved}
      />
    </DashLayout>,
  );
});

// Update settings
settingsRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    siteName: string;
    siteDescription: string;
    siteLanguage: string;
  }>();

  const oldLanguage =
    (await c.var.services.settings.get("SITE_LANGUAGE")) ?? "en";

  await c.var.services.settings.setMany({
    SITE_NAME: body.siteName,
    SITE_DESCRIPTION: body.siteDescription,
    SITE_LANGUAGE: body.siteLanguage,
  });

  const languageChanged = oldLanguage !== body.siteLanguage;

  return sse(c, async (stream) => {
    if (languageChanged) {
      // Language changed - full reload needed to update all UI text
      await stream.redirect("/dash/settings?saved");
    } else {
      // No language change - show inline success message
      await stream.patchElements(
        '<div id="settings-message"><div class="alert mb-4 transition-opacity duration-300" data-init="setTimeout(() => { el.style.opacity = \'0\'; setTimeout(() => el.remove(), 300) }, 3000)"><h2>Settings saved successfully.</h2></div></div>',
      );
    }
  });
});

// Change password
settingsRoutes.post("/password", async (c) => {
  const body = await c.req.json<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  if (body.newPassword !== body.confirmPassword) {
    return sse(c, async (stream) => {
      await stream.patchElements(
        '<div id="password-message"><div class="alert-destructive mb-4"><h2>Passwords do not match.</h2></div></div>',
      );
    });
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
    return sse(c, async (stream) => {
      await stream.patchElements(
        '<div id="password-message"><div class="alert-destructive mb-4"><h2>Current password is incorrect.</h2></div></div>',
      );
    });
  }

  return sse(c, async (stream) => {
    await stream.patchElements(
      '<div id="password-message"><div class="alert mb-4"><h2>Password changed successfully.</h2></div></div>',
    );
    await stream.patchSignals({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  });
});
