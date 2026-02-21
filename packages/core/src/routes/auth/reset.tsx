/**
 * Password Reset Routes
 *
 * One-time token-based password reset flow.
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { ResetPasswordSchema } from "../../lib/schemas.js";
import { getI18n } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const ResetContent: FC<{ token: string }> = ({ token }) => {
  const { t } = useLingui();
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
            {t({
              message: "Reset Password",
              comment: "@context: Password reset page heading",
            })}
          </h2>
          <p>
            {t({
              message: "Enter your new password.",
              comment: "@context: Password reset page description",
            })}
          </p>
        </header>
        <section>
          <form
            data-signals={signals}
            data-on:submit__prevent="@post('/reset')"
            data-indicator="_loading"
            class="flex flex-col gap-4"
          >
            <div class="field">
              <label class="label">
                {t({
                  message: "New Password",
                  comment: "@context: Password reset form field",
                })}
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
                {t({
                  message: "Confirm Password",
                  comment: "@context: Password reset form field",
                })}
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
              {t({
                message: "Reset Password",
                comment: "@context: Password reset form submit button",
              })}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

const ResetErrorContent: FC = () => {
  const { t } = useLingui();

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {t({
              message: "Invalid or Expired Link",
              comment: "@context: Password reset error heading",
            })}
          </h2>
        </header>
        <section>
          <p class="text-muted-foreground">
            {t({
              message:
                "This password reset link is invalid or has expired. Please generate a new one.",
              comment: "@context: Password reset error description",
            })}
          </p>
        </section>
      </div>
    </div>
  );
};

export const resetRoutes = new Hono<Env>();

resetRoutes.get("/reset", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.html(
      <BaseLayout title="Reset Password - Jant" c={c}>
        <ResetErrorContent />
      </BaseLayout>,
    );
  }

  const isValid = await c.var.services.auth.validateResetToken(token);
  if (!isValid) {
    return c.html(
      <BaseLayout title="Reset Password - Jant" c={c}>
        <ResetErrorContent />
      </BaseLayout>,
    );
  }

  return c.html(
    <BaseLayout title="Reset Password - Jant" c={c}>
      <ResetContent token={token} />
    </BaseLayout>,
  );
});

resetRoutes.post("/reset", async (c) => {
  const i18n = getI18n(c);
  const body = await c.req.json();
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message ??
      i18n._(
        msg({
          message: "Invalid input",
          comment:
            "@context: Fallback validation error for password reset form",
        }),
      );
    return dsToast(errorMsg, "error");
  }

  const { password, token } = parsed.data;

  try {
    await c.var.services.auth.resetPassword(token, password);
    return dsRedirect("/signin?reset");
  } catch (err) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error("Password reset error:", err);
    const message =
      err instanceof Error
        ? err.message
        : i18n._(
            msg({
              message: "Failed to reset password.",
              comment: "@context: Error toast when password reset fails",
            }),
          );
    return dsToast(message, "error");
  }
});
