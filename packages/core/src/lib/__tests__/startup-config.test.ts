import { describe, expect, it } from "vitest";
import { getStartupConfigurationErrorPage } from "../startup-config.js";

describe("getStartupConfigurationErrorPage", () => {
  it("does not block startup when AUTH_SECRET is present", () => {
    expect(
      getStartupConfigurationErrorPage({
        AUTH_SECRET: "test-secret",
        DEV_API_TOKEN: "jnt_dev_test123",
      }),
    ).toBeNull();
  });

  it("returns an error page when AUTH_SECRET is missing", () => {
    const page = getStartupConfigurationErrorPage({
      DEV_API_TOKEN: "jnt_dev_test123",
    });

    expect(page).toContain("AUTH_SECRET is not set");
    expect(page).toContain(
      "Set <code>AUTH_SECRET=...</code> in the environment used to start Jant.",
    );
    expect(page).toContain("wrangler secret put AUTH_SECRET");
    expect(page).toContain("Open configuration instructions");
  });
});
