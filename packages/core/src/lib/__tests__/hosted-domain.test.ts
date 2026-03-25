import { describe, expect, it, vi } from "vitest";
import {
  getHostedCanonicalRedirect,
  shouldBypassHostedCanonicalRedirect,
} from "../hosted-domain.js";
import type { Site, SiteDomain } from "../../types.js";

const currentSite: Site = {
  id: "sit_demo",
  key: "demo",
  status: "active",
  createdAt: 0,
  updatedAt: 0,
};

const aliasDomain: SiteDomain = {
  id: "sdom_alias",
  siteId: "sit_demo",
  host: "demo.jant.example",
  pathPrefix: null,
  kind: "alias",
  redirectToPrimary: true,
  createdAt: 0,
  updatedAt: 0,
};

describe("hosted canonical redirects", () => {
  it("bypasses hosted redirects for admin and auth paths", () => {
    expect(
      shouldBypassHostedCanonicalRedirect("/.well-known/jant-domain-check"),
    ).toBe(true);
    expect(shouldBypassHostedCanonicalRedirect("/signin")).toBe(true);
    expect(shouldBypassHostedCanonicalRedirect("/settings/account")).toBe(true);
    expect(shouldBypassHostedCanonicalRedirect("/api/posts")).toBe(true);
    expect(shouldBypassHostedCanonicalRedirect("/archive")).toBe(false);
  });

  it("redirects alias hosts to the current primary domain for public routes", async () => {
    const getPrimaryDomainForSite = vi.fn(async () => ({
      ...aliasDomain,
      id: "sdom_primary",
      host: "www.demo.example",
      kind: "primary" as const,
    }));

    const redirectUrl = await getHostedCanonicalRedirect({
      currentSite,
      currentSiteDomain: aliasDomain,
      publicRequestUrl: "https://demo.jant.example/archive?page=2",
      services: {
        site: {
          getPrimaryDomainForSite,
        },
      } as never,
    });

    expect(getPrimaryDomainForSite).toHaveBeenCalledWith("sit_demo");
    expect(redirectUrl).toBe("https://www.demo.example/archive?page=2");
  });

  it("does not redirect alias hosts for bypassed routes", async () => {
    const getPrimaryDomainForSite = vi.fn();

    const redirectUrl = await getHostedCanonicalRedirect({
      currentSite,
      currentSiteDomain: aliasDomain,
      publicRequestUrl: "https://demo.jant.example/settings",
      services: {
        site: {
          getPrimaryDomainForSite,
        },
      } as never,
    });

    expect(getPrimaryDomainForSite).not.toHaveBeenCalled();
    expect(redirectUrl).toBeNull();
  });
});
