/**
 * Password Reset Routes
 *
 * One-time token-based password reset flow.
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { msg } from "@lingui/core/macro";
import { useLingui } from "../../i18n/context.js";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { ResetPasswordSchema } from "../../lib/schemas.js";
import { buildPageTitle } from "../../lib/page-title.js";
import { getI18n } from "../../i18n/index.js";
import { getHostedControlPlaneResetUrl } from "../../lib/hosted-signin.js";
import { toPublicPath } from "../../lib/url.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const ResetContent: FC<{
  token: string;
  sitePathPrefix?: string;
}> = ({ token, sitePathPrefix = "" }) => {
  const { i18n } = useLingui();
  const signals = JSON.stringify({
    password: "",
    confirmPassword: "",
    token,
  }).replace(/</g, "\\u003c");

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {i18n._(
              msg({
                message: "Reset Password",
                comment: "@context: Password reset page heading",
              }),
            )}
          </h2>
          <p>
            {i18n._(
              msg({
                message: "Choose a new password.",
                comment: "@context: Password reset page description",
              }),
            )}
          </p>
        </header>
        <section>
          <form
            data-signals={signals}
            data-on:submit__prevent={`@post('${toPublicPath("/reset", sitePathPrefix)}')`}
            data-indicator="_loading"
            class="flex flex-col gap-4"
          >
            <div class="field">
              <label class="label">
                {i18n._(
                  msg({
                    message: "New Password",
                    comment: "@context: Password reset form field",
                  }),
                )}
              </label>
              <input
                type="password"
                data-bind="password"
                class="input"
                required
                minLength={8}
                autocomplete="new-password"
              />
            </div>
            <div class="field">
              <label class="label">
                {i18n._(
                  msg({
                    message: "Confirm Password",
                    comment: "@context: Password reset form field",
                  }),
                )}
              </label>
              <input
                type="password"
                data-bind="confirmPassword"
                class="input"
                required
                minLength={8}
                autocomplete="new-password"
              />
            </div>
            <button type="submit" class="btn" data-attr:disabled="$_loading">
              <svg
                data-show="$_loading"
                style="display:none"
                class="animate-spin size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="status"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {i18n._(
                msg({
                  message: "Reset Password",
                  comment: "@context: Password reset form submit button",
                }),
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

const ResetErrorContent: FC = () => {
  const { i18n } = useLingui();

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {i18n._(
              msg({
                message: "This Link Has Expired",
                comment: "@context: Password reset error heading",
              }),
            )}
          </h2>
        </header>
        <section>
          <p class="text-muted-foreground">
            {i18n._(
              msg({
                message:
                  "This reset link is no longer valid. Request a new one to continue.",
                comment: "@context: Password reset error description",
              }),
            )}
          </p>
        </section>
      </div>
    </div>
  );
};

export const resetRoutes = new Hono<Env>();

resetRoutes.get("/reset", async (c) => {
  const hostedResetUrl = getHostedControlPlaneResetUrl(
    c.env,
    c.var.publicRequestUrl,
  );
  if (hostedResetUrl) {
    return c.redirect(hostedResetUrl);
  }

  const title = buildPageTitle("Reset Password", c.var.appConfig.siteName);
  const token = c.req.query("token");
  if (!token) {
    return c.html(
      <BaseLayout title={title} c={c}>
        <ResetErrorContent />
      </BaseLayout>,
    );
  }

  const isValid = await c.var.services.auth.validateResetToken(token);
  if (!isValid) {
    return c.html(
      <BaseLayout title={title} c={c}>
        <ResetErrorContent />
      </BaseLayout>,
    );
  }

  return c.html(
    <BaseLayout title={title} c={c}>
      <ResetContent
        token={token}
        sitePathPrefix={c.var.appConfig.sitePathPrefix}
      />
    </BaseLayout>,
  );
});

resetRoutes.post("/reset", async (c) => {
  const i18n = getI18n(c);
  if (c.var.appConfig.demoMode) {
    return dsToast(
      i18n._(
        msg({
          message:
            "Password changes are off in demo mode. Sign in with the shared demo credentials.",
          comment:
            "@context: Error shown when password reset is blocked in demo mode",
        }),
      ),
      "error",
    );
  }

  const body = await c.req.json();
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message:
            "Something doesn't look right. Check the form and try again.",
          comment:
            "@context: Fallback validation error for password reset form",
        }),
      );
    return dsToast(errorMsg, "error");
  }

  const { password, token } = parsed.data;

  await c.var.services.auth.resetPassword(token, password);
  return dsRedirect(
    toPublicPath("/signin?reset", c.var.appConfig.sitePathPrefix),
  );
});
