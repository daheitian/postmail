import { Hono } from "hono";
import type { Bindings } from "../../../types.js";
import type { AppVariables } from "../../../types/app-context.js";
import { requireInternalAdminApi } from "../../../middleware/auth.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const internalApiTokensRoutes = new Hono<Env>();

internalApiTokensRoutes.get("/health", requireInternalAdminApi(), (c) => {
  return c.json({ ok: true });
});

internalApiTokensRoutes.post("/purge", requireInternalAdminApi(), async (c) => {
  const deleted = await c.var.services.apiTokens.deleteAll();
  return c.json({ deleted });
});
