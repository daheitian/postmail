import { describe, expect, it, vi } from "vitest";
import { createSiteProfileService } from "../site-profile.js";
import type { SettingsService } from "../settings.js";
import type { HostedControlPlaneClient } from "../../lib/hosted-control-plane.js";

function createSettingsStub(result: {
  displayName: string;
  siteNameChanged: boolean;
}): SettingsService {
  return {
    async completeOnboarding() {},
    async get() {
      return null;
    },
    async getAll() {
      return {};
    },
    async isOnboardingComplete() {
      return false;
    },
    async remove() {},
    async removeAvatar() {},
    async set() {},
    async setMany() {},
    async updateFeedSettings() {},
    async updateGeneral() {
      return {
        displayName: result.displayName,
        languageChanged: false,
      };
    },
    async updateHomeBranding() {},
    async updateLocaleSettings() {
      return { languageChanged: false };
    },
    async updateSearchSettings() {},
    async updateSiteSettings() {
      return result;
    },
    async uploadAvatar() {},
  };
}

describe("SiteProfileService", () => {
  it("updates the current auth user name and syncs hosted metadata on site rename", async () => {
    const syncSiteMetadata = vi.fn(async () => undefined);
    const updateCurrentUserName = vi.fn(async () => undefined);
    const service = createSiteProfileService(
      createSettingsStub({
        displayName: "Updated Site",
        siteNameChanged: true,
      }),
      "sit_test",
      {
        hostedControlPlane: {
          syncSiteMetadata,
        } satisfies HostedControlPlaneClient,
      },
    );

    const result = await service.updateSiteSettings(
      {
        siteDescription: "",
        siteFooter: "",
        siteName: "Updated Site",
      },
      {
        fallbackSiteName: "Jant",
        oldSiteName: "Old Site",
      },
      {
        updateCurrentUserName,
      },
    );

    expect(result.displayName).toBe("Updated Site");
    expect(updateCurrentUserName).toHaveBeenCalledWith("Updated Site");
    expect(syncSiteMetadata).toHaveBeenCalledWith({
      coreSiteId: "sit_test",
      displayName: "Updated Site",
    });
  });

  it("does not sync hosted metadata when the site name is unchanged", async () => {
    const syncSiteMetadata = vi.fn(async () => undefined);
    const service = createSiteProfileService(
      createSettingsStub({
        displayName: "Same Site",
        siteNameChanged: false,
      }),
      "sit_test",
      {
        hostedControlPlane: {
          syncSiteMetadata,
        } satisfies HostedControlPlaneClient,
      },
    );

    await service.updateSiteSettings(
      {
        siteDescription: "",
        siteFooter: "",
        siteName: "Same Site",
      },
      {
        fallbackSiteName: "Jant",
        oldSiteName: "Same Site",
      },
    );

    expect(syncSiteMetadata).not.toHaveBeenCalled();
  });

  it("logs hosted metadata sync failures without failing the site update", async () => {
    const logSyncError = vi.fn();
    const service = createSiteProfileService(
      createSettingsStub({
        displayName: "Updated Site",
        siteNameChanged: true,
      }),
      "sit_test",
      {
        hostedControlPlane: {
          syncSiteMetadata: vi.fn(async () => {
            throw new Error("sync failed");
          }),
        },
        logSyncError,
      },
    );

    await expect(
      service.updateSiteSettings(
        {
          siteDescription: "",
          siteFooter: "",
          siteName: "Updated Site",
        },
        {
          fallbackSiteName: "Jant",
          oldSiteName: "Old Site",
        },
      ),
    ).resolves.toEqual({
      displayName: "Updated Site",
      siteNameChanged: true,
    });

    expect(logSyncError).toHaveBeenCalled();
  });
});
