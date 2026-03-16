import { describe, expect, it } from "vitest";
import { getStartupConfigurationErrorPage } from "../startup-config.js";

describe("getStartupConfigurationErrorPage", () => {
  it("does not block startup when AUTH_SECRET is present, even with DEV_API_TOKEN set", () => {
    expect(
      getStartupConfigurationErrorPage({
        AUTH_SECRET: "test-secret",
        DEV_API_TOKEN: "jnt_dev_test123",
      }),
    ).toBeNull();
  });

  it("returns an error page when AUTH_SECRET is missing", () => {
    expect(
      getStartupConfigurationErrorPage({
        DEV_API_TOKEN: "jnt_dev_test123",
      }),
    ).toContain("AUTH_SECRET is not set");
  });
});
