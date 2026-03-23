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

const ManagedSiteDomainSchema = z.object({
  host: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(255)
    .regex(
      /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
      "Domain host must be a valid hostname.",
    ),
  makePrimary: z.boolean().optional(),
});

export const internalSitesRoutes = new Hono<Env>();

function assertHostBasedMode(env: Bindings) {
  if (getSiteResolutionMode(env) !== "host-based") {
    throw new ConflictError(
      "Site provisioning is only available in host-based mode.",
    );
  }
}

internalSitesRoutes.post("/", requireInternalAdminApi(), async (c) => {
  assertHostBasedMode(c.env);

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

internalSitesRoutes.delete("/:siteId", requireInternalAdminApi(), async (c) => {
  assertHostBasedMode(c.env);

  await c.var.services.siteAdmin.deleteManagedSite(c.req.param("siteId"), {
    storage: c.var.storage,
  });

  return c.body(null, 204);
});

internalSitesRoutes.get(
  "/:siteId/media-usage",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);

    const usage = await c.var.services.siteAdmin.getManagedSiteMediaUsage(
      c.req.param("siteId"),
    );

    return c.json(usage);
  },
);

internalSitesRoutes.get(
  "/:siteId/export",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);

    const archive = await c.var.services.siteAdmin.exportManagedSite(
      c.req.param("siteId"),
      {
        env: c.env,
        storage: c.var.storage,
      },
    );

    return new Response(archive.zip, {
      headers: {
        "Content-Disposition": `attachment; filename="${archive.filename}"`,
        "Content-Length": String(archive.zip.byteLength),
        "Content-Type": "application/zip",
      },
    });
  },
);

internalSitesRoutes.post(
  "/:siteId/suspend",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const site = await c.var.services.siteAdmin.suspendManagedSite(
      c.req.param("siteId"),
    );

    return c.json({
      siteId: site.id,
      status: site.status,
    });
  },
);

internalSitesRoutes.post(
  "/:siteId/resume",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const site = await c.var.services.siteAdmin.resumeManagedSite(
      c.req.param("siteId"),
    );

    return c.json({
      siteId: site.id,
      status: site.status,
    });
  },
);

internalSitesRoutes.get(
  "/:siteId/domains",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const domains = await c.var.services.siteAdmin.listManagedSiteDomains(
      c.req.param("siteId"),
    );

    return c.json({
      domains: domains.map((domain) => ({
        host: domain.host,
        id: domain.id,
        kind: domain.kind,
        redirectToPrimary: domain.redirectToPrimary,
      })),
    });
  },
);

internalSitesRoutes.post(
  "/:siteId/domains",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const body = parseValidated(ManagedSiteDomainSchema, await c.req.json());
    const domains = await c.var.services.siteAdmin.addManagedSiteDomain(
      c.req.param("siteId"),
      body,
    );

    return c.json(
      {
        domains: domains.map((domain) => ({
          host: domain.host,
          id: domain.id,
          kind: domain.kind,
          redirectToPrimary: domain.redirectToPrimary,
        })),
      },
      201,
    );
  },
);

internalSitesRoutes.post(
  "/:siteId/domains/:domainId/primary",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const domains = await c.var.services.siteAdmin.setManagedSitePrimaryDomain(
      c.req.param("siteId"),
      c.req.param("domainId"),
    );

    return c.json({
      domains: domains.map((domain) => ({
        host: domain.host,
        id: domain.id,
        kind: domain.kind,
        redirectToPrimary: domain.redirectToPrimary,
      })),
    });
  },
);

internalSitesRoutes.delete(
  "/:siteId/domains/:domainId",
  requireInternalAdminApi(),
  async (c) => {
    assertHostBasedMode(c.env);
    const domains = await c.var.services.siteAdmin.deleteManagedSiteDomain(
      c.req.param("siteId"),
      c.req.param("domainId"),
    );

    return c.json({
      domains: domains.map((domain) => ({
        host: domain.host,
        id: domain.id,
        kind: domain.kind,
        redirectToPrimary: domain.redirectToPrimary,
      })),
    });
  },
);
