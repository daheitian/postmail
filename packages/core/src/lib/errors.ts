/**
 * Domain Error Classes
 *
 * Typed errors per coding-standards.md error taxonomy.
 * Services throw these; the error handler middleware maps them to HTTP responses.
 */

import { isTypeId, type IdPrefix } from "./ids.js";

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

/** Hosted media quota exceeded — 409 */
export class MediaQuotaExceededError extends DomainError {
  constructor(
    message = "This upload would exceed the shared hosted media limit.",
  ) {
    super(message, 409, "MEDIA_QUOTA_EXCEEDED");
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

/** Invalid or missing server configuration — 500 */
export class ConfigurationError extends DomainError {
  constructor(message: string) {
    super(message, 500, "CONFIGURATION_ERROR");
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
 * Validates a route parameter as a TypeID.
 * Throws ValidationError if the format is invalid.
 *
 * @param value - TypeID string from the route
 * @param prefix - Optional prefix the TypeID must match
 * @returns The validated TypeID string
 * @example
 * ```ts
 * const id = parseIdParam(c.req.param("id"), ID_PREFIX.post);
 * ```
 */
export function parseIdParam(value: string, prefix?: IdPrefix): string {
  if (!isTypeId(value, prefix)) {
    throw new ValidationError("Invalid ID");
  }
  return value;
}
