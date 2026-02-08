/**
 * Dashboard Appearance Routes
 */

import { Hono } from "hono";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { DashLayout } from "../../theme/layouts/index.js";
import { sse } from "../../lib/sse.js";
import { getSiteName } from "../../lib/config.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { getAvailableThemes } from "../../lib/theme.js";
import type { ColorTheme } from "../../theme/color-themes.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const appearanceRoutes = new Hono<Env>();

function ThemeCard({
  theme,
  selected,
}: {
  theme: ColorTheme;
  selected: boolean;
}) {
  // Get the primary color for preview (use light mode value, fall back to BaseCoat default)
  const primaryColor = theme.light["--primary"] ?? "oklch(0.205 0 0)";
  const expr = `$theme === '${theme.id}'`;

  return (
    <label
      class={`card cursor-pointer transition-all border-2 hover:border-primary/30 ${selected ? "border-primary ring-1 ring-primary" : "border-transparent"}`}
      data-class:border-primary={expr}
      data-class:ring-1={expr}
      data-class:ring-primary={expr}
      data-class:border-transparent={`$theme !== '${theme.id}'`}
    >
      <section class="flex items-center gap-3 py-1">
        <input
          type="radio"
          name="theme"
          value={theme.id}
          data-bind="theme"
          class="sr-only"
        />
        <div
          class="w-8 h-8 rounded-full shrink-0 border border-border"
          style={`background-color: ${primaryColor}`}
        />
        <span class="font-medium text-sm">{theme.name}</span>
        <svg
          class="w-4 h-4 ml-auto text-primary"
          style={selected ? undefined : "display: none"}
          data-show={expr}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </section>
    </label>
  );
}

function AppearanceContent({
  themes,
  currentThemeId,
  saved,
}: {
  themes: ColorTheme[];
  currentThemeId: string;
  saved: boolean;
}) {
  const { t } = useLingui();

  const signals = JSON.stringify({ theme: currentThemeId }).replace(
    /</g,
    "\\u003c",
  );

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">
        {t({
          message: "Appearance",
          comment: "@context: Dashboard heading for appearance settings",
        })}
      </h1>

      {saved && (
        <div
          id="appearance-saved-toast"
          class="alert mb-4 max-w-lg transition-opacity duration-300"
          data-init="history.replaceState({}, '', '/dash/appearance'); setTimeout(() => { const el = document.getElementById('appearance-saved-toast'); if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300) } }, 3000)"
        >
          <h2>
            {t({
              message: "Theme saved successfully.",
              comment:
                "@context: Toast message after saving appearance settings",
            })}
          </h2>
        </div>
      )}

      <div id="appearance-message"></div>

      <form
        data-signals={signals}
        data-on:submit__prevent="@post('/dash/appearance')"
        class="flex flex-col gap-6 max-w-lg"
      >
        <div>
          <h2 class="text-lg font-medium mb-1">
            {t({
              message: "Color Theme",
              comment: "@context: Appearance settings section heading",
            })}
          </h2>
          <p class="text-sm text-muted-foreground mb-4">
            {t({
              message: "Choose a color theme for your site.",
              comment: "@context: Appearance settings section description",
            })}
          </p>

          <div class="grid grid-cols-2 gap-3">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={theme.id === currentThemeId}
              />
            ))}
          </div>
        </div>

        <button type="submit" class="btn self-start">
          {t({
            message: "Save Theme",
            comment: "@context: Button to save appearance settings",
          })}
        </button>
      </form>
    </>
  );
}

// Appearance page
appearanceRoutes.get("/", async (c) => {
  const { settings } = c.var.services;
  const siteName = await getSiteName(c);
  const currentThemeId = (await settings.get(SETTINGS_KEYS.THEME)) ?? "default";
  const themes = getAvailableThemes(c.var.config);
  const saved = c.req.query("saved") !== undefined;

  return c.html(
    <DashLayout
      c={c}
      title="Appearance"
      siteName={siteName}
      currentPath="/dash/appearance"
    >
      <AppearanceContent
        themes={themes}
        currentThemeId={currentThemeId}
        saved={saved}
      />
    </DashLayout>,
  );
});

// Save theme
appearanceRoutes.post("/", async (c) => {
  const body = await c.req.json<{ theme: string }>();
  const { settings } = c.var.services;
  const themes = getAvailableThemes(c.var.config);

  // Validate theme ID
  const validTheme = themes.find((t) => t.id === body.theme);
  if (!validTheme) {
    return sse(c, async (stream) => {
      await stream.patchElements(
        '<div id="appearance-message"><div class="alert-destructive mb-4"><h2>Invalid theme selected.</h2></div></div>',
      );
    });
  }

  if (validTheme.id === "default") {
    await settings.remove(SETTINGS_KEYS.THEME);
  } else {
    await settings.set(SETTINGS_KEYS.THEME, validTheme.id);
  }

  // Full page reload to apply the new theme CSS
  return sse(c, async (stream) => {
    await stream.redirect("/dash/appearance?saved");
  });
});
