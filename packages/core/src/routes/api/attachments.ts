/**
 * Attachments API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { parseIdParam, assertFound } from "../../lib/errors.js";
import { ID_PREFIX } from "../../lib/ids.js";
import { requireAuthApi } from "../../middleware/auth.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const attachmentsApiRoutes = new Hono<Env>();

attachmentsApiRoutes.get("/:id/content", requireAuthApi(), async (c) => {
  const id = parseIdParam(c.req.param("id"), ID_PREFIX.media);
  const content = await c.var.services.media.getTextAttachmentContent(
    id,
    c.var.storage,
  );

  return c.json(assertFound(content, "Attachment"));
});
