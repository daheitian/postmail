/**
 * Nav Items API Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings, NavItemType } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { CreateNavItemSchema, ReorderSchema } from "../../lib/schemas.js";

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
  const rawBody = await c.req.json();

  const parseResult = ReorderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  await c.var.services.navItems.reorder(parseResult.data.ids);
  const items = await c.var.services.navItems.list();
  return c.json({ navItems: items });
});

// Create nav item (requires auth)
navItemsApiRoutes.post("/", requireAuthApi(), async (c) => {
  const rawBody = await c.req.json();

  const parseResult = CreateNavItemSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const body = parseResult.data;

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
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const rawBody = await c.req.json();

  const parseResult = UpdateNavItemSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const item = await c.var.services.navItems.update(id, parseResult.data);
  if (!item) return c.json({ error: "Not found" }, 404);

  return c.json(item);
});

// Delete nav item (requires auth)
navItemsApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const success = await c.var.services.navItems.delete(id);
  if (!success) return c.json({ error: "Not found" }, 404);

  return c.json({ success: true });
});
