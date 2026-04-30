import { formatter } from "@lingui/format-po";
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "zh-Hans", "zh-Hant"],
  sourceLocale: "en",
  catalogs: [
    {
      // Settings/admin surface — this catalog is translated.
      path: "<rootDir>/src/i18n/locales/settings/{locale}",
      include: [
        "<rootDir>/src/routes/dash/**/*.{ts,tsx}",
        "<rootDir>/src/ui/dash/**/*.{ts,tsx}",
      ],
    },
    {
      // Public/reader surface — only `en` is maintained. No zh-Hans .po is
      // generated (see mise `i18n-translate-zh-Hans`), so Lingui falls back
      // to the source English message at runtime under zh-Hans.
      path: "<rootDir>/src/i18n/locales/public/{locale}",
      include: ["<rootDir>/src/**/*.{ts,tsx}"],
      exclude: ["<rootDir>/src/routes/dash/**", "<rootDir>/src/ui/dash/**"],
    },
  ],
  format: formatter({ origins: true, lineNumbers: false }),
  compileNamespace: "ts",
};

export default config;
