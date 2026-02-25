/**
 * Jant App Factory
 */

import { Hono } from "hono";
import { createDatabase } from "./db/index.js";
import { createServices } from "./services/index.js";
import { createAuth } from "./auth.js";
import { i18nMiddleware } from "./i18n/index.js";
import type { Bindings } from "./types.js";

// Routes - Auth
import { setupRoutes } from "./routes/auth/setup.js";
import { signinRoutes } from "./routes/auth/signin.js";
import { resetRoutes } from "./routes/auth/reset.js";

// Routes - Pages
import { homeRoutes } from "./routes/pages/home.js";
import { postRoutes } from "./routes/pages/post.js";
import { pageRoutes } from "./routes/pages/page.js";
import { collectionRoutes } from "./routes/pages/collection.js";
import { archiveRoutes } from "./routes/pages/archive.js";
import { searchRoutes } from "./routes/pages/search.js";
import { featuredRoutes } from "./routes/pages/featured.js";
import { latestRoutes } from "./routes/pages/latest.js";
import { collectionsPageRoutes } from "./routes/pages/collections.js";

// Routes - Dashboard
import { dashIndexRoutes } from "./routes/dash/index.js";
import { postsRoutes as dashPostsRoutes } from "./routes/dash/posts.js";
import { pagesRoutes as dashPagesRoutes } from "./routes/dash/pages.js";
import { mediaRoutes as dashMediaRoutes } from "./routes/dash/media.js";
import { settingsRoutes as dashSettingsRoutes } from "./routes/dash/settings.js";
import { redirectsRoutes as dashRedirectsRoutes } from "./routes/dash/redirects.js";

// Routes - API
import { postsApiRoutes } from "./routes/api/posts.js";
import { pagesApiRoutes } from "./routes/api/pages.js";
import { navItemsApiRoutes } from "./routes/api/nav-items.js";
import { collectionsApiRoutes } from "./routes/api/collections.js";
import { settingsApiRoutes } from "./routes/api/settings.js";
import { uploadApiRoutes } from "./routes/api/upload.js";
import { searchApiRoutes } from "./routes/api/search.js";
// Routes - Compose
import { composeRoutes } from "./routes/compose.js";

// Routes - Feed
import { rssRoutes } from "./routes/feed/rss.js";
import { sitemapRoutes } from "./routes/feed/sitemap.js";

// Middleware
import { requireAuth } from "./middleware/auth.js";
import { requireOnboarding } from "./middleware/onboarding.js";
import { errorHandler } from "./middleware/error-handler.js";
import { withConfig } from "./middleware/config.js";

import { createStorageDriver } from "./lib/storage.js";
import { base64ToUint8Array } from "./lib/favicon.js";
import { type AppVariables, type App } from "./types/app-context.js";

export type { AppVariables, App };

/**
 * Create a Jant application
 *
 * @returns Hono app instance
 *
 * @example
 * ```typescript
 * import { createApp } from "@jant/core";
 *
 * export default createApp();
 * ```
 */
