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
    expect(
      getStartupConfigurationErrorPage({
        JANT_DEV_API_TOKEN: "jnt_dev_test123",
      }),
    ).toContain("JANT_AUTH_SECRET is not set");
  });

  it("still accepts the legacy AUTH_SECRET alias during the transition", () => {
    expect(
      getStartupConfigurationErrorPage({
        AUTH_SECRET: "legacy-secret",
      }),
    ).toBeNull();
  });
});
