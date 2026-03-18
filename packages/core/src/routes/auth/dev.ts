import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getDevApiToken } from "../../lib/env.js";
import { hasValidLocalDevToken } from "../../middleware/auth.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const DEFAULT_REDIRECT_PATH = "/settings";

function normalizeRedirectPath(path?: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return path;
}

export const devAuthRoutes = new Hono<Env>();

devAuthRoutes.get("/__dev/login", async (c) => {
  const token = c.req.query("token");

  if (
    !hasValidLocalDevToken(
      c.req.url,
      c.req.header("host"),
      token,
      getDevApiToken(c.env),
    )
  ) {
    return c.notFound();
  }

  const email = c.var.appConfig.demoEmail;
  const password = c.var.appConfig.demoPassword;

  if (!email || !password) {
    return c.text(
      "Set JANT_DEMO_EMAIL and JANT_DEMO_PASSWORD before using /__dev/login.",
      500,
    );
  }

  try {
    const { headers } = await c.var.auth.api.signInEmail({
      returnHeaders: true,
      body: { email, password },
      headers: c.req.raw.headers,
    });

    const responseHeaders = new Headers(headers);
    responseHeaders.set(
      "Location",
      toPublicPath(
        normalizeRedirectPath(c.req.query("redirect")),
        c.var.appConfig.sitePathPrefix,
      ),
    );

    return new Response(null, {
      status: 302,
      headers: responseHeaders,
    });
  } catch {
    return c.text(
      "Dev login failed. Finish /setup once or run `mise run db-local-reset`, then retry.",
      500,
    );
  }
});
