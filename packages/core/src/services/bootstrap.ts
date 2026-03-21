/**
 * Bootstrap Service
 *
 * Owns first-run site shell setup after account creation.
 */

import type { NavItemService } from "./navigation.js";
import type { SettingsService } from "./settings.js";
import type { SiteMemberService } from "./site-member.js";

export interface CompleteInitialSetupData {
  ownerUserId: string;
  siteName: string;
  siteLanguage?: string | null;
  timeZone?: string | null;
}

export interface BootstrapService {
  /**
   * Complete first-run setup for a newly created account.
   * Ensures default system navigation exists and marks onboarding complete last.
   *
   * @param data - Initial site shell values captured during setup
   */
  completeInitialSetup(data: CompleteInitialSetupData): Promise<void>;
}

export function createBootstrapService(
  settings: SettingsService,
  navItems: NavItemService,
  siteMembers: SiteMemberService,
  siteId: string,
): BootstrapService {
  return {
    async completeInitialSetup(data) {
      await siteMembers.ensure(siteId, data.ownerUserId, "owner");
      await navItems.ensureSystemDefaults();
      await settings.set("SITE_NAME", data.siteName.trim());

      if (data.timeZone) {
        await settings.set("TIME_ZONE", data.timeZone);
      }

      if (data.siteLanguage) {
        await settings.set("SITE_LANGUAGE", data.siteLanguage);
      }

      await settings.completeOnboarding();
    },
  };
}
