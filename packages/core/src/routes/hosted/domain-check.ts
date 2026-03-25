import { Hono } from "hono";
import { getHostedControlPlaneDomainCheckSecret } from "../../lib/env.js";
import { signHostedDomainCheckToken } from "../../lib/hosted-domain-check.js";
import { NotFoundError } from "../../lib/errors.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const hostedDomainCheckRoutes = new Hono<Env>();

hostedDomainCheckRoutes.get("/.well-known/jant-domain-check", async (c) => {
  const secret = getHostedControlPlaneDomainCheckSecret(c.env);
  if (!secret) {
    throw new NotFoundError("Hosted domain check endpoint");
  }

  if (!c.var.currentSiteDomain) {
    throw new NotFoundError("Hosted domain check endpoint");
  }

  const nonce = c.req.query("nonce")?.trim();
  if (!nonce) {
    return c.json({ error: "Missing nonce." }, 400);
  }

  const token = await signHostedDomainCheckToken(secret, {
    aud: "jant-cloud",
    domainId: c.var.currentSiteDomain.id,
    host: c.var.currentSiteDomain.host.trim().toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    iss: "jant-core",
    nonce,
  });

  return c.json({ token }, 200, {
    "Cache-Control": "no-store",
  });
});
