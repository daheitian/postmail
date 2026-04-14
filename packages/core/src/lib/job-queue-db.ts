/**
 * Database-backed job queue.
 *
 * Used as a fallback when Cloudflare Queues are not available (e.g. Node/Postgres
 * or self-hosted deployments). Jobs are stored in the `sync_job` table and
 * processed via periodic polling.
 */

import { eq, and, lte, sql } from "drizzle-orm";
import type { Database } from "../db/index.js";
import type { DatabaseSchema } from "../db/schema-bundle.js";
import type { JobPayload, JobQueue } from "./job-queue.js";
import { typeidUnboxed } from "typeid-js";
import { now as unixNow } from "./time.js";

// ---------------------------------------------------------------------------
// Queue (producer)
// ---------------------------------------------------------------------------

/**
 * Create a job queue backed by a database table.
 *
 * @param db - Drizzle database instance
 * @param schema - Database schema bundle
 */
export function createDbJobQueue(
  db: Database,
  schema: DatabaseSchema,
): JobQueue {
  return {
    async enqueue(payload: JobPayload) {
      const now = unixNow();
      await db.insert(schema.syncJobs).values({
        id: typeidUnboxed("job"),
        siteId: payload.siteId,
        kind: payload.kind,
        payload: JSON.stringify(payload.data),
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
        updatedAt: now,
        lockedUntil: null,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Worker (consumer) — poll-based dequeue
// ---------------------------------------------------------------------------

export interface DbJobWorkerOptions {
  db: Database;
  schema: DatabaseSchema;
  /** Called to process each dequeued job. */
  handler: (payload: JobPayload) => Promise<void>;
  /** Lock duration in seconds. Defaults to 60. */
  lockDurationSec?: number;
}

/**
 * Dequeue and process a single pending job.
 *
 * @returns `true` if a job was processed, `false` if the queue was empty.
 */
export async function dequeueAndProcess(
  opts: DbJobWorkerOptions,
): Promise<boolean> {
  const { db, schema, handler, lockDurationSec = 60 } = opts;
  const now = unixNow();

  // Find one eligible job (pending or timed-out lock)
  const [job] = await db
    .select()
    .from(schema.syncJobs)
    .where(
      and(
        eq(schema.syncJobs.status, "pending"),
        sql`(${schema.syncJobs.lockedUntil} IS NULL OR ${schema.syncJobs.lockedUntil} <= ${now})`,
      ),
    )
    .orderBy(schema.syncJobs.createdAt)
    .limit(1);

  if (!job) return false;

  // Lock the job
  await db
    .update(schema.syncJobs)
    .set({
      status: "processing",
      lockedUntil: now + lockDurationSec,
      attempts: job.attempts + 1,
      updatedAt: now,
    })
    .where(eq(schema.syncJobs.id, job.id));

  try {
    const payload: JobPayload = {
      kind: job.kind as JobPayload["kind"],
      siteId: job.siteId,
      data: JSON.parse(job.payload) as Record<string, unknown>,
    };
    await handler(payload);

    // Mark completed
    await db
      .update(schema.syncJobs)
      .set({ status: "completed", updatedAt: unixNow() })
      .where(eq(schema.syncJobs.id, job.id));
  } catch {
    const updatedAttempts = job.attempts + 1;
    const maxAttempts = job.maxAttempts;

    await db
      .update(schema.syncJobs)
      .set({
        status: updatedAttempts >= maxAttempts ? "failed" : "pending",
        lockedUntil: null,
        updatedAt: unixNow(),
      })
      .where(eq(schema.syncJobs.id, job.id));
  }

  return true;
}

/**
 * Clean up completed and failed jobs older than the given age.
 *
 * @param maxAgeSec - Maximum age in seconds. Defaults to 7 days.
 */
export async function cleanupOldJobs(
  db: Database,
  schema: DatabaseSchema,
  maxAgeSec = 7 * 24 * 3600,
): Promise<number> {
  const cutoff = unixNow() - maxAgeSec;
  const result = await db
    .delete(schema.syncJobs)
    .where(
      and(
        sql`${schema.syncJobs.status} IN ('completed', 'failed')`,
        lte(schema.syncJobs.updatedAt, cutoff),
      ),
    );
  return (result as { rowsAffected?: number }).rowsAffected ?? 0;
}
