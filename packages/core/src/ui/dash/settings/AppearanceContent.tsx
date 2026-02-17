/**
 * Appearance settings: color theme picker + custom CSS form
 */

import { useLingui } from "@lingui/react/macro";
import type { ColorTheme } from "../../color-themes.js";
import { SettingsNav } from "./SettingsNav.js";

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

export function AppearanceContent({
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
