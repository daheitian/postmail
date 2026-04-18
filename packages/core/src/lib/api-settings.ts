import { CONFIG_FIELDS, type ConfigKey } from "../types.js";
import { SETTINGS_KEYS } from "./constants.js";
import { normalizeTimeZone } from "./timezones.js";

export const demoLockedSettingKeys = new Set<ConfigKey>(["NOINDEX"]);

/** Config keys that can be modified via the settings API */
export const editableSettingKeys = Object.entries(CONFIG_FIELDS)
  .filter(
    ([, field]) => !field.envOnly && !("internal" in field && field.internal),
  )
  .map(([key]) => key as ConfigKey);

export function getEditableSettingValue(
  allSettings: Record<string, string>,
  key: ConfigKey,
): string {
  const value = allSettings[key] ?? CONFIG_FIELDS[key].defaultValue;
  return key === SETTINGS_KEYS.TIME_ZONE ? normalizeTimeZone(value) : value;
}

export function buildEditableSettingsResponse(
  allSettings: Record<string, string>,
  demoMode: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of editableSettingKeys) {
    result[key] = getEditableSettingValue(allSettings, key);
  }
  if (demoMode) {
    result.NOINDEX = "true";
  }

  return result;
}

export function partitionEditableSettingUpdates(
  updates: Record<string, string>,
  demoMode: boolean,
): {
  filteredUpdates: Partial<Record<ConfigKey, string>>;
  rejectedKeys: string[];
} {
  const filteredUpdates: Partial<Record<ConfigKey, string>> = {};
  const rejectedKeys: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const configKey = key as ConfigKey;

    if (
      demoMode &&
      editableSettingKeys.includes(configKey) &&
      demoLockedSettingKeys.has(configKey)
    ) {
      rejectedKeys.push(key);
      continue;
    }

    if (editableSettingKeys.includes(configKey)) {
      filteredUpdates[configKey] = value;
    } else {
      rejectedKeys.push(key);
    }
  }

  return {
    filteredUpdates,
    rejectedKeys,
  };
}

/**
 * Internal config keys that the site importer is allowed to write. These are
 * keys that the UI manages through dedicated flows (theme picker, custom CSS
 * editor, header toggle) but that the site export emits as plain values and
 * the importer needs to restore verbatim. Bytes-and-storage-keyed internal
 * settings (favicon/avatar blobs, storage paths) are excluded — those round
 * trip through `/api/settings/avatar`, not this route.
 */
export const importableInternalSettingKeys = [
  "THEME",
  "FONT_THEME",
  "THEME_MODE",
  "CUSTOM_CSS",
  "SHOW_HEADER_AVATAR",
] as const satisfies readonly ConfigKey[];

export function partitionImportableSettingUpdates(
  updates: Record<string, string>,
  demoMode: boolean,
): {
  filteredUpdates: Partial<Record<ConfigKey, string>>;
  rejectedKeys: string[];
} {
  const filteredUpdates: Partial<Record<ConfigKey, string>> = {};
  const rejectedKeys: string[] = [];
  const whitelist = new Set<ConfigKey>(importableInternalSettingKeys);

  for (const [key, value] of Object.entries(updates)) {
    const configKey = key as ConfigKey;

    if (
      demoMode &&
      whitelist.has(configKey) &&
      demoLockedSettingKeys.has(configKey)
    ) {
      rejectedKeys.push(key);
      continue;
    }

    if (whitelist.has(configKey)) {
      filteredUpdates[configKey] = value;
    } else {
      rejectedKeys.push(key);
    }
  }

  return {
    filteredUpdates,
    rejectedKeys,
  };
}
