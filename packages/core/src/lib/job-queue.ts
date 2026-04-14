/**
 * Job Queue abstraction.
 *
 * Provides a unified interface for enqueueing background jobs across
 * Cloudflare Workers (CF Queues) and Node/Postgres (DB-backed polling).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobKind = "github-sync-push" | "github-sync-pull";

export interface JobPayload {
  kind: JobKind;
  siteId: string;
  data: Record<string, unknown>;
}

export interface JobQueue {
  /** Enqueue a job for async background processing. */
  enqueue(payload: JobPayload): Promise<void>;
}

// ---------------------------------------------------------------------------
// Noop Queue (used when no queue backend is available)
// ---------------------------------------------------------------------------

/**
 * A no-op queue that silently drops jobs.
 * Used as a fallback when neither CF Queue nor DB queue is configured.
 */
export const noopQueue: JobQueue = {
  async enqueue() {},
};
