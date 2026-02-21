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

export interface SettingsService {
  get(key: SettingsKey): Promise<string | null>;
  getAll(): Promise<Record<string, string>>;
  set(key: SettingsKey, value: string): Promise<void>;
  setMany(entries: Partial<Record<SettingsKey, string>>): Promise<void>;
  remove(key: SettingsKey): Promise<void>;
  isOnboardingComplete(): Promise<boolean>;
  completeOnboarding(): Promise<void>;
}

export function createSettingsService(db: Database): SettingsService {
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
      await db
        .insert(settings)
        .values({ key, value, updatedAt: timestamp })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: timestamp },
        });
    },

    async remove(key) {
      await db.delete(settings).where(eq(settings.key, key));
    },

    async setMany(entries) {
      const timestamp = now();
      const pairs = (Object.keys(entries) as SettingsKey[])
        .map((key) => ({ key, value: entries[key] }))
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
  };
}
