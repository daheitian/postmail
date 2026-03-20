import { describe, expect, it } from "vitest";
import { getStartupConfigurationErrorPage } from "../startup-config.js";

describe("getStartupConfigurationErrorPage", () => {
  it("does not block startup when JANT_AUTH_SECRET is present", () => {
    expect(
      getStartupConfigurationErrorPage({
        JANT_AUTH_SECRET: "test-secret",
        JANT_DEV_API_TOKEN: "jnt_dev_test123",
      }),
    ).toBeNull();
  });

  it("returns an error page when JANT_AUTH_SECRET is missing", () => {
    const page = getStartupConfigurationErrorPage({
      JANT_DEV_API_TOKEN: "jnt_dev_test123",
    });

    expect(page).toContain("JANT_AUTH_SECRET is not set");
    expect(page).toContain("wrangler secret put JANT_AUTH_SECRET");
    expect(page).toContain(".dev.vars");
    expect(page).not.toContain("wrangler.toml");
  });

  it("still accepts the legacy AUTH_SECRET alias during the transition", () => {
    expect(
      getStartupConfigurationErrorPage({
        AUTH_SECRET: "legacy-secret",
      }),
    ).toBeNull();
  });
});
