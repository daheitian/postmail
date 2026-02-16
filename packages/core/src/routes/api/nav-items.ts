/**
 * Nav Items API Routes
 */

import { Hono } from "hono";
import type { Bindings, NavItemType } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { z } from "zod";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const navItemsApiRoutes = new Hono<Env>();

const NavItemTypeSchema = z.enum(["link", "page"]);

const CreateNavItemSchema = z.object({
  type: NavItemTypeSchema,
  label: z.string().min(1),
  url: z.string().min(1),
  pageId: z.number().int().positive().optional(),
  position: z.number().int().min(0).optional(),
});

const UpdateNavItemSchema = z.object({
  type: NavItemTypeSchema.optional(),
  label: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  pageId: z.number().int().positive().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

const ReorderSchema = z.object({
  ids: z.array(z.number().int().positive()),
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
