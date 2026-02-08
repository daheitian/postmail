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
}: {
  themes: ColorTheme[];
  currentThemeId: string;
}) {
  const { t } = useLingui();

  const signals = JSON.stringify({ theme: currentThemeId }).replace(
    /</g,
    "\\u003c",
  );

  return (
    <div
      data-signals={signals}
      data-on:change="@post('/dash/appearance')"
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
      toast={saved ? { message: "Theme saved successfully." } : undefined}
    >
      <AppearanceContent themes={themes} currentThemeId={currentThemeId} />
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
      await stream.toast("Invalid theme selected.", "error");
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
