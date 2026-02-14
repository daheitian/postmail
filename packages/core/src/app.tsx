/**
 * Jant App Factory
 */

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { createDatabase } from "./db/index.js";
import { createServices, type Services } from "./services/index.js";
import { createAuth, type Auth } from "./auth.js";
import { i18nMiddleware } from "./i18n/index.js";
import { useLingui } from "@lingui/react/macro";
import type { Bindings, JantConfig } from "./types.js";
import { SETTINGS_KEYS } from "./lib/constants.js";
import { theme as minimalTheme } from "./themes/minimal/index.js";
import { hashPassword } from "better-auth/crypto";

// Routes - Pages
import { homeRoutes } from "./routes/pages/home.js";
import { postRoutes } from "./routes/pages/post.js";
import { pageRoutes } from "./routes/pages/page.js";
import { collectionRoutes } from "./routes/pages/collection.js";
import { archiveRoutes } from "./routes/pages/archive.js";
import { searchRoutes } from "./routes/pages/search.js";

// Routes - Dashboard
import { dashIndexRoutes } from "./routes/dash/index.js";
import { postsRoutes as dashPostsRoutes } from "./routes/dash/posts.js";
import { pagesRoutes as dashPagesRoutes } from "./routes/dash/pages.js";
import { mediaRoutes as dashMediaRoutes } from "./routes/dash/media.js";
import { settingsRoutes as dashSettingsRoutes } from "./routes/dash/settings.js";
import { redirectsRoutes as dashRedirectsRoutes } from "./routes/dash/redirects.js";
import { collectionsRoutes as dashCollectionsRoutes } from "./routes/dash/collections.js";
import { navigationRoutes as dashNavigationRoutes } from "./routes/dash/navigation.js";

// Routes - API
import { postsApiRoutes } from "./routes/api/posts.js";
import { uploadApiRoutes } from "./routes/api/upload.js";
import { searchApiRoutes } from "./routes/api/search.js";
import { timelineApiRoutes } from "./routes/api/timeline.js";

// Routes - Feed
import { rssRoutes } from "./routes/feed/rss.js";
import { sitemapRoutes } from "./routes/feed/sitemap.js";

// Middleware
import { requireAuth } from "./middleware/auth.js";
import { requireOnboarding } from "./middleware/onboarding.js";

// Layouts for auth pages
import { BaseLayout } from "./theme/layouts/index.js";
import { dsRedirect, dsToast } from "./lib/sse.js";
import { getAvailableThemes, buildThemeStyle } from "./lib/theme.js";
import { createStorageDriver, type StorageDriver } from "./lib/storage.js";

// Extend Hono's context variables
export interface AppVariables {
  services: Services;
  auth: Auth;
  config: JantConfig;
  themeStyle: string;
  storage: StorageDriver | null;
}

export type App = Hono<{ Bindings: Bindings; Variables: AppVariables }>;

/**
 * Create a Jant application
 *
 * @param config - Optional configuration
 * @returns Hono app instance
 *
 * Site settings (name, description, language) should be configured via
 * environment variables (SITE_NAME, SITE_DESCRIPTION, SITE_LANGUAGE).
 * They can also be set in the dashboard, which stores them in the database.
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 *
 * export default createApp({
 *   theme: { components: { PostPage: MyPostPage } },
 * });
 * ```
 */
