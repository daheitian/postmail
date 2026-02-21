/**
 * Nav Items API Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, NavItemType } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  CreateNavItemSchema,
  ReorderSchema,
  parseValidated,
} from "../../lib/schemas.js";
import { assertFound, parseIntParam, NotFoundError } from "../../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const navItemsApiRoutes = new Hono<Env>();

// API update schema extends shared schema with nullable pageId for explicit clearing
const UpdateNavItemSchema = CreateNavItemSchema.partial().extend({
  pageId: z.number().int().positive().nullable().optional(),
});

// List nav items
navItemsApiRoutes.get("/", async (c) => {
  const items = await c.var.services.navItems.list();
  return c.json({ navItems: items });
});

// Reorder nav items (requires auth) — must be before /:id
navItemsApiRoutes.put("/reorder", requireAuthApi(), async (c) => {
  const body = parseValidated(ReorderSchema, await c.req.json());

  await c.var.services.navItems.reorder(body.ids);
  const items = await c.var.services.navItems.list();
  return c.json({ navItems: items });
});

// Create nav item (requires auth)
navItemsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreateNavItemSchema, await c.req.json());

  const item = await c.var.services.navItems.create({
    type: body.type as NavItemType,
    label: body.label,
    url: body.url,
    pageId: body.pageId,
    position: body.position,
  });

  return c.json(item, 201);
});

// Update nav item (requires auth)
navItemsApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));
  const body = parseValidated(UpdateNavItemSchema, await c.req.json());

  const item = assertFound(
    await c.var.services.navItems.update(id, body),
    "Nav item",
  );

  return c.json(item);
});

// Delete nav item (requires auth)
navItemsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));

  const success = await c.var.services.navItems.delete(id);
  if (!success) throw new NotFoundError("Nav item");

  return c.json({ success: true });
});
