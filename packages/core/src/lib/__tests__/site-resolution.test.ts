import { describe, expect, it } from "vitest";
import { getRuntimeSitePathPrefix } from "../site-resolution.js";

describe("getRuntimeSitePathPrefix", () => {
  it("prefers the resolved app config when available", () => {
    expect(
      getRuntimeSitePathPrefix({
        env: {
          SITE_RESOLUTION_MODE: "host-based",
          SITE_PATH_PREFIX: "/legacy",
        },
        appConfig: { sitePathPrefix: "/tenant" },
        currentSiteDomain: { pathPrefix: "/ignored" },
      }),
    ).toBe("/tenant");
  });

  it("uses the matched site domain in host-based mode", () => {
    expect(
      getRuntimeSitePathPrefix({
        env: {
          SITE_RESOLUTION_MODE: "host-based",
          SITE_PATH_PREFIX: "/legacy",
        },
        currentSiteDomain: { pathPrefix: "/tenant" },
      }),
    ).toBe("/tenant");
  });

  it("uses SITE_PATH_PREFIX only in single-site mode", () => {
    expect(
      getRuntimeSitePathPrefix({
        env: {
          SITE_PATH_PREFIX: "/blog",
        },
      }),
    ).toBe("/blog");
  });
});