export function createApp(config: JantConfig = {}): App {
  // Merge with default minimal theme
  const defaultTheme = minimalTheme();
  const resolvedConfig: JantConfig = {
    ...config,
    theme: {
      name: config.theme?.name ?? defaultTheme.name,
      components: {
        ...defaultTheme.components,
        ...config.theme?.components,
      },
      cssVariables: {
        ...defaultTheme.cssVariables,
        ...config.theme?.cssVariables,
      },
      colorThemes: config.theme?.colorThemes ?? defaultTheme.colorThemes,
      feed: config.theme?.feed,
    },
  };

  const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

  // Initialize services, auth, and config middleware
  app.use("*", async (c, next) => {
    // Use withSession() to enable D1 Read Replication
    // Automatically routes read queries to the nearest replica for lower latency
    // See: https://developers.cloudflare.com/d1/best-practices/read-replication/
    const session = c.env.DB.withSession();

    // Note: Drizzle ORM doesn't officially support D1DatabaseSession yet (issue #2226)
    // but it works at runtime. We use type assertion as a temporary workaround.
    const db = createDatabase(session as unknown as D1Database);
    const services = createServices(db, session as unknown as D1Database);
    c.set("services", services);
    c.set("config", resolvedConfig);
    c.set("storage", createStorageDriver(c.env));

    if (c.env.AUTH_SECRET) {
      const baseURL = c.env.SITE_URL || new URL(c.req.url).origin;
      const auth = createAuth(session as unknown as D1Database, {
        secret: c.env.AUTH_SECRET,
        baseURL,
      });
      c.set("auth", auth);
    }

    await next();
  });

  // Onboarding gate — redirect to /setup if not yet initialized
  app.use("*", requireOnboarding());

  // Theme middleware - resolve active color theme and build CSS
  app.use("*", async (c, next) => {
    const themeId = await c.var.services.settings.get(SETTINGS_KEYS.THEME);
    const themes = getAvailableThemes(resolvedConfig);
    const activeTheme = themeId
      ? themes.find((t) => t.id === themeId)
      : undefined;
    const themeStyle = buildThemeStyle(
      activeTheme,
      resolvedConfig.theme?.cssVariables,
    );
    c.set("themeStyle", themeStyle);
    await next();
  });

  // i18n middleware
  app.use("*", i18nMiddleware());

  // Trailing slash redirect (redirect /foo/ to /foo)
  app.use("*", async (c, next) => {
    const url = new URL(c.req.url);
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      const newUrl = url.pathname.slice(0, -1) + url.search;
      return c.redirect(newUrl, 301);
    }
    await next();
  });

  // Redirect middleware
  app.use("*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    // Skip redirect check for API routes and static assets
    if (path.startsWith("/api/") || path.startsWith("/assets/")) {
      return next();
    }

    const redirect = await c.var.services.redirects.getByPath(path);
    if (redirect) {
      return c.redirect(redirect.toPath, redirect.type);
    }

    await next();
  });

  // Health check
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      auth: c.env.AUTH_SECRET ? "configured" : "missing",
      authSecretLength: c.env.AUTH_SECRET?.length ?? 0,
    }),
  );

  // better-auth handler
  app.all("/api/auth/*", async (c) => {
    if (!c.var.auth) {
      return c.json({ error: "Auth not configured. Set AUTH_SECRET." }, 500);
    }
    return c.var.auth.handler(c.req.raw);
  });

  // API Routes
  app.route("/api/posts", postsApiRoutes);
  app.route("/api/timeline", timelineApiRoutes);

  // Setup page component
  const SetupContent: FC = () => {
    const { t } = useLingui();

    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="card max-w-md w-full">
          <header>
            <h2>
              {t({
                message: "Welcome to Jant",
                comment: "@context: Setup page welcome heading",
              })}
            </h2>
            <p>
              {t({
                message: "Create your admin account.",
                comment: "@context: Setup page description",
              })}
            </p>
          </header>
          <section>
            <form
              data-signals="{name: '', email: '', password: ''}"
              data-on:submit__prevent="@post('/setup')"
              data-indicator="_loading"
              class="flex flex-col gap-4"
            >
              <div class="field">
                <label class="label">
                  {t({
                    message: "Your Name",
                    comment: "@context: Setup form field - user name",
                  })}
                </label>
                <input
                  type="text"
                  data-bind="name"
                  class="input"
                  required
                  placeholder="John Doe"
                />
              </div>
              <div class="field">
                <label class="label">
                  {t({
                    message: "Email",
                    comment: "@context: Setup/signin form field - email",
                  })}
                </label>
                <input
                  type="email"
                  data-bind="email"
                  class="input"
                  required
                  placeholder="you@example.com"
                />
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
                  minLength={8}
                />
              </div>
              <button type="submit" class="btn" data-attr-disabled="$_loading">
                <span data-show="!$_loading">
                  {t({
                    message: "Complete Setup",
                    comment: "@context: Setup form submit button",
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

  // Setup page
  app.get("/setup", async (c) => {
    const isComplete = await c.var.services.settings.isOnboardingComplete();
    if (isComplete) return c.redirect("/");

    return c.html(
      <BaseLayout title="Setup - Jant" c={c}>
        <SetupContent />
      </BaseLayout>,
    );
  });

  app.post("/setup", async (c) => {
    const isComplete = await c.var.services.settings.isOnboardingComplete();
    if (isComplete) return c.redirect("/");

    const body = await c.req.json<{
      name: string;
      email: string;
      password: string;
    }>();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return dsToast("All fields are required", "error");
    }

    if (password.length < 8) {
      return dsToast("Password must be at least 8 characters", "error");
    }

    if (!c.var.auth) {
      return dsToast("AUTH_SECRET not configured", "error");
    }

    try {
      const signUpResponse = await c.var.auth.api.signUpEmail({
        body: { name, email, password },
      });

      if (!signUpResponse || "error" in signUpResponse) {
        return dsToast("Failed to create account", "error");
      }

      await c.var.services.settings.completeOnboarding();

      return dsRedirect("/signin?setup");
    } catch (err) {
      // eslint-disable-next-line no-console -- Error logging is intentional
      console.error("Setup error:", err);
      return dsToast("Failed to create account", "error");
    }
  });

  // Signin page component
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

  // Signin page
  app.get("/signin", async (c) => {
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

  app.post("/signin", async (c) => {
    if (!c.var.auth) {
      return dsToast("Auth not configured", "error");
    }

    const body = await c.req.json<{ email: string; password: string }>();
    const { email, password } = body;

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

  app.get("/signout", async (c) => {
    if (c.var.auth) {
      try {
        await c.var.auth.api.signOut({ headers: c.req.raw.headers });
      } catch {
        // Ignore signout errors
      }
    }
    return c.redirect("/");
  });

  // Password reset via one-time token
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

  app.get("/reset", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.html(
        <BaseLayout title="Reset Password - Jant" c={c}>
          <ResetErrorContent />
        </BaseLayout>,
      );
    }

    const stored = await c.var.services.settings.get(
      SETTINGS_KEYS.PASSWORD_RESET_TOKEN,
    );
    if (!stored) {
      return c.html(
        <BaseLayout title="Reset Password - Jant" c={c}>
          <ResetErrorContent />
        </BaseLayout>,
      );
    }

    const separatorIndex = stored.lastIndexOf(":");
    const storedToken = stored.substring(0, separatorIndex);
    const expiry = parseInt(stored.substring(separatorIndex + 1), 10);
    const now = Math.floor(Date.now() / 1000);

    if (token !== storedToken || now > expiry) {
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

  app.post("/reset", async (c) => {
    const body = await c.req.json<{
      password: string;
      confirmPassword: string;
      token: string;
    }>();
    const { password, confirmPassword, token } = body;

    // Validate token
    const stored = await c.var.services.settings.get(
      SETTINGS_KEYS.PASSWORD_RESET_TOKEN,
    );
    if (!stored) {
      return dsToast("Invalid or expired reset link.", "error");
    }

    const separatorIndex = stored.lastIndexOf(":");
    const storedToken = stored.substring(0, separatorIndex);
    const expiry = parseInt(stored.substring(separatorIndex + 1), 10);
    const now = Math.floor(Date.now() / 1000);

    if (token !== storedToken || now > expiry) {
      return dsToast("Invalid or expired reset link.", "error");
    }

    // Validate passwords
    if (!password || password.length < 8) {
      return dsToast("Password must be at least 8 characters.", "error");
    }

    if (password !== confirmPassword) {
      return dsToast("Passwords do not match.", "error");
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

  // Dashboard routes (protected)
  app.use("/dash/*", requireAuth());
  app.route("/dash", dashIndexRoutes);
  app.route("/dash/posts", dashPostsRoutes);
  app.route("/dash/pages", dashPagesRoutes);
  app.route("/dash/media", dashMediaRoutes);
  app.route("/dash/settings", dashSettingsRoutes);
  app.route("/dash/redirects", dashRedirectsRoutes);
  app.route("/dash/collections", dashCollectionsRoutes);
  app.route("/dash/navigation", dashNavigationRoutes);
  // API routes
  app.route("/api/upload", uploadApiRoutes);
  app.route("/api/search", searchApiRoutes);

  // Media files from storage (UUIDv7-based URLs with extension)
  app.get("/media/:idWithExt", async (c) => {
    const storage = c.var.storage;
    if (!storage) {
      return c.notFound();
    }

    // Extract ID from "uuid.ext" format
    const idWithExt = c.req.param("idWithExt");
    const mediaId = idWithExt.replace(/\.[^.]+$/, "");

    const media = await c.var.services.media.getById(mediaId);
    if (!media) {
      return c.notFound();
    }

    const object = await storage.get(media.storageKey);
    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    headers.set("Content-Type", object.contentType || media.mimeType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  });

  // Feed routes
  app.route("/feed", rssRoutes);
  app.route("/", sitemapRoutes);

  // Frontend routes
  app.route("/search", searchRoutes);
  app.route("/archive", archiveRoutes);
  app.route("/c", collectionRoutes);
  app.route("/p", postRoutes);
  app.route("/", homeRoutes);

  // Custom page catch-all (must be last)
  app.route("/", pageRoutes);

  return app;
}
