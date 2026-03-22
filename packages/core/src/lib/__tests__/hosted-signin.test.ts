import { describe, expect, it } from "vitest";
import {
  getHostedAuthAccountPasswordUrl,
  getHostedAuthAccountUrl,
  getHostedAuthDashboardUrl,
  getHostedAuthProviderLabel,
  getHostedAuthResetUrl,
  getHostedAuthSigninUrl,
  isHostedAuthEnabled,
} from "../hosted-signin.js";

describe("getHostedAuthSigninUrl", () => {
  it("returns the hosted auth handoff URL for hosted sites", () => {
    const url = getHostedAuthSigninUrl(
      {
        HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "host-based",
      },
      "https://site7.localtest.me/signin",
    );

    expect(url).toBe(
      "https://cloud-jant.localtest.me/auth/handoff/start?host=site7.localtest.me&redirect=%2Fsettings",
    );
  });

  it("returns null outside host-based mode", () => {
    const url = getHostedAuthSigninUrl(
      {
        HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "single-site",
      },
      "https://site7.localtest.me/signin",
    );

    expect(url).toBeNull();
  });

  it("returns the hosted auth reset URL for hosted sites", () => {
    const url = getHostedAuthResetUrl(
      {
        HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "host-based",
      },
      "https://site7.localtest.me/reset",
    );

    expect(url).toBe(
      "https://cloud-jant.localtest.me/reset?next=%2Fauth%2Fhandoff%2Fstart%3Fhost%3Dsite7.localtest.me%26redirect%3D%252Fsettings",
    );
  });

  it("returns hosted dashboard and account URLs", () => {
    const env = {
      HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
      SITE_RESOLUTION_MODE: "host-based",
    };

    expect(getHostedAuthDashboardUrl(env)).toBe(
      "https://cloud-jant.localtest.me/sites",
    );
    expect(getHostedAuthAccountUrl(env)).toBe(
      "https://cloud-jant.localtest.me/settings/account",
    );
    expect(getHostedAuthAccountPasswordUrl(env)).toBe(
      "https://cloud-jant.localtest.me/settings/account/password",
    );
    expect(isHostedAuthEnabled(env)).toBe(true);
  });

  it("uses the configured provider name when available", () => {
    expect(
      getHostedAuthProviderLabel({
        HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
        HOSTED_AUTH_PROVIDER_NAME: "Managed sign-in",
      }),
    ).toBe("Managed sign-in");
  });

  it("falls back to the provider host when no provider name is configured", () => {
    expect(
      getHostedAuthProviderLabel({
        HOSTED_AUTH_BASE_URL: "https://cloud-jant.localtest.me",
      }),
    ).toBe("cloud-jant.localtest.me");
  });

  it("disables hosted auth without a hosted auth base URL", () => {
    expect(
      isHostedAuthEnabled({
        SITE_RESOLUTION_MODE: "host-based",
      }),
    ).toBe(false);
  });
});
