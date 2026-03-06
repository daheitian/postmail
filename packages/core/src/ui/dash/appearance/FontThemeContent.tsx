/**
 * Font theme picker
 */

import { useLingui } from "@lingui/react/macro";
import type { FontTheme } from "../../font-themes.js";

export function FontThemeContent({
  fontThemes,
  currentFontThemeId,
}: {
  fontThemes: FontTheme[];
  currentFontThemeId: string;
}) {
  const { t } = useLingui();

  return (
    <div
      data-signals={JSON.stringify({ fontTheme: currentFontThemeId }).replace(
        /</g,
        "\\u003c",
      )}
      data-on:change="@post('/settings/font-theme')"
      class="max-w-3xl"
    >
      <fieldset>
        <legend class="text-lg font-semibold">
          {t({
            message: "Font theme",
            comment: "@context: Appearance settings heading for font theme",
          })}
        </legend>
        <p class="text-sm text-muted-foreground mb-4">
          {t({
            message:
              "Choose a font pairing for your site. All options use system fonts for fast loading.",
            comment: "@context: Font theme settings description",
          })}
        </p>
        <div class="flex flex-col gap-2">
          {fontThemes.map((ft) => (
            <label
              key={ft.id}
              class={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${ft.id === currentFontThemeId ? "border-primary" : "border-border"}`}
              data-class:border-primary={`$fontTheme === '${ft.id}'`}
              data-class:border-border={`$fontTheme !== '${ft.id}'`}
            >
              <input
                type="radio"
                name="fontTheme"
                value={ft.id}
                data-bind="fontTheme"
                checked={ft.id === currentFontThemeId || undefined}
                class="mt-1"
              />
              <div>
                <div class="font-medium">{t(ft.name)}</div>
                <div class="text-sm text-muted-foreground">
                  {t(ft.description)}
                </div>
                <div class="mt-1 text-sm leading-relaxed">
                  <div
                    class="font-semibold"
                    style={`font-family:${ft.headingFontFamily}`}
                  >
                    {t({
                      message: "The quick brown fox jumps over the lazy dog.",
                      comment:
                        "@context: Font theme preview sentence for headings",
                    })}
                  </div>
                  <div class="mt-2" style={`font-family:${ft.bodyFontFamily}`}>
                    {t({
                      message: "The quick brown fox jumps over the lazy dog.",
                      comment:
                        "@context: Font theme preview sentence for body text",
                    })}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
