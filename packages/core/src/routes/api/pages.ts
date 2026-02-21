/**
 * Pages API Routes
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  CreatePageSchema,
  StatusSchema,
  parseValidated,
} from "../../lib/schemas.js";
import { assertFound, parseIntParam, NotFoundError } from "../../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const pagesApiRoutes = new Hono<Env>();

// API update schema extends shared schema with nullable fields for explicit clearing
const UpdatePageSchema = CreatePageSchema.partial().extend({
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
  const id = parseIntParam(c.req.param("id"));
  const page = assertFound(await c.var.services.pages.getById(id), "Page");
  return c.json(page);
});

// Create page (requires auth)
pagesApiRoutes.post("/", requireAuthApi(), async (c) => {
  const body = parseValidated(CreatePageSchema, await c.req.json());

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
  const id = parseIntParam(c.req.param("id"));
  const body = parseValidated(UpdatePageSchema, await c.req.json());

  const page = assertFound(await c.var.services.pages.update(id, body), "Page");

  return c.json(page);
});

// Delete page (requires auth)
pagesApiRoutes.delete("/:id", requireAuthApi(), async (c) => {
  const id = parseIntParam(c.req.param("id"));

  const success = await c.var.services.pages.delete(id);
  if (!success) throw new NotFoundError("Page");

  return c.json({ success: true });
});
