/**
 * Sign-in / Sign-out Routes
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../app.js";
import { BaseLayout } from "../../ui/layouts/BaseLayout.js";
import { dsRedirect, dsToast } from "../../lib/sse.js";
import { SigninSchema } from "../../lib/schemas.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

const SigninContent: FC<{
  demoEmail?: string;
  demoPassword?: string;
}> = ({ demoEmail, demoPassword }) => {
  const { t } = useLingui();
  const signals = JSON.stringify({
    email: demoEmail || "",
    password: demoPassword || "",
  }).replace(/</g, "\\u003c");

  return (
    <div class="min-h-screen flex items-center justify-center">
      <div class="card max-w-md w-full">
        <header>
          <h2>
            {t({
              message: "Sign In",
              comment: "@context: Sign in page heading",
            })}
          </h2>
        </header>
        <section>
          {demoEmail && demoPassword && (
            <p class="text-muted-foreground text-sm mb-4">
              {t({
                message: "Demo account pre-filled. Just click Sign In.",
                comment:
                  "@context: Hint shown on signin page when demo credentials are pre-filled",
              })}
            </p>
          )}
          <form
            data-signals={signals}
            data-on:submit__prevent="@post('/signin')"
            data-indicator="_loading"
            class="flex flex-col gap-4"
          >
            <div class="field">
              <label class="label">
                {t({
                  message: "Email",
                  comment: "@context: Setup/signin form field - email",
                })}
              </label>
              <input type="email" data-bind="email" class="input" required />
            </div>
            <div class="field">
              <label class="label">
                {t({
                  message: "Password",
                  comment: "@context: Setup/signin form field - password",
                })}
              </label>
              <input
                type="password"
                data-bind="password"
                class="input"
                required
              />
            </div>
            <button type="submit" class="btn" data-attr-disabled="$_loading">
              <span data-show="!$_loading">
                {t({
                  message: "Sign In",
                  comment: "@context: Sign in form submit button",
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

export const signinRoutes = new Hono<Env>();

signinRoutes.get("/signin", async (c) => {
  const isSetup = c.req.query("setup") !== undefined;
  const isReset = c.req.query("reset") !== undefined;
  let toast: { message: string } | undefined;
  if (isSetup) {
    toast = { message: "Account created successfully. Please sign in." };
  } else if (isReset) {
    toast = { message: "Password reset successfully. Please sign in." };
  }

  return c.html(
    <BaseLayout title="Sign In - Jant" c={c} toast={toast}>
      <SigninContent
        demoEmail={c.env.DEMO_EMAIL}
        demoPassword={c.env.DEMO_PASSWORD}
      />
    </BaseLayout>,
  );
});

signinRoutes.post("/signin", async (c) => {
  if (!c.var.auth) {
    return dsToast("Auth not configured", "error");
  }

  const body = await c.req.json();
  const parsed = SigninSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input";
    return dsToast(msg, "error");
  }

  const { email, password } = parsed.data;

  try {
    const { headers } = await c.var.auth.api.signInEmail({
      returnHeaders: true,
      body: { email, password },
      headers: c.req.raw.headers,
    });

    return dsRedirect("/dash", { headers });
  } catch {
    return dsToast("Invalid email or password", "error");
  }
});

signinRoutes.get("/signout", async (c) => {
  if (c.var.auth) {
    try {
      await c.var.auth.api.signOut({ headers: c.req.raw.headers });
    } catch {
      // Ignore signout errors
    }
  }
  return c.redirect("/");
});
