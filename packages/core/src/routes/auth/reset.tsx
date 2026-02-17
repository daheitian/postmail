/**
 * Password Reset Routes
 *
 * One-time token-based password reset flow.
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import { hashPassword } from "better-auth/crypto";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { SETTINGS_KEYS } from "../../lib/constants.js";
import { ResetPasswordSchema } from "../../lib/schemas.js";

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
            <button type="submit" class="btn" data-attr-disabled="$_loading">
              <span data-show="!$_loading">
                {t({
                  message: "Reset Password",
                  comment: "@context: Password reset form submit button",
                })}
              </span>
              <span data-show="$_loading">
                {t({
                  message: "Processing...",
                  comment:
                    "@context: Loading text shown on submit button while request is in progress",
                })}
              </span>
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

/**
 * Validate a password reset token against the stored value.
 * Returns true if the token is valid and not expired.
 */
async function validateResetToken(
  settings: { get(key: string): Promise<string | null> },
  token: string,
): Promise<boolean> {
  const stored = await settings.get(SETTINGS_KEYS.PASSWORD_RESET_TOKEN);
  if (!stored) return false;

  const separatorIndex = stored.lastIndexOf(":");
  const storedToken = stored.substring(0, separatorIndex);
  const expiry = parseInt(stored.substring(separatorIndex + 1), 10);
  const now = Math.floor(Date.now() / 1000);

  return token === storedToken && now <= expiry;
}

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

  const isValid = await validateResetToken(c.var.services.settings, token);
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
  const body = await c.req.json();
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input";
    return dsToast(msg, "error");
  }

  const { password, token } = parsed.data;

  // Validate token
  const isValid = await validateResetToken(c.var.services.settings, token);
  if (!isValid) {
    return dsToast("Invalid or expired reset link.", "error");
  }

  try {
    const hashedPassword = await hashPassword(password);
    const db = c.env.DB.withSession() as unknown as D1Database;

    // Get admin user
    const userResult = await db
      .prepare("SELECT id FROM user LIMIT 1")
      .first<{ id: string }>();
    if (!userResult) {
      return dsToast("No user account found.", "error");
    }

    // Update password
    await db
      .prepare(
        "UPDATE account SET password = ? WHERE user_id = ? AND provider_id = 'credential'",
      )
      .bind(hashedPassword, userResult.id)
      .run();

    // Delete all sessions
    await db
      .prepare("DELETE FROM session WHERE user_id = ?")
      .bind(userResult.id)
      .run();

    // Delete the reset token
    await c.var.services.settings.remove(SETTINGS_KEYS.PASSWORD_RESET_TOKEN);

    return dsRedirect("/signin?reset");
  } catch (err) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error("Password reset error:", err);
    return dsToast("Failed to reset password.", "error");
  }
});
