import { formatter } from "@lingui/format-po";
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "zh-Hans", "zh-Hant"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}",
      include: ["<rootDir>/src/**/*.{ts,tsx}"],
    },
  ],
  format: formatter({ origins: true, lineNumbers: false }),
  compileNamespace: "ts",
};

export default config;