export function createApp(): App {
  const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

  // Global error handler: maps DomainError → HTTP responses
  app.onError(errorHandler);

  // Lightweight init — no DB queries
  app.use("*", async (c, next) => {
    if (!c.env.AUTH_SECRET) {
      return c.html(
        `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Configuration Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa;color:#111}div{max-width:480px;text-align:center}h1{font-size:1.25rem;font-weight:600}p{color:#666;line-height:1.6}code{background:#eee;padding:2px 6px;border-radius:4px;font-size:.9em}</style>
</head>
<body>
<div>
<h1>AUTH_SECRET is not set</h1>
<p>Set <code>AUTH_SECRET</code> in <code>.dev.vars</code> or <code>wrangler.toml</code> to start Jant.</p>
</div>
</body>
</html>`,
        500,
      );
    }

    // Use withSession() to enable D1 Read Replication
    const session = c.env.DB.withSession();

    // Note: Drizzle ORM doesn't officially support D1DatabaseSession yet (issue #2226)
    // but it works at runtime. We use type assertion as a temporary workaround.
    const db = createDatabase(session as unknown as D1Database);
    c.set("services", createServices(db, session as unknown as D1Database));
    c.set("storage", createStorageDriver(c.env));

    const baseURL = c.env.SITE_URL || new URL(c.req.url).origin;
    const requestUrl = new URL(c.req.url);
    c.set(
      "auth",
      createAuth(session as unknown as D1Database, {
        secret: c.env.AUTH_SECRET,
        baseURL,
        useSecureCookies: requestUrl.protocol === "https:",
      }),
    );

    await next();
  });

  // --- Routes that don't need config/theme ---

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Media files from storage (path matches storage key: media/YYYY/MM/uuid.ext)
  app.get("/media/*", async (c) => {
    const storage = c.var.storage;
    if (!storage) {
      return c.notFound();
    }

    // The storage key is the full path without the leading "/"
    const storageKey = c.req.path.slice(1);
    const object = await storage.get(storageKey);
    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.contentType || "application/octet-stream",
    );
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  });

  // better-auth handler
  app.all("/api/auth/*", async (c) => {
    return c.var.auth.handler(c.req.raw);
  });

  // Favicon routes - serve from DB settings (small files, avoids R2 round-trip)
  app.get("/favicon.ico", async (c) => {
    const data = await c.var.services.settings.get("SITE_FAVICON_ICO");
    if (!data) return c.notFound();

    return new Response(base64ToUint8Array(data), {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400",
      },
    });
  });

  app.get("/apple-touch-icon.png", async (c) => {
    const storage = c.var.storage;
    const storageKey = await c.var.services.settings.get(
      "SITE_FAVICON_APPLE_TOUCH",
    );
    if (!storage || !storageKey) return c.notFound();

    const object = await storage.get(storageKey);
    if (!object) return c.notFound();

    return new Response(object.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  });

  // --- Middleware for all remaining routes ---

  // Onboarding gate — redirect to /setup if not yet initialized
  app.use("*", requireOnboarding());

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

  // Config + i18n — loads settings, resolves config/theme
  app.use("*", withConfig());
  app.use("*", i18nMiddleware());

  // --- Routes that need config ---

  // API Routes
  app.route("/api/posts", postsApiRoutes);
  app.route("/api/pages", pagesApiRoutes);
  app.route("/api/nav-items", navItemsApiRoutes);
  app.route("/api/collections", collectionsApiRoutes);
  app.route("/api/settings", settingsApiRoutes);

  // Auth routes
  app.route("/", setupRoutes);
  app.route("/", signinRoutes);
  app.route("/", resetRoutes);

  // Dashboard routes (protected)
  app.use("/dash/*", requireAuth());
  app.route("/dash", dashIndexRoutes);
  app.route("/dash/posts", dashPostsRoutes);
  app.route("/dash/pages", dashPagesRoutes);
  app.route("/dash/media", dashMediaRoutes);
  app.route("/dash/settings", dashSettingsRoutes);
  app.route("/dash/settings/redirects", dashRedirectsRoutes);
  // Protected API routes
  app.route("/api/upload", uploadApiRoutes);
  app.route("/api/search", searchApiRoutes);

  // Compose route (auth enforced in route middleware)
  app.route("/compose", composeRoutes);

  // Feed routes
  app.route("/feed", rssRoutes);
  app.route("/", sitemapRoutes);

  // Frontend routes
  app.route("/search", searchRoutes);
  app.route("/archive", archiveRoutes);
  app.route("/featured", featuredRoutes);
  app.route("/latest", latestRoutes);
  app.route("/c", collectionsPageRoutes);
  app.route("/c", collectionRoutes);
  app.route("/p", postRoutes);
  app.route("/", homeRoutes);

  // Custom page catch-all (must be last)
  app.route("/", pageRoutes);

  return app;
}
