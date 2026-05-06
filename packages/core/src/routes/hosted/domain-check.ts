import { Hono } from "hono";
import { getHostedControlPlaneDomainCheckSecret } from "../../lib/env.js";
import { computeHostedVerificationToken } from "../../lib/hosted-domain-check.js";
import { NotFoundError } from "../../lib/errors.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const hostedDomainCheckRoutes = new Hono<Env>();

hostedDomainCheckRoutes.get("/.well-known/jant-verification", async (c) => {
  const secret = getHostedControlPlaneDomainCheckSecret(c.env);
  if (!secret) {
    throw new NotFoundError("Hosted domain verification endpoint");
  }

  if (!c.var.currentSiteDomain) {
    throw new NotFoundError("Hosted domain verification endpoint");
  }

  const nonce = c.req.query("nonce")?.trim();
  if (!nonce) {
    return c.text("Missing nonce.", 400);
  }

  const host = c.var.currentSiteDomain.host.trim().toLowerCase();
  const token = await computeHostedVerificationToken(secret, host, nonce);

  return c.text(`jant-verification=${token}\n`, 200, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
});
