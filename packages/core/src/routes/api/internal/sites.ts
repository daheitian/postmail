import { Hono } from "hono";
import { z } from "zod";
import { requireInternalAdminApi } from "../../../middleware/auth.js";
import { ConflictError } from "../../../lib/errors.js";
import { parseValidated } from "../../../lib/schemas.js";
import { getSiteResolutionMode } from "../../../lib/env.js";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const CreateManagedSiteSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/,
      "Site key must use lowercase letters, numbers, or hyphens.",
    ),
  primaryHost: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(255)
    .regex(
      /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
      "Primary host must be a valid hostname.",
    ),
  siteName: z.string().trim().min(1).max(120),
});

export const internalSitesRoutes = new Hono<Env>();

internalSitesRoutes.post("/", requireInternalAdminApi(), async (c) => {
  if (getSiteResolutionMode(c.env) !== "host-based") {
    throw new ConflictError(
      "Site provisioning is only available in host-based mode.",
    );
  }

  const body = parseValidated(CreateManagedSiteSchema, await c.req.json());
  const result = await c.var.services.siteAdmin.createManagedSite(body);

  return c.json(
    {
      primaryHost: result.domain.host,
      siteId: result.site.id,
      status: result.site.status,
    },
    201,
  );
});
