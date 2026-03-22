/**
 * Global Error Handler
 *
 * Maps DomainError subclasses to HTTP responses.
 * API routes receive JSON; page routes fall through to Hono defaults.
 */

import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { DomainError, NotFoundError, ValidationError } from "../lib/errors.js";
import { dsToast } from "../lib/sse.js";

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

      return c.json(body, err.statusCode as ContentfulStatusCode);
    }

    // Unknown API error
    // eslint-disable-next-line no-console -- Server error logging is intentional
    console.error("[Jant] Unhandled error:", err);
    return c.json({ error: "Something went wrong on our end" }, 500);
  }

  // Datastar requests: return toast
  if (c.req.header("datastar-request")) {
    if (err instanceof DomainError) {
      return dsToast(err.message, "error");
    }
    // eslint-disable-next-line no-console -- Server error logging is intentional
    console.error("[Jant] Unhandled error:", err);
    return dsToast("Something went wrong. Try refreshing the page.", "error");
  }

  // JSON-accepting requests (Lit bridges)
  if (c.req.header("accept")?.includes("application/json")) {
    if (err instanceof DomainError) {
      const body: Record<string, unknown> = {
        error: err.message,
        code: err.code,
      };
      if (err instanceof ValidationError && err.details)
        body.details = err.details;
      return c.json(body, err.statusCode as ContentfulStatusCode);
    }
    // eslint-disable-next-line no-console -- Server error logging is intentional
    console.error("[Jant] Unhandled error:", err);
    return c.json({ error: "Something went wrong on our end" }, 500);
  }

  // Non-API routes: map NotFoundError to Hono's built-in 404
  if (err instanceof NotFoundError) {
    return c.notFound();
  }

  // eslint-disable-next-line no-console -- Page-route error logging is intentional
  console.error("[Jant] Unhandled page error:", err);

  // Everything else: re-throw for Hono's default handling
  throw err;
};
