/**
 * Domain Error Classes
 *
 * Typed errors per coding-standards.md error taxonomy.
 * Services throw these; the error handler middleware maps them to HTTP responses.
 */

import { fromUid } from "./uid.js";

/**
 * Base class for all domain errors.
 * Each subclass maps to a specific HTTP status code.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Invalid input — 400 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

/** Not authenticated — 401 */
export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** Authenticated but not allowed — 403 */
export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

/** Resource doesn't exist — 404 */
export class NotFoundError extends DomainError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/** State conflict (e.g. duplicate) — 409 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/** Too many requests — 429 */
export class RateLimitError extends DomainError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT");
  }
}

/** Third-party failure — 500 */
export class ExternalServiceError extends DomainError {
  constructor(message: string) {
    super(message, 500, "EXTERNAL_SERVICE_ERROR");
  }
}

// =============================================================================
// Route Helpers
// =============================================================================

/**
 * Asserts a value is not null/undefined, throwing NotFoundError if it is.
 *
 * @param value - The value to check
 * @param resource - Resource name for the error message
 * @returns The non-null value
 * @example
 * ```ts
 * const post = assertFound(await services.posts.getById(id), "Post");
 * ```
 */
export function assertFound<T>(
  value: T | null | undefined,
  resource: string,
): T {
  if (value == null) {
    throw new NotFoundError(resource);
  }
  return value;
}

/**
 * Parse a route parameter as a Base58-encoded UID, returning the underlying UUID.
 * Throws ValidationError if the UID is invalid.
 *
 * @param value - Base58-encoded UID from the route
 * @returns UUID string (dash-format)
 * @example
 * ```ts
 * const id = parseIdParam(c.req.param("id"));
 * ```
 */
export function parseIdParam(value: string): string {
  const uuid = fromUid(value);
  if (!uuid) {
    throw new ValidationError("Invalid ID");
  }
  return uuid;
}
