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
import { pageRoutes } from "./routes/pages/page.js";
import { collectionRoutes } from "./routes/pages/collection.js";
import { archiveRoutes } from "./routes/pages/archive.js";
import { searchRoutes } from "./routes/pages/search.js";
import { featuredRoutes } from "./routes/pages/featured.js";
import { latestRoutes } from "./routes/pages/latest.js";
import { collectionsPageRoutes } from "./routes/pages/collections.js";

// Routes - Settings (admin)
import { settingsRoutes } from "./routes/dash/settings.js";
import { customUrlsRoutes } from "./routes/dash/custom-urls.js";

// Routes - API
import { postsApiRoutes } from "./routes/api/posts.js";
import { navItemsApiRoutes } from "./routes/api/nav-items.js";
import { collectionsApiRoutes } from "./routes/api/collections.js";
import { settingsApiRoutes } from "./routes/api/settings.js";
import { uploadApiRoutes } from "./routes/api/upload.js";
import { multipartUploadApiRoutes } from "./routes/api/upload-multipart.js";
import { searchApiRoutes } from "./routes/api/search.js";
import { customUrlsApiRoutes } from "./routes/api/custom-urls.js";
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
    const slugIdLength = parseInt(c.env.SLUG_ID_LENGTH ?? "5", 10) || 5;
    c.set(
      "services",
      createServices(db, session as unknown as D1Database, { slugIdLength }),
    );
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

  // Fetch text media content by ID (same-origin proxy to avoid CORS with CDN URLs)
  app.get("/api/media/:id/content", async (c) => {
    const media = await c.var.services.media.getById(c.req.param("id"));
    if (!media) return c.notFound();

    const storage = c.var.storage;
    if (!storage) return c.notFound();

    const object = await storage.get(media.storageKey);
    if (!object) return c.notFound();

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.contentType || "application/octet-stream",
    );
    // Use updatedAt as ETag so browsers can cache but revalidate on change
    const etag = `"${media.updatedAt}"`;
    headers.set("Cache-Control", "public, no-cache");
    headers.set("ETag", etag);

    if (c.req.header("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { headers });
  });

  // Media files from storage (path matches storage key: media/YYYY/MM/uuid.ext)
  // Supports HTTP Range requests for seekable audio/video playback.
  app.get("/media/*", async (c) => {
    const storage = c.var.storage;
    if (!storage) {
      return c.notFound();
    }

    const storageKey = c.req.path.slice(1);
    const rangeHeader = c.req.header("Range");

    // First fetch without range to get the total size
    if (rangeHeader) {
      // Get total size via a full request first
      const full = await storage.get(storageKey);
      if (!full) return c.notFound();

      const totalSize = full.size;
      if (!totalSize) {
        // Driver doesn't report size — fall back to full response
        const headers = new Headers();
        headers.set(
          "Content-Type",
          full.contentType || "application/octet-stream",
        );
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(full.body, { headers });
      }

      // Cancel the full stream — we'll re-fetch with the range
      await full.body.cancel();

      // Parse "bytes=START-END" (END is optional)
      const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
      if (!match) {
        return new Response("Invalid Range", {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }

      const start = parseInt(match[1] ?? "0", 10);
      const end = match[2]
        ? Math.min(parseInt(match[2], 10), totalSize - 1)
        : totalSize - 1;

      if (start > end || start >= totalSize) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${totalSize}` },
        });
      }

      const rangeObj = await storage.get(storageKey, {
        range: { offset: start, length: end - start + 1 },
      });
      if (!rangeObj) return c.notFound();

      const headers = new Headers();
      headers.set(
        "Content-Type",
        rangeObj.contentType || "application/octet-stream",
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      headers.set("Content-Length", String(end - start + 1));

      return new Response(rangeObj.body, { status: 206, headers });
    }

    // No Range header — serve full file
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
    headers.set("Accept-Ranges", "bytes");
    if (object.size) {
      headers.set("Content-Length", String(object.size));
    }

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

  // Redirect middleware — only handles redirect-type custom URLs
  app.use("*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    // Skip redirect check for API routes and static assets
    if (path.startsWith("/api/") || path.startsWith("/assets/")) {
      return next();
    }

    const customUrl = await c.var.services.customUrls.getByPath(path.slice(1));
    if (customUrl?.targetType === "redirect" && customUrl.toPath) {
      return c.redirect(customUrl.toPath, customUrl.redirectType ?? 301);
    }

    await next();
  });

  // Config + i18n — loads settings, resolves config/theme
  app.use("*", withConfig());
  app.use("*", i18nMiddleware());

  // --- Routes that need config ---

  // API Routes
  app.route("/api/posts", postsApiRoutes);
  app.route("/api/nav-items", navItemsApiRoutes);
  app.route("/api/collections", collectionsApiRoutes);
  app.route("/api/settings", settingsApiRoutes);
  app.route("/api/custom-urls", customUrlsApiRoutes);

  // Auth routes
  app.route("/", setupRoutes);
  app.route("/", signinRoutes);
  app.route("/", resetRoutes);

  // Settings routes (protected)
  app.use("/settings/*", requireAuth());
  app.use("/settings", requireAuth());
  app.route("/settings/custom-urls", customUrlsRoutes);
  app.route("/settings", settingsRoutes);

  // Protected API routes (multipart must be registered before base upload)
  app.route("/api/upload/multipart", multipartUploadApiRoutes);
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
  app.route("/", homeRoutes);

  // Custom page catch-all (must be last)
  app.route("/", pageRoutes);

  return app;
}
