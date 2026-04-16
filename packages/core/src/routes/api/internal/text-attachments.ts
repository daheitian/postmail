import { Hono } from "hono";
import { z } from "zod";
import { requireInternalAdminApi } from "../../../middleware/auth.js";
import { parseValidated } from "../../../lib/schemas.js";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const MigrateEnvelopesSchema = z.object({
  limit: z.number().int().positive().max(500).optional(),
});

export const internalTextAttachmentsRoutes = new Hono<Env>();

/**
 * One-off migration endpoint: converts legacy envelope-format text attachments
 * (single JSON object wrapping `{ json, html }`) into the current split-sibling
 * layout (`.html` public artifact + `.json` Tiptap AST).
 *
 * Idempotent: rows that have already been migrated are detected by MIME and
 * skipped. Drives batches small enough to keep a single request bounded;
 * callers loop until `remaining === 0`.
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
    const body = parseValidated(MigrateEnvelopesSchema, rawBody);

    const result = await c.var.services.media.migrateEnvelopeTextAttachments({
      storage,
      storageDriver: c.var.appConfig.storageDriver,
      limit: body.limit,
    });

    return c.json(result);
  },
);
