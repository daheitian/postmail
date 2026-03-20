/**
 * Settings Service
 *
 * Key-value store for site configuration
 */

import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { settings } from "../db/schema.js";
import { now } from "../lib/time.js";
import {
  SETTINGS_KEYS,
  ONBOARDING_STATUS,
  type SettingsKey,
} from "../lib/constants.js";
import type { StorageDriver } from "../lib/storage.js";
import type { MediaService } from "./media.js";
import { validateUploadFile, generateStorageKey } from "../lib/upload.js";
import { arrayBufferToBase64 } from "../lib/favicon.js";
import { ValidationError } from "../lib/errors.js";
import { isSupportedTimeZone, normalizeTimeZone } from "../lib/timezones.js";
import type { FeedKind } from "../types/constants.js";

export interface GeneralSettingsData {
  siteName: string;
  siteDescription: string;
  siteFooter: string;
  siteLanguage: string;
  showJantBrandingOnHome: boolean;
  homeDefaultView?: FeedKind;
  mainRssFeed?: FeedKind;
  headerNavMaxVisible?: string;
  timeZone: string;
}

export interface SiteSettingsData {
  siteName: string;
  siteDescription: string;
  siteFooter: string;
}

export interface SiteSettingsResult {
  displayName: string;
  siteNameChanged: boolean;
}

export interface LocaleSettingsData {
  siteLanguage: string;
  timeZone: string;
}

export interface GeneralSettingsResult {
  languageChanged: boolean;
  displayName: string;
}

export interface AvatarUploadData {
  file: { stream(): ReadableStream; name: string; type: string; size: number };
  faviconIco?: ArrayBuffer;
  appleTouchIcon?: ArrayBuffer;
}

export interface AvatarUploadDeps {
  media: MediaService;
  storage: StorageDriver;
  storageProvider: string;
  maxFileSizeMB: number;
}

export interface SettingsService {
  get(key: SettingsKey): Promise<string | null>;
  getAll(): Promise<Record<string, string>>;
  set(key: SettingsKey, value: string): Promise<void>;
  setMany(entries: Partial<Record<SettingsKey, string>>): Promise<void>;
  remove(key: SettingsKey): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
  completeOnboarding(): Promise<void>;
  updateSiteSettings(
    data: SiteSettingsData,
    opts: { fallbackSiteName: string; oldSiteName: string },
  ): Promise<SiteSettingsResult>;
  updateLocaleSettings(
    data: LocaleSettingsData,
    opts: { oldLanguage: string },
  ): Promise<{ languageChanged: boolean }>;
  updateFeedSettings(data: { mainRssFeed?: FeedKind }): Promise<void>;
  updateHomeBranding(showJantBrandingOnHome: boolean): Promise<void>;
  updateSearchSettings(
    allowIndexing: boolean,
    opts: { demoMode: boolean },
  ): Promise<void>;
  /**
   * Update general site settings with trim/set/remove logic.
   * Empty strings are removed. Default values are removed to keep the DB clean.
   *
   * @param data - Form data from the settings page
   * @param opts - Old language (for change detection) and fallback site name
   * @returns Whether the language changed and the display name for the site
   */
  updateGeneral(
    data: GeneralSettingsData,
    opts: { oldLanguage: string; fallbackSiteName: string },
  ): Promise<GeneralSettingsResult>;
  /**
   * Upload an avatar image: validates file, stores in storage, creates media record,
   * updates settings (SITE_AVATAR, SITE_FAVICON_ICO, SITE_FAVICON_APPLE_TOUCH, SITE_FAVICON_VERSION).
   *
   * @param data - Avatar file and optional favicon variants
   * @param deps - Media service and storage driver dependencies
   * @throws {ValidationError} When file validation fails
   */
  uploadAvatar(data: AvatarUploadData, deps: AvatarUploadDeps): Promise<void>;
  /**
   * Remove avatar and all favicon-related settings.
   * Deletes the apple-touch-icon from storage if it exists.
   *
   * @param storage - Optional storage driver for deleting the apple-touch-icon file
   */
  removeAvatar(storage?: StorageDriver | null): Promise<void>;
}

