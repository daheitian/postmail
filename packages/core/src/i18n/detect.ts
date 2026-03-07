/**
 * Language Detection Utilities
 */

import { locales, baseLocale, isLocale, type Locale } from "./locales.js";

/**
 * Get display name for a language code
 */
export function getLanguageDisplayName(locale: Locale): string {
  const names: Record<Locale, string> = {
    en: "English",
    "zh-Hans": "简体中文",
    "zh-Hant": "繁體中文",
  };
  return names[locale];
}

/**
 * Get all supported languages with display names
 */
export function getSupportedLanguages(): Array<{ code: Locale; name: string }> {
  return locales.map((code) => ({
    code,
    name: getLanguageDisplayName(code),
  }));
}

/**
 * Check if a language code is valid
 */
export function isValidLanguage(lang: unknown): lang is Locale {
  return isLocale(lang);
}

/**
 * Map a BCP 47 language tag to a supported locale.
 *
 * @param tag - BCP 47 language tag (e.g. "zh-CN", "en-US")
 * @returns Matching locale, or `undefined` if unsupported
 */
function mapTagToLocale(tag: string): Locale | undefined {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return undefined;

  // Extract primary language subtag
  const primary = normalized.split("-")[0];

  // Chinese variants need script/region mapping
  if (primary === "zh") {
    const rest = normalized.slice(3); // everything after "zh-"
    // Simplified Chinese: zh-Hans, zh-CN, zh-SG
    if (rest === "hans" || rest === "cn" || rest === "sg") return "zh-Hans";
    // Traditional Chinese: zh-Hant, zh-TW, zh-HK, zh-MO
    if (rest === "hant" || rest === "tw" || rest === "hk" || rest === "mo")
      return "zh-Hant";
    // Bare "zh" defaults to Simplified
    if (!rest) return "zh-Hans";
    return undefined;
  }

  // Direct match (e.g. "en")
  if (isLocale(primary)) return primary;

  return undefined;
}

/**
 * Detect the best supported locale from an `Accept-Language` HTTP header.
 *
 * Parses comma-separated entries, respects q-values, and maps BCP 47 tags
 * to supported locales using script/region rules for Chinese variants.
 *
 * @param header - Raw `Accept-Language` header value (e.g. "zh-TW,en;q=0.9")
 * @returns Best matching locale, or the base locale ("en") if none match
 *
 * @example
 * detectLocaleFromHeader("zh-CN,en;q=0.8") // "zh-Hans"
 * detectLocaleFromHeader("fr,de;q=0.9")    // "en" (fallback)
 */
export function detectLocaleFromHeader(header: string | undefined): Locale {
  if (!header || !header.trim()) return baseLocale;

  // Parse entries: "lang;q=0.8" → { tag, q }
  const entries: Array<{ tag: string; q: number }> = [];

  for (const part of header.split(",")) {
    const segments = part.trim().split(";");
    const tag = segments[0]?.trim();
    if (!tag) continue;

    let q = 1.0;
    for (let i = 1; i < segments.length; i++) {
      const param = segments[i]?.trim();
      if (param?.toLowerCase().startsWith("q=")) {
        const parsed = Number.parseFloat(param.slice(2));
        if (!Number.isNaN(parsed)) q = parsed;
        break;
      }
    }

    // q=0 means "not acceptable"
    if (q <= 0) continue;

    entries.push({ tag, q });
  }

  // Stable sort by q-value descending
  entries.sort((a, b) => b.q - a.q);

  // Return first matching locale
  for (const { tag } of entries) {
    const locale = mapTagToLocale(tag);
    if (locale) return locale;
  }

  return baseLocale;
}
