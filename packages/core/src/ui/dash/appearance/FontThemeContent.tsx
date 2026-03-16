/**
 * Font theme picker
 */

import { useLingui } from "@lingui/react/macro";
import { getFontThemeCssVariables, type FontTheme } from "../../font-themes.js";
import { toPublicPath } from "../../../lib/url.js";

function toInlineStyle(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

export function FontThemeContent({
  fontThemes,
  currentFontThemeId,
  sitePathPrefix = "",
}: {
  fontThemes: FontTheme[];
  currentFontThemeId: string;
  sitePathPrefix?: string;
}) {
  const { t } = useLingui();

  return (
    <div
      data-signals={JSON.stringify({ fontTheme: currentFontThemeId }).replace(
        /</g,
        "\\u003c",
      )}
      data-on:change={`@post('${toPublicPath("/settings/font-theme", sitePathPrefix)}')`}
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
              "Choose a typographic direction for your site. Each theme changes both the font pairing and the reading rhythm.",
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
                <div
                  class="mt-3 rounded-xl border border-border/70 bg-muted/30 p-4"
                  style={toInlineStyle(getFontThemeCssVariables(ft))}
                >
                  <div
                    class="text-[0.68rem] uppercase text-muted-foreground"
                    style="font-family:var(--font-body);font-weight:var(--type-label-weight);letter-spacing:var(--type-label-tracking);line-height:1"
                  >
                    {t({
                      message: "Field note",
                      comment: "@context: Font theme preview eyebrow label",
                    })}
                  </div>
                  <div
                    class="mt-2 text-[1.35rem] text-foreground"
                    style="font-family:var(--font-heading);font-weight:var(--type-display-weight);letter-spacing:var(--type-display-tracking);line-height:var(--type-display-leading)"
                  >
                    {t({
                      message: "Write small things with a clear shape.",
                      comment: "@context: Font theme preview display sentence",
                    })}
                  </div>
                  <div
                    class="mt-1 text-sm text-muted-foreground"
                    style="font-family:var(--font-body);font-size:var(--type-body-size);line-height:var(--type-body-leading);letter-spacing:var(--type-body-tracking)"
                  >
                    {t({
                      message: "写下一点想法，也要让它有自己的轮廓。",
                      comment:
                        "@context: Font theme preview Chinese body sentence",
                    })}
                  </div>
                  <div
                    class="mt-3 text-sm text-foreground"
                    style="font-family:var(--font-body);font-size:var(--type-body-size);line-height:var(--type-body-leading);letter-spacing:var(--type-body-tracking)"
                  >
                    {t({
                      message:
                        "A good font theme should change the pace of reading, not only the shape of the letters.",
                      comment: "@context: Font theme preview body sentence",
                    })}
                  </div>
                  <div
                    class="mt-3 border-l border-border pl-3 text-sm text-foreground/90"
                    style="font-family:var(--font-heading);font-weight:var(--type-heading-weight);letter-spacing:var(--type-heading-tracking);line-height:var(--type-heading-leading)"
                  >
                    {t({
                      message:
                        "Quotes, titles, and labels should all lean together.",
                      comment: "@context: Font theme preview quote sentence",
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
