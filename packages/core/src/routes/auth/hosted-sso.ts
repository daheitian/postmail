import { Hono } from "hono";
import { setSignedCookie } from "hono/cookie";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getJantCloudSsoSecret } from "../../lib/env.js";
import { DomainError, NotFoundError } from "../../lib/errors.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const DEFAULT_REDIRECT_PATH = "/settings";

function normalizeRedirectPath(path?: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return path;
}

export const hostedSsoRoutes = new Hono<Env>();

hostedSsoRoutes.get("/__sso", async (c) => {
  if (!getJantCloudSsoSecret(c.env)) {
    throw new NotFoundError("Hosted sign-in endpoint");
  }

  const token = c.req.query("token");
  if (!token) {
    return c.text("Missing sign-in token.", 400);
  }

  try {
    const result = await c.var.hostedHandoff.completeFromSignedToken({
      currentSiteId: c.var.currentSite.id,
      token,
    });

    const authContext = await c.var.auth.$context;
    await setSignedCookie(
      c,
      authContext.authCookies.sessionToken.name,
      result.sessionToken,
      authContext.secret,
      authContext.authCookies.sessionToken.attributes,
    );

    return c.redirect(
      toPublicPath(
        normalizeRedirectPath(c.req.query("redirect")),
        c.var.appConfig.sitePathPrefix,
      ),
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return c.text(
        error.message,
        error.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500,
      );
    }

    throw error;
  }
});
