/**
 * Request timing helpers for structured Worker logs.
 */

export interface RequestTrace {
  traceId: string;
  method: string;
  path: string;
  colo?: string;
}

type RequestWithCf = Request & { cf?: { colo?: string } };

/**
 * Create a lightweight trace object for a single HTTP request.
 *
 * @param request - The incoming request
 * @returns Request-scoped trace metadata used in timing logs
 *
 * @example
 * ```ts
 * const trace = createRequestTrace(request);
 * logTiming(trace, "request.started");
 * ```
 */
export function createRequestTrace(request: Request): RequestTrace {
  const url = new URL(request.url);
  const cfRequest = request as RequestWithCf;

  return {
    traceId: crypto.randomUUID().slice(0, 8),
    method: request.method,
    path: url.pathname,
    colo: cfRequest.cf?.colo,
  };
}

/**
 * Return whether this request path should emit performance logs.
 *
 * We currently focus on the sign-in flow and the homepage load that follows it.
 *
 * @param path - Request pathname
 * @returns `true` when detailed timing logs should be emitted
 *
 * @example
 * ```ts
 * shouldLogRequestTiming("/signin") // true
 * shouldLogRequestTiming("/api/posts") // false
 * ```
 */
export function shouldLogRequestTiming(path: string): boolean {
  return path === "/signin" || path === "/";
}

/**
 * Compute an elapsed duration in milliseconds with one decimal place.
 *
 * @param start - Start timestamp from `Date.now()`
 * @returns Rounded elapsed duration in milliseconds
 *
 * @example
 * ```ts
 * const start = performance.now();
 * const durationMs = elapsedMs(start);
 * ```
 */
export function elapsedMs(start: number): number {
  return Math.round((Date.now() - start) * 10) / 10;
}

/**
 * Emit a structured timing log for the current request.
 *
 * @param trace - Request trace metadata
 * @param event - Short event name
 * @param fields - Extra fields to include in the log payload
 * @param level - Console level to use
 *
 * @example
 * ```ts
 * logTiming(trace, "signin.completed", { durationMs: 123.4 });
 * ```
 */
export function logTiming(
  trace: RequestTrace | null | undefined,
  event: string,
  fields: Record<string, unknown> = {},
  level: "info" | "error" = "info",
): void {
  if (!trace) {
    return;
  }

  const payload = {
    event,
    traceId: trace.traceId,
    method: trace.method,
    path: trace.path,
    ...(trace.colo ? { colo: trace.colo } : {}),
    ...fields,
  };

  if (level === "error") {
    // eslint-disable-next-line no-console -- structured request timing is intentionally emitted to Worker logs
    console.error(`[JantTiming] ${JSON.stringify(payload)}`);
    return;
  }

  // eslint-disable-next-line no-console -- structured request timing is intentionally emitted to Worker logs
  console.info(`[JantTiming] ${JSON.stringify(payload)}`);
}
