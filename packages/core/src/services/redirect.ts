/**
 * Redirect Service
 *
 * URL redirect management for path changes
 */

import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { redirects } from "../db/schema.js";
import { now } from "../lib/time.js";
import { normalizePath } from "../lib/url.js";
import type { Redirect } from "../types.js";
import type { PathRegistryService } from "./path-registry.js";
import { ConflictError } from "../lib/errors.js";

export interface RedirectService {
  getByPath(fromPath: string): Promise<Redirect | null>;
  create(fromPath: string, toPath: string, type?: 301 | 302): Promise<Redirect>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Redirect[]>;
}

export function createRedirectService(
  db: Database,
  pathRegistry: PathRegistryService,
): RedirectService {
  function toRedirect(row: typeof redirects.$inferSelect): Redirect {
    return {
      id: row.id,
      fromPath: row.fromPath,
      toPath: row.toPath,
      type: row.type as 301 | 302,
      createdAt: row.createdAt,
    };
  }

  return {
    async getByPath(fromPath) {
      const normalized = normalizePath(fromPath);
      const result = await db
        .select()
        .from(redirects)
        .where(eq(redirects.fromPath, normalized))
        .limit(1);
      return result[0] ? toRedirect(result[0]) : null;
    },

    async create(fromPath, toPath, type = 301) {
      const id = uuidv7();
      const timestamp = now();
      const normalizedFrom = normalizePath(fromPath);

      // Check if path is claimed by a non-redirect entity
      const existingClaim = await pathRegistry.getByPath(normalizedFrom);
      if (existingClaim && existingClaim.ownerType !== "redirect") {
        throw new ConflictError(`Path "${normalizedFrom}" is already in use`);
      }

      // Delete existing redirect from this path if any (upsert behavior)
      if (existingClaim?.ownerType === "redirect") {
        await pathRegistry.release(normalizedFrom);
      }
      await db.delete(redirects).where(eq(redirects.fromPath, normalizedFrom));

      const result = await db
        .insert(redirects)
        .values({
          id,
          fromPath: normalizedFrom,
          toPath,
          type,
          createdAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      const redirect = toRedirect(result[0]!);

      await pathRegistry.claim(normalizedFrom, "redirect", redirect.id);

      return redirect;
    },

    async delete(id) {
      // Release path registry entries for this redirect
      await pathRegistry.releaseByOwner("redirect", id);
      const result = await db
        .delete(redirects)
        .where(eq(redirects.id, id))
        .returning();
      return result.length > 0;
    },

    async list() {
      const rows = await db.select().from(redirects);
      return rows.map(toRedirect);
    },
  };
}
