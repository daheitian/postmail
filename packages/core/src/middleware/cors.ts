/**
 * CORS Middleware
 *
 * Allows cross-origin API requests from Chrome extensions.
 * Applied to `/api/*` routes only.
 */

import { cors } from "hono/cors";

/**
 * Creates CORS middleware that allows Chrome extension origins.
 *
 * @returns Hono CORS middleware configured for extension access
 *
 * @example
 * ```ts
 * app.use("/api/*", extensionCors());
 * ```
 */
export function extensionCors() {
  return cors({
    origin: (origin) => {
      if (origin.startsWith("chrome-extension://")) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400,
  });
}
