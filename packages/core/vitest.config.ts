import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  define: {
    __JANT_DEV__: "false",
    __JANT_VERSION__: JSON.stringify("test-version"),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // Match the SWC Lingui transform used in runtime builds.
      "@lingui/react/macro": resolve(__dirname, "src/i18n/index.ts"),
      "@lingui/core/macro": resolve(
        __dirname,
        "src/__tests__/helpers/lingui-core-macro-mock.ts",
      ),
    },
  },
  test: {
    globals: true,
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/__tests__/**/*.test.tsx",
    ],
  },
});
