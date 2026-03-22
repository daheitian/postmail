import type {
  SettingsService,
  SiteSettingsData,
  SiteSettingsResult,
} from "./settings.js";
import type { HostedControlPlaneClient } from "../lib/hosted-control-plane.js";

export interface SiteProfileServiceDeps {
  hostedControlPlane?: HostedControlPlaneClient | null;
  logSyncError?: ((error: unknown) => void) | null;
}

export interface UpdateSiteProfileDeps {
  updateCurrentUserName?: ((displayName: string) => Promise<void>) | null;
}

export interface SiteProfileService {
  updateSiteSettings(
    data: SiteSettingsData,
    opts: { fallbackSiteName: string; oldSiteName: string },
    deps?: UpdateSiteProfileDeps,
  ): Promise<SiteSettingsResult>;
}

export function createSiteProfileService(
  settings: SettingsService,
  siteId: string,
  deps?: SiteProfileServiceDeps,
): SiteProfileService {
  return {
    async updateSiteSettings(data, opts, callDeps) {
      const result = await settings.updateSiteSettings(data, opts);

      if (callDeps?.updateCurrentUserName) {
        await callDeps.updateCurrentUserName(result.displayName);
      }

      if (result.siteNameChanged && deps?.hostedControlPlane) {
        try {
          await deps.hostedControlPlane.syncSiteMetadata({
            coreSiteId: siteId,
            displayName: result.displayName,
          });
        } catch (error) {
          deps.logSyncError?.(error);
        }
      }

      return result;
    },
  };
}
