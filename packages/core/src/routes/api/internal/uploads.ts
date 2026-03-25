import { Hono } from "hono";
import { z } from "zod";
import { requireInternalAdminApi } from "../../../middleware/auth.js";
import { parseValidated } from "../../../lib/schemas.js";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const CleanupUploadsSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

export const internalUploadsRoutes = new Hono<Env>();

internalUploadsRoutes.post("/cleanup", requireInternalAdminApi(), async (c) => {
  const storage = c.var.storage;
  if (!storage) {
    return c.json(
      { error: "File storage isn't set up. Check your server config." },
      500,
    );
  }

  const contentType = c.req.header("Content-Type") || "";
  const rawBody = contentType.includes("application/json")
    ? await c.req.json().catch(() => ({}))
    : {};
  const body = parseValidated(CleanupUploadsSchema, rawBody);
  const result = await c.var.services.uploads.cleanupExpired({
    storage,
    storageDriver: c.var.appConfig.storageDriver,
    limit: body.limit,
  });

  return c.json(result);
});
