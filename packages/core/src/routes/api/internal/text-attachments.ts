import { Hono } from "hono";
import { z } from "zod";
import { requireInternalAdminApi } from "../../../middleware/auth.js";
import { getConfiguredStorageDriver } from "../../../lib/env.js";
import { parseValidated } from "../../../lib/schemas.js";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const MigrateLegacySchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

export const internalTextAttachmentsRoutes = new Hono<Env>();

/**
 * One-off migration endpoint: converts legacy text-attachment rows to the
 * current markdown-only format. Handles both historical layouts (envelope
 * and HTML/JSON sibling pairs) in a single pass — the service method
 * dispatches on the row's stored mimeType.
 *
 * Idempotent: rows already in markdown form are detected by mimeType and
 * ignored. Callers loop until `remaining === 0`.
 *
 * Path kept as `migrate-envelopes` for backwards compatibility with the
 * existing `jant migrate-text-attachments` CLI; the endpoint now covers a
 * broader migration but the external contract is unchanged.
 */
internalTextAttachmentsRoutes.post(
  "/migrate-envelopes",
  requireInternalAdminApi(),
  async (c) => {
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
    const body = parseValidated(MigrateLegacySchema, rawBody);

    // Internal admin routes are mounted before the `withConfig` middleware,
    // so `c.var.appConfig` is undefined here. Read the driver straight from
    // env — same source `createStorageDriver` uses to build `c.var.storage`,
    // so the string we pass matches the bucket the driver writes to.
    const result = await c.var.services.media.migrateLegacyTextAttachments({
      storage,
      storageDriver: getConfiguredStorageDriver(c.env),
      limit: body.limit,
    });

    return c.json(result);
  },
);
