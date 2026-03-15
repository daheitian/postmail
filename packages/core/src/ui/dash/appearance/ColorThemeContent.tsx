/**
 * Color theme picker
 */

import { useLingui } from "@lingui/react/macro";
import type { ThemeMode } from "../../../types/config.js";
import type { ColorTheme } from "../../color-themes.js";

function toInlineStyle(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

function getPreviewVariables(theme: ColorTheme): Record<string, string> {
  return {
    "--preview-bg-light": theme.light["--background"] ?? theme.preview.lightBg,
    "--preview-fg-light":
      theme.light["--foreground"] ?? theme.preview.lightText,
    "--preview-border-light":
      theme.light["--border"] ?? theme.preview.lightText,
    "--preview-muted-light":
      theme.light["--muted-foreground"] ?? theme.preview.lightText,
    "--preview-primary-light":
      theme.light["--primary"] ?? theme.preview.lightLink,
    "--preview-bg-dark": theme.dark["--background"] ?? theme.preview.darkBg,
    "--preview-fg-dark": theme.dark["--foreground"] ?? theme.preview.darkText,
    "--preview-border-dark": theme.dark["--border"] ?? theme.preview.darkText,
    "--preview-muted-dark":
      theme.dark["--muted-foreground"] ?? theme.preview.darkText,
    "--preview-primary-dark": theme.dark["--primary"] ?? theme.preview.darkLink,
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
  const { t } = useLingui();

  return (
    <div class="min-w-0">
      <div class="theme-preview-meta">
        <span class="theme-preview-name text-[0.95rem]">{theme.name}</span>
      </div>

      <div class="theme-preview-divider mt-2 border-t pt-2">
        <h3 class="theme-preview-title text-[0.98rem]">
          {t({
            message: "Field notes on quiet design",
            comment: "@context: Color theme preview card title",
          })}
        </h3>

        <p class="theme-preview-body mt-2 text-[0.84rem]">
          {t({
            message: "Soft color should still carry a clear reading rhythm.",
            comment: "@context: Color theme preview card body sentence",
          })}
        </p>
        <p class="theme-preview-meta mt-1.5 text-[0.8rem]">
          {t({
            message: "Quiet surfaces let writing lead.",
            comment: "@context: Color theme preview card secondary sentence",
          })}{" "}
          <a class="theme-preview-link" tabIndex={-1}>
            {t({
              message: "Read why",
              comment: "@context: Color theme preview inline link label",
            })}
          </a>
          .
        </p>

        <div class="theme-preview-divider mt-3 border-t pt-2">
          <div class="theme-preview-meta flex items-center gap-2 text-[0.72rem]">
            <span>
              {t({
                message: "March 14",
                comment: "@context: Color theme preview date label",
              })}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {t({
                message: "Design",
                comment: "@context: Color theme preview collection label",
              })}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {t({
                message: "Note",
                comment: "@context: Color theme preview format label",
              })}
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
}: {
  themes: ColorTheme[];
  currentThemeId: string;
  currentThemeMode: ThemeMode;
}) {
  const { t } = useLingui();

  const themeSignals = JSON.stringify({
    theme: currentThemeId,
    themeMode: currentThemeMode,
  }).replace(/</g, "\\u003c");

  return (
    <div
      data-signals={themeSignals}
      data-on:change="@post('/settings/color-theme')"
      class="max-w-5xl"
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
              "Applies to your entire site, including admin pages. Pick a palette, then choose whether it follows the system or stays fixed.",
            comment: "@context: Appearance settings description",
          })}{" "}
          {t({
            message: "Want more control?",
            comment:
              "@context: Prefix before Custom CSS link on color theme page",
          })}{" "}
          <a
            href="/settings/custom-css"
            class="underline hover:text-foreground transition-colors"
          >
            {t({
              message: "Custom CSS",
              comment:
                "@context: Link to Custom CSS settings from color theme page",
            })}
          </a>{" "}
          {t({
            message: "lets you override any theme variable.",
            comment:
              "@context: Suffix after Custom CSS link on color theme page",
          })}
        </p>

        <div class="mb-6 grid gap-3 md:grid-cols-3">
          <ThemeModeCard
            value="auto"
            currentThemeMode={currentThemeMode}
            title={t({
              message: "Auto",
              comment: "@context: Theme mode option label",
            })}
            description={t({
              message: "Follow each visitor's system preference.",
              comment: "@context: Theme mode option description",
            })}
          />
          <ThemeModeCard
            value="light"
            currentThemeMode={currentThemeMode}
            title={t({
              message: "Light",
              comment: "@context: Theme mode option label",
            })}
            description={t({
              message: "Always show the light version of the theme.",
              comment: "@context: Theme mode option description",
            })}
          />
          <ThemeModeCard
            value="dark"
            currentThemeMode={currentThemeMode}
            title={t({
              message: "Dark",
              comment: "@context: Theme mode option label",
            })}
            description={t({
              message: "Always show the dark version of the theme.",
              comment: "@context: Theme mode option description",
            })}
          />
        </div>

        <div class="flex flex-col gap-3">
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
