/**
 * Color theme picker
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";
import { toPublicPath } from "../../../lib/url.js";
import type { ThemeMode } from "../../../types/config.js";
import type { ColorTheme } from "../../color-themes.js";

function toInlineStyle(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

function getThemePreviewColor(
  variables: Record<string, string>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = variables[key];
    if (value) {
      return value;
    }
  }

  return fallback;
}

function getPreviewVariables(theme: ColorTheme): Record<string, string> {
  return {
    "--preview-bg-light": getThemePreviewColor(
      theme.light,
      ["--background", "--card", "--popover"],
      "transparent",
    ),
    "--preview-fg-light": getThemePreviewColor(
      theme.light,
      ["--foreground", "--card-foreground", "--popover-foreground"],
      "currentColor",
    ),
    "--preview-border-light": getThemePreviewColor(
      theme.light,
      ["--border", "--foreground"],
      "currentColor",
    ),
    "--preview-muted-light": getThemePreviewColor(
      theme.light,
      ["--muted-foreground", "--foreground"],
      "currentColor",
    ),
    "--preview-primary-light": getThemePreviewColor(
      theme.light,
      ["--site-accent", "--primary", "--foreground"],
      "currentColor",
    ),
    "--preview-bg-dark": getThemePreviewColor(
      theme.dark,
      ["--background", "--card", "--popover"],
      "transparent",
    ),
    "--preview-fg-dark": getThemePreviewColor(
      theme.dark,
      ["--foreground", "--card-foreground", "--popover-foreground"],
      "currentColor",
    ),
    "--preview-border-dark": getThemePreviewColor(
      theme.dark,
      ["--border", "--foreground"],
      "currentColor",
    ),
    "--preview-muted-dark": getThemePreviewColor(
      theme.dark,
      ["--muted-foreground", "--foreground"],
      "currentColor",
    ),
    "--preview-primary-dark": getThemePreviewColor(
      theme.dark,
      ["--site-accent", "--primary", "--foreground"],
      "currentColor",
    ),
  };
}

function ThemeModeCard({
  value,
  currentThemeMode,
  title,
  description,
}: {
  value: ThemeMode;
  currentThemeMode: ThemeMode;
  title: string;
  description: string;
}) {
  const expr = `$themeMode === '${value}'`;

  return (
    <label
      class={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${value === currentThemeMode ? "border-primary" : "border-border"}`}
      data-class:border-primary={expr}
      data-class:border-border={`$themeMode !== '${value}'`}
    >
      <input
        type="radio"
        name="themeMode"
        value={value}
        data-bind="themeMode"
        checked={value === currentThemeMode || undefined}
        class="mt-1"
      />
      <div>
        <div class="font-medium">{title}</div>
        <div class="text-sm text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function ThemePreview({ theme }: { theme: ColorTheme }) {
  const { i18n } = useLingui();

  return (
    <div class="min-w-0">
      <div class="theme-preview-meta">
        <span class="theme-preview-name text-[0.95rem]">{theme.name}</span>
      </div>

      <div class="theme-preview-divider mt-2 border-t pt-2">
        <h3 class="theme-preview-title text-[0.98rem]">
          {i18n._(
            msg({
              message: "Field notes on quiet design",
              comment: "@context: Color theme preview card title",
            }),
          )}
        </h3>

        <p class="theme-preview-body mt-2 text-[0.84rem]">
          {i18n._(
            msg({
              message: "Soft color should still carry a clear reading rhythm.",
              comment: "@context: Color theme preview card body sentence",
            }),
          )}
        </p>
        <p class="theme-preview-meta mt-1.5 text-[0.8rem]">
          {i18n._(
            msg({
              message: "Quiet surfaces let writing lead.",
              comment: "@context: Color theme preview card secondary sentence",
            }),
          )}{" "}
          <a class="theme-preview-link" tabIndex={-1}>
            {i18n._(
              msg({
                message: "Read why",
                comment: "@context: Color theme preview inline link label",
              }),
            )}
          </a>
          .
        </p>

        <div class="theme-preview-divider mt-3 border-t pt-2">
          <div class="theme-preview-meta flex items-center gap-2 text-[0.72rem]">
            <span>
              {i18n._(
                msg({
                  message: "March 14",
                  comment: "@context: Color theme preview date label",
                }),
              )}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {i18n._(
                msg({
                  message: "Design",
                  comment: "@context: Color theme preview collection label",
                }),
              )}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {i18n._(
                msg({
                  message: "Note",
                  comment: "@context: Color theme preview format label",
                }),
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  currentThemeMode,
}: {
  theme: ColorTheme;
  selected: boolean;
  currentThemeMode: ThemeMode;
}) {
  const expr = `$theme === '${theme.id}'`;

  return (
    <label
      class={`theme-preview-panel block cursor-pointer rounded-2xl border transition-colors ${selected ? "border-primary" : "border-border"}`}
      data-class:border-primary={expr}
      data-class:border-border={`$theme !== '${theme.id}'`}
      data-theme-preview-mode={currentThemeMode}
      style={toInlineStyle(getPreviewVariables(theme))}
    >
      <div class="flex items-start gap-3 p-3">
        <input
          type="radio"
          name="theme"
          value={theme.id}
          data-bind="theme"
          checked={selected || undefined}
          class="mt-1"
        />
        <div class="flex-1">
          <ThemePreview theme={theme} />
        </div>
      </div>
    </label>
  );
}

export function ColorThemeContent({
  themes,
  currentThemeId,
  currentThemeMode,
  sitePathPrefix = "",
}: {
  themes: ColorTheme[];
  currentThemeId: string;
  currentThemeMode: ThemeMode;
  sitePathPrefix?: string;
}) {
  const { i18n } = useLingui();

  const themeSignals = JSON.stringify({
    theme: currentThemeId,
    themeMode: currentThemeMode,
  }).replace(/</g, "\\u003c");

  return (
    <div
      data-signals={themeSignals}
      data-on:change={`@post('${toPublicPath("/settings/color-theme", sitePathPrefix)}')`}
      class="max-w-5xl"
    >
      <fieldset>
        <legend class="text-lg font-semibold">
          {i18n._(
            msg({
              message: "Color theme",
              comment: "@context: Appearance settings heading",
            }),
          )}
        </legend>
        <p class="text-sm text-muted-foreground mb-4">
          {i18n._(
            msg({
              message:
                "Applies to your entire site, including admin pages. Pick a palette, then choose whether it follows the system or stays fixed.",
              comment: "@context: Appearance settings description",
            }),
          )}{" "}
          {i18n._(
            msg({
              message: "Want more control?",
              comment:
                "@context: Prefix before Custom CSS link on color theme page",
            }),
          )}{" "}
          <a
            href={toPublicPath("/settings/custom-css", sitePathPrefix)}
            class="underline hover:text-foreground transition-colors"
          >
            {i18n._(
              msg({
                message: "Custom CSS",
                comment:
                  "@context: Link to Custom CSS settings from color theme page",
              }),
            )}
          </a>{" "}
          {i18n._(
            msg({
              message: "lets you override any theme variable.",
              comment:
                "@context: Suffix after Custom CSS link on color theme page",
            }),
          )}
        </p>

        <div class="mb-6 grid gap-3 md:grid-cols-3">
          <ThemeModeCard
            value="auto"
            currentThemeMode={currentThemeMode}
            title={i18n._(
              msg({
                message: "Auto",
                comment: "@context: Theme mode option label",
              }),
            )}
            description={i18n._(
              msg({
                message: "Follow each visitor's system preference.",
                comment: "@context: Theme mode option description",
              }),
            )}
          />
          <ThemeModeCard
            value="light"
            currentThemeMode={currentThemeMode}
            title={i18n._(
              msg({
                message: "Light",
                comment: "@context: Theme mode option label",
              }),
            )}
            description={i18n._(
              msg({
                message: "Always show the light version of the theme.",
                comment: "@context: Theme mode option description",
              }),
            )}
          />
          <ThemeModeCard
            value="dark"
            currentThemeMode={currentThemeMode}
            title={i18n._(
              msg({
                message: "Dark",
                comment: "@context: Theme mode option label",
              }),
            )}
            description={i18n._(
              msg({
                message: "Always show the dark version of the theme.",
                comment: "@context: Theme mode option description",
              }),
            )}
          />
        </div>

        <div class="grid gap-3">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={theme.id === currentThemeId}
              currentThemeMode={currentThemeMode}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
