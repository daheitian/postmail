import { describe, expect, it } from "vitest";
import { getRuntimeSitePathPrefix } from "../site-resolution.js";

describe("getRuntimeSitePathPrefix", () => {
  it("prefers the resolved app config when available", () => {
    expect(
      getRuntimeSitePathPrefix({
        env: {
          SITE_RESOLUTION_MODE: "host-based",
          SITE_URL: "https://legacy.example.com/legacy",
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
          SITE_URL: "https://legacy.example.com/legacy",
        },
        currentSiteDomain: { pathPrefix: "/tenant" },
      }),
    ).toBe("/tenant");
  });

  it("uses SITE_URL only in single-site mode", () => {
    expect(
      getRuntimeSitePathPrefix({
        env: {
          SITE_URL: "https://example.com/blog",
        },
      }),
    ).toBe("/blog");
  });
});
