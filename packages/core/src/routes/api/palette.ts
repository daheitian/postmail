/**
 * Command Palette API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const paletteApiRoutes = new Hono<Env>();

paletteApiRoutes.get("/", requireAuthApi(), async (c) => {
  const items = await c.var.services.paths.listNavigableItems();
  return c.json({ items });
});
