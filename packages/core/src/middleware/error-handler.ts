/**
 * Global Error Handler
 *
 * Maps DomainError subclasses to HTTP responses.
 * API routes receive JSON; page routes fall through to Hono defaults.
 */

import type { ErrorHandler } from "hono";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { DomainError, NotFoundError, ValidationError } from "../lib/errors.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const errorHandler: ErrorHandler<Env> = (err, c) => {
  // API routes: always return JSON
  if (c.req.path.startsWith("/api/")) {
    if (err instanceof DomainError) {
      const body: Record<string, unknown> = {
        error: err.message,
        code: err.code,
      };

      if (err instanceof ValidationError && err.details) {
        body.details = err.details;
      }

      return c.json(body, { status: err.statusCode });
    }

    // Unknown API error
    // eslint-disable-next-line no-console -- Server error logging is intentional
    console.error("[Jant] Unhandled error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }

  // Non-API routes: map NotFoundError to Hono's built-in 404
  if (err instanceof NotFoundError) {
    return c.notFound();
  }

  // Everything else: re-throw for Hono's default handling
  throw err;
};