export function createSettingsService(db: Database): SettingsService {
  function normalizeSettingValue(key: SettingsKey, value: string): string {
    if (key !== SETTINGS_KEYS.TIME_ZONE) {
      return value;
    }

    if (!isSupportedTimeZone(value)) {
      throw new ValidationError("Choose a valid time zone.");
    }

    return normalizeTimeZone(value);
  }

  return {
    async get(key) {
      const result = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      return result[0]?.value ?? null;
    },

    async getAll() {
      const rows = await db.select().from(settings);
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    },

    async set(key, value) {
      const timestamp = now();
      const normalizedValue = normalizeSettingValue(key, value);
      await db
        .insert(settings)
        .values({ key, value: normalizedValue, updatedAt: timestamp })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: normalizedValue, updatedAt: timestamp },
        });
    },

    async remove(key) {
      await db.delete(settings).where(eq(settings.key, key));
    },

    async setMany(entries) {
      const timestamp = now();
      const pairs = (Object.keys(entries) as SettingsKey[])
        .map((key) => {
          const value = entries[key];
          return value === undefined
            ? { key, value }
            : { key, value: normalizeSettingValue(key, value) };
        })
        .filter(
          (pair): pair is { key: SettingsKey; value: string } =>
            pair.value !== undefined,
        );

      if (pairs.length === 0) return;

      const queries = pairs.map(({ key, value }) =>
        db
          .insert(settings)
          .values({ key, value, updatedAt: timestamp })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value, updatedAt: timestamp },
          }),
      );

      await db.batch(
        queries as [(typeof queries)[number], ...(typeof queries)[number][]],
      );
    },

    async isOnboardingComplete() {
      const status = await this.get(SETTINGS_KEYS.ONBOARDING_STATUS);
      return status === ONBOARDING_STATUS.COMPLETED;
    },

    async completeOnboarding() {
      await this.set(
        SETTINGS_KEYS.ONBOARDING_STATUS,
        ONBOARDING_STATUS.COMPLETED,
      );
    },

    async updateSiteSettings(data, opts) {
      const trimmedSiteName = data.siteName.trim();
      const trimmedDescription = data.siteDescription.trim();
      const trimmedFooter = data.siteFooter.trim();

      if (trimmedSiteName) {
        await this.set("SITE_NAME", trimmedSiteName);
      } else {
        await this.remove("SITE_NAME");
      }

      if (trimmedDescription) {
        await this.set("SITE_DESCRIPTION", trimmedDescription);
      } else {
        await this.remove("SITE_DESCRIPTION");
      }

      if (trimmedFooter) {
        await this.set("SITE_FOOTER", trimmedFooter);
      } else {
        await this.remove("SITE_FOOTER");
      }

      return {
        displayName: trimmedSiteName || opts.fallbackSiteName,
        siteNameChanged: opts.oldSiteName !== trimmedSiteName,
      };
    },

    async updateLocaleSettings(data, opts) {
      await this.set("SITE_LANGUAGE", data.siteLanguage);

      if (data.timeZone) {
        if (!isSupportedTimeZone(data.timeZone)) {
          throw new ValidationError("Choose a valid time zone.");
        }

        const normalizedTimeZone = normalizeTimeZone(data.timeZone);
        if (normalizedTimeZone !== "UTC") {
          await this.set("TIME_ZONE", normalizedTimeZone);
        } else {
          await this.remove("TIME_ZONE");
        }
      } else {
        await this.remove("TIME_ZONE");
      }

      return {
        languageChanged: opts.oldLanguage !== data.siteLanguage,
      };
    },

    async updateFeedSettings(data) {
      if (data.mainRssFeed !== undefined) {
        if (data.mainRssFeed === "latest") {
          await this.set("MAIN_RSS_FEED", data.mainRssFeed);
        } else {
          await this.remove("MAIN_RSS_FEED");
        }
      }
    },

    async updateHomeBranding(showJantBrandingOnHome) {
      if (showJantBrandingOnHome) {
        await this.set("SHOW_JANT_BRANDING_ON_HOME", "true");
      } else {
        await this.remove("SHOW_JANT_BRANDING_ON_HOME");
      }
    },

    async updateSearchSettings(allowIndexing, opts) {
      if (opts.demoMode || !allowIndexing) {
        await this.set("NOINDEX", "true");
      } else {
        await this.remove("NOINDEX");
      }
    },

    async updateGeneral(data, opts) {
      const { displayName } = await this.updateSiteSettings(data, {
        fallbackSiteName: opts.fallbackSiteName,
        oldSiteName: data.siteName.trim(),
      });
      await this.updateHomeBranding(data.showJantBrandingOnHome);
      const { languageChanged } = await this.updateLocaleSettings(data, {
        oldLanguage: opts.oldLanguage,
      });

      // Homepage default view: only update if provided (may be managed separately)
      if (data.homeDefaultView !== undefined) {
        if (data.homeDefaultView === "featured") {
          await this.set("HOME_DEFAULT_VIEW", data.homeDefaultView);
        } else {
          await this.remove("HOME_DEFAULT_VIEW");
        }
      }

      await this.updateFeedSettings({ mainRssFeed: data.mainRssFeed });

      // Header nav max visible: only update if provided (may be managed separately)
      if (data.headerNavMaxVisible !== undefined) {
        const navMax = parseInt(String(data.headerNavMaxVisible), 10);
        if (!isNaN(navMax) && navMax !== 2) {
          await this.set("HEADER_NAV_MAX_VISIBLE", String(navMax));
        } else {
          await this.remove("HEADER_NAV_MAX_VISIBLE");
        }
      }

      return {
        languageChanged,
        displayName,
      };
    },

    async uploadAvatar(data, deps) {
      const uploadError = validateUploadFile(data.file as unknown as File, {
        imagesOnly: true,
        maxFileSizeMB: deps.maxFileSizeMB,
      });
      if (uploadError) {
        throw new ValidationError(uploadError);
      }

      const { id, filename, storageKey } = generateStorageKey(data.file.name);

      await deps.storage.put(storageKey, data.file.stream(), {
        contentType: data.file.type,
      });

      await deps.media.create({
        id,
        filename,
        originalName: data.file.name,
        mimeType: data.file.type,
        size: data.file.size,
        storageKey,
        provider: deps.storageProvider,
      });

      await this.set("SITE_AVATAR", storageKey);

      // Store favicon ICO as base64 in settings (tiny file, accessed every page load)
      if (data.faviconIco) {
        const b64 = arrayBufferToBase64(data.faviconIco);
        await this.set("SITE_FAVICON_ICO", b64);
      }

      // Store apple-touch-icon in storage (180x180 PNG, not tiny enough for base64)
      if (data.appleTouchIcon) {
        const appleTouchKey = "favicon/apple-touch-icon.png";
        await deps.storage.put(
          appleTouchKey,
          new Uint8Array(data.appleTouchIcon),
          { contentType: "image/png" },
        );
        await this.set("SITE_FAVICON_APPLE_TOUCH", appleTouchKey);
      }

      // Set favicon version for cache-busting
      const ts = new Date();
      const version =
        String(ts.getUTCFullYear()) +
        String(ts.getUTCMonth() + 1).padStart(2, "0") +
        String(ts.getUTCDate()).padStart(2, "0") +
        String(ts.getUTCHours()).padStart(2, "0") +
        String(ts.getUTCMinutes()).padStart(2, "0");
      await this.set("SITE_FAVICON_VERSION", version);
    },

    async removeAvatar(storage) {
      const appleTouchKey = await this.get("SITE_FAVICON_APPLE_TOUCH");
      if (storage && appleTouchKey) {
        await storage.delete(appleTouchKey);
      }

      await this.remove("SITE_AVATAR");
      await this.remove("SITE_FAVICON_ICO");
      await this.remove("SITE_FAVICON_APPLE_TOUCH");
      await this.remove("SITE_FAVICON_VERSION");
    },
  };
}
