/**
 * Setup Routes
 *
 * Initial admin account creation during first-time setup.
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { SetupSchema } from "../../lib/schemas.js";
import { mapIanaToTimezone } from "../../lib/timezones.js";
import { getI18n, baseLocale } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const SetupContent: FC = () => {
  const { t } = useLingui();

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {t({
              message: "Welcome to Jant",
              comment: "@context: Setup page welcome heading",
            })}
          </h2>
          <p>
            {t({
              message: "Create your admin account.",
              comment: "@context: Setup page description",
            })}
          </p>
        </header>
        <section>
          <form
            data-signals="{siteName: '', email: '', password: '', _timezone: ''}"
            data-init="$_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''"
            data-on:submit__prevent="@post('/setup')"
            data-indicator="_loading"
            class="flex flex-col gap-4"
          >
            <div class="field">
              <label class="label">
                {t({
                  message: "Site Name",
                  comment: "@context: Setup form field - site name",
                })}
              </label>
              <input
                type="text"
                data-bind="siteName"
                class="input"
                required
                placeholder="My Blog"
              />
            </div>
            <div class="field">
              <label class="label">
                {t({
                  message: "Email",
                  comment: "@context: Setup/signin form field - email",
                })}
              </label>
              <input
                type="email"
                data-bind="email"
                class="input"
                required
                placeholder="you@example.com"
              />
            </div>
            <div class="field">
              <label class="label">
                {t({
                  message: "Password",
                  comment: "@context: Setup/signin form field - password",
                })}
              </label>
              <input
                type="password"
                data-bind="password"
                class="input"
                required
                minLength={8}
              />
            </div>
            <button type="submit" class="btn" data-attr:disabled="$_loading">
              <svg
                data-show="$_loading"
                style="display:none"
                class="animate-spin size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="status"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {t({
                message: "Complete Setup",
                comment: "@context: Setup form submit button",
              })}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export const setupRoutes = new Hono<Env>();

setupRoutes.get("/setup", async (c) => {
  const isComplete = await c.var.services.settings.isOnboardingComplete();
  if (isComplete) return c.redirect("/");

  return c.html(
    <BaseLayout title="Setup - Jant" c={c}>
      <SetupContent />
    </BaseLayout>,
  );
});

setupRoutes.post("/setup", async (c) => {
  const i18n = getI18n(c);
  const isComplete = await c.var.services.settings.isOnboardingComplete();
  if (isComplete) return c.redirect("/");

  const body = await c.req.json<Record<string, string>>();
  const parsed = SetupSchema.safeParse(body);
  const browserTimezone = body._timezone;

  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message:
            "Something doesn't look right. Check the form and try again.",
          comment: "@context: Fallback validation error for setup form",
        }),
      );
    return dsToast(errorMsg, "error");
  }

  const { siteName, email, password } = parsed.data;

  if (!c.var.auth) {
    return dsToast(
      i18n._(
        msg({
          message: "Auth secret is missing. Check your environment variables.",
          comment:
            "@context: Error toast when authentication secret is missing from server config",
        }),
      ),
      "error",
    );
  }

  try {
    const signUpResponse = await c.var.auth.api.signUpEmail({
      body: { name: siteName.trim(), email, password },
    });

    if (!signUpResponse || "error" in signUpResponse) {
      return dsToast(
        i18n._(
          msg({
            message:
              "Couldn't create your account. Check the details and try again.",
            comment: "@context: Error toast when account creation fails",
          }),
        ),
        "error",
      );
    }

    await c.var.services.settings.completeOnboarding();

    // Save site name
    await c.var.services.settings.set("SITE_NAME", siteName.trim());

    // Save auto-detected timezone
    if (browserTimezone) {
      const tz = mapIanaToTimezone(browserTimezone);
      if (tz !== "UTC") {
        await c.var.services.settings.set("TIME_ZONE", tz);
      }
    }

    // Save auto-detected language
    const detectedLang = c.get("lang");
    if (detectedLang !== baseLocale) {
      await c.var.services.settings.set("SITE_LANGUAGE", detectedLang);
    }

    // Seed default navigation items (order: Collections, Archive, RSS, Settings)
    await c.var.services.navItems.create({
      type: "link",
      label: "Collections",
      url: "/c",
    });

    await c.var.services.navItems.create({
      type: "link",
      label: "Archive",
      url: "/archive",
    });

    await c.var.services.navItems.create({
      type: "system",
      label: "RSS",
      url: "/feed",
    });

    await c.var.services.navItems.create({
      type: "system",
      label: "Settings",
      url: "/settings",
    });

    return dsRedirect("/signin?setup");
  } catch (err) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error("Setup error:", err);
    return dsToast(
      i18n._(
        msg({
          message:
            "Couldn't create your account. Check the details and try again.",
          comment: "@context: Error toast when account creation fails",
        }),
      ),
      "error",
    );
  }
});
