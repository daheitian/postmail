/**
 * Settings API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { CONFIG_FIELDS, type ConfigKey } from "../../types.js";
import { z } from "zod";
import { parseValidated } from "../../lib/schemas.js";
import { ValidationError } from "../../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const settingsApiRoutes = new Hono<Env>();
const demoLockedKeys = new Set<ConfigKey>(["NOINDEX"]);

/** Config keys that can be modified via the settings API */
const editableKeys = Object.entries(CONFIG_FIELDS)
  .filter(([, field]) => !field.envOnly)
  .map(([key]) => key as ConfigKey);

const UpdateSettingsSchema = z.record(z.string(), z.string());

// Get all settings (requires auth)
settingsApiRoutes.get("/", requireAuthApi(), async (c) => {
  const allSettings = await c.var.services.settings.getAll();

  // Include default values for editable keys not yet stored in DB
  const result: Record<string, string> = {};
  for (const key of editableKeys) {
    result[key] = allSettings[key] ?? CONFIG_FIELDS[key].defaultValue;
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
    result[key] = allSettings[key] ?? CONFIG_FIELDS[key].defaultValue;
  }
  if (c.var.appConfig.demoMode) {
    result.NOINDEX = "true";
  }

  return c.json({
    settings: result,
    ...(rejectedKeys.length > 0 && { rejectedKeys }),
  });
});
