/**
 * Locale configuration
 *
 * Two related-but-distinct concepts:
 *
 * - `Locale` (catalog locale): the small enum of locales for which Jant ships
 *   a translation catalog. Used to pick which dashboard translation to render.
 * - Content language: any syntactically valid BCP 47 language tag, used for
 *   `<html lang>`, RSS feed `<language>`, and other metadata. Independent of
 *   whether Jant has a dashboard translation for it — a Finnish blogger should
 *   be able to set `fi` for correct content metadata even though the dashboard
 *   itself falls back to English.
 *
 * The dashboard UI surfaces catalog locales as suggestions, but the underlying
 * setting accepts any BCP 47 tag.
 */

export const locales = ["en", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof locales)[number];
export const baseLocale: Locale = "en";

/**
 * Check if `value` is a Locale Jant has a dashboard translation catalog for.
 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * Check if `value` is a syntactically valid BCP 47 language tag.
 *
 * Accepts any tag the platform's `Intl.Locale` parses, including ones Jant
 * has no dashboard translation for (e.g. `fi`, `ja`, `de`, `fr-CA`).
 */
export function isValidContentLanguage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    new Intl.Locale(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a BCP 47 tag to canonical form (`zh-cn` → `zh-CN`,
 * `ZH-HANS` → `zh-Hans`). Returns `value` unchanged if it cannot be parsed.
 */
export function normalizeContentLanguage(value: string): string {
  const trimmed = value.trim();
  try {
    return new Intl.Locale(trimmed).baseName;
  } catch {
    return trimmed;
  }
}

/**
 * Resolve a content language tag to the catalog locale that should drive the
 * dashboard UI for that user.
 *
 * Fallback chain: exact match → language family match (`zh-CN` → `zh-Hans`,
 * `zh-TW` → `zh-Hant`) → `baseLocale`.
 */
export function resolveCatalogLocale(tag: string): Locale {
  const trimmed = tag.trim();
  if (!trimmed) return baseLocale;

  let parsed: Intl.Locale;
  try {
    parsed = new Intl.Locale(trimmed);
  } catch {
    return baseLocale;
  }

  // Exact match against a shipped catalog
  if (isLocale(parsed.baseName)) return parsed.baseName;

  // Language-family fallback
  if (parsed.language === "zh") {
    const region = parsed.region;
    if (
      parsed.script === "Hant" ||
      region === "TW" ||
      region === "HK" ||
      region === "MO"
    ) {
      return "zh-Hant";
    }
    return "zh-Hans";
  }

  return baseLocale;
}
