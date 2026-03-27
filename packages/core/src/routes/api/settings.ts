/**
 * Settings API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { CONFIG_FIELDS, type ConfigKey } from "../../types.js";
import { z } from "zod";
import { now } from "../../lib/time.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { parseValidated } from "../../lib/schemas.js";
import { ValidationError } from "../../lib/errors.js";
import { syncHostedControlPlaneSiteAvatar } from "../../lib/hosted-control-plane-sync.js";
import { normalizeTimeZone } from "../../lib/timezones.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsApiRoutes = new Hono<Env>();
const demoLockedKeys = new Set<ConfigKey>(["NOINDEX"]);

/** Config keys that can be modified via the settings API */
const editableKeys = Object.entries(CONFIG_FIELDS)
  .filter(
    ([, field]) => !field.envOnly && !("internal" in field && field.internal),
  )
  .map(([key]) => key as ConfigKey);

const UpdateSettingsSchema = z.record(z.string(), z.string());

function getEditableSettingValue(
  allSettings: Record<string, string>,
  key: ConfigKey,
): string {
  const value = allSettings[key] ?? CONFIG_FIELDS[key].defaultValue;
  return key === SETTINGS_KEYS.TIME_ZONE ? normalizeTimeZone(value) : value;
}

// Get all settings (requires auth)
settingsApiRoutes.get("/", requireAuthApi(), async (c) => {
  const allSettings = await c.var.services.settings.getAll();

  // Include default values for editable keys not yet stored in DB
  const result: Record<string, string> = {};
  for (const key of editableKeys) {
    result[key] = getEditableSettingValue(allSettings, key);
  }
  if (c.var.appConfig.demoMode) {
    result.NOINDEX = "true";
  }

  return c.json({ settings: result });
});

// Update settings (requires auth)
settingsApiRoutes.put("/", requireAuthApi(), async (c) => {
  const updates = parseValidated(UpdateSettingsSchema, await c.req.json());

  // Filter to only editable keys
  const filteredUpdates: Partial<Record<ConfigKey, string>> = {};
  const rejectedKeys: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const configKey = key as ConfigKey;

    if (
      c.var.appConfig.demoMode &&
      editableKeys.includes(configKey) &&
      demoLockedKeys.has(configKey)
    ) {
      rejectedKeys.push(key);
      continue;
    }

    if (editableKeys.includes(configKey)) {
      filteredUpdates[key as ConfigKey] = value;
    } else {
      rejectedKeys.push(key);
    }
  }

  if (rejectedKeys.length > 0 && Object.keys(filteredUpdates).length === 0) {
    const message = c.var.appConfig.demoMode
      ? "Demo mode locks these settings"
      : "None of the provided keys are editable";
    throw new ValidationError(message, { rejectedKeys });
  }

  if (Object.keys(filteredUpdates).length > 0) {
    await c.var.services.settings.setMany(filteredUpdates as never);
  }

  // Return updated state
  const allSettings = await c.var.services.settings.getAll();
  const result: Record<string, string> = {};
  for (const key of editableKeys) {
    result[key] = getEditableSettingValue(allSettings, key);
  }
  if (c.var.appConfig.demoMode) {
    result.NOINDEX = "true";
  }

  return c.json({
    settings: result,
    ...(rejectedKeys.length > 0 && { rejectedKeys }),
  });
});

settingsApiRoutes.post(
  "/discovery/compose-open-shortcut",
  requireAuthApi(),
  async (c) => {
    const existing = await c.var.services.settings.get(
      SETTINGS_KEYS.DISCOVERY_COMPOSE_OPEN_SHORTCUT_AT,
    );

    if (!existing) {
      await c.var.services.settings.set(
        SETTINGS_KEYS.DISCOVERY_COMPOSE_OPEN_SHORTCUT_AT,
        String(now()),
      );
    }

    return c.json({ learned: true }, existing ? 200 : 201);
  },
);

// Upload site avatar (requires auth)
settingsApiRoutes.post("/avatar", requireAuthApi(), async (c) => {
  const storage = c.var.storage;
  if (!storage) {
    return c.json(
      { error: "File storage isn't set up. Check your server config." },
      500,
    );
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return c.json({ error: "No file selected. Choose a file to upload." }, 400);
  }

  const faviconFile = formData.get("favicon") as File | null;
  const appleTouchFile = formData.get("appleTouch") as File | null;

  try {
    await c.var.services.settings.uploadAvatar(
      {
        file,
        faviconIco: faviconFile ? await faviconFile.arrayBuffer() : undefined,
        appleTouchIcon: appleTouchFile
          ? await appleTouchFile.arrayBuffer()
          : undefined,
      },
      {
        media: c.var.services.media,
        storage,
        storageProvider: c.var.appConfig.storageDriver,
        maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
      },
    );
    try {
      await syncHostedControlPlaneSiteAvatar({
        appConfig: c.var.appConfig,
        env: c.env,
        settings: c.var.services.settings,
        siteId: c.var.currentSite.id,
      });
    } catch (error) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error(
        "[Jant] Failed to sync hosted control plane avatar metadata:",
        error,
      );
    }

    return c.json({ success: true }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }
    return c.json(
      { error: "Upload didn't go through. Try again in a moment." },
      500,
    );
  }
});

// Remove site avatar (requires auth)
settingsApiRoutes.delete("/avatar", requireAuthApi(), async (c) => {
  await c.var.services.settings.removeAvatar(c.var.storage);
  try {
    await syncHostedControlPlaneSiteAvatar({
      appConfig: c.var.appConfig,
      env: c.env,
      settings: c.var.services.settings,
      siteId: c.var.currentSite.id,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error(
      "[Jant] Failed to sync hosted control plane avatar metadata:",
      error,
    );
  }
  return c.json({ success: true });
});
