/**
 * Pages API Routes
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { z } from "zod";
import { StatusSchema } from "../../lib/schemas.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pagesApiRoutes = new Hono<Env>();

const CreatePageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  body: z.string().optional(),
  status: StatusSchema.optional(),
});

const UpdatePageSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  status: StatusSchema.optional(),
});

// List pages
pagesApiRoutes.get("/", async (c) => {
  const pages = await c.var.services.pages.list();
  return c.json({ pages });
});

// Get single page
pagesApiRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const page = await c.var.services.pages.getById(id);
  if (!page) return c.json({ error: "Not found" }, 404);

  return c.json(page);
});

// Create page (requires auth)
pagesApiRoutes.post("/", requireAuthApi(), async (c) => {
  const rawBody = await c.req.json();

  const parseResult = CreatePageSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const body = parseResult.data;

  const page = await c.var.services.pages.create({
    slug: body.slug,
    title: body.title,
    body: body.body,
    status: body.status,
  });

  return c.json(page, 201);
});

// Update page (requires auth)
pagesApiRoutes.put("/:id", requireAuthApi(), async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const rawBody = await c.req.json();

  const parseResult = UpdatePageSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      400,
    );
  }

  const page = await c.var.services.pages.update(id, parseResult.data);
  if (!page) return c.json({ error: "Not found" }, 404);

  return c.json(page);
});

// Delete page (requires auth)
pagesApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

  const success = await c.var.services.pages.delete(id);
  if (!success) return c.json({ error: "Not found" }, 404);

  return c.json({ success: true });
});
