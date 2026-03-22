import { describe, expect, it } from "vitest";
import {
  getHostedCloudResetUrl,
  getHostedCloudSigninUrl,
} from "../hosted-signin.js";

describe("getHostedCloudSigninUrl", () => {
  it("returns the cloud handoff URL for hosted sites", () => {
    const url = getHostedCloudSigninUrl(
      {
        JANT_CLOUD_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "host-based",
      },
      "https://site7.localtest.me/signin",
    );

    expect(url).toBe(
      "https://cloud-jant.localtest.me/auth/handoff/start?host=site7.localtest.me&redirect=%2Fsettings",
    );
  });

  it("returns null outside host-based mode", () => {
    const url = getHostedCloudSigninUrl(
      {
        JANT_CLOUD_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "single-site",
      },
      "https://site7.localtest.me/signin",
    );

    expect(url).toBeNull();
  });

  it("returns the cloud reset URL for hosted sites", () => {
    const url = getHostedCloudResetUrl(
      {
        JANT_CLOUD_BASE_URL: "https://cloud-jant.localtest.me",
        SITE_RESOLUTION_MODE: "host-based",
      },
      "https://site7.localtest.me/reset",
    );

    expect(url).toBe(
      "https://cloud-jant.localtest.me/reset?next=%2Fauth%2Fhandoff%2Fstart%3Fhost%3Dsite7.localtest.me%26redirect%3D%252Fsettings",
    );
  });
});
