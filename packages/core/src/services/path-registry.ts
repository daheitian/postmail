/**
 * Path Registry Service
 *
 * Central registry for URL path ownership. Every entity (page, post, redirect)
 * that claims a URL path registers it here. The table's PRIMARY KEY on path
 * provides DB-level uniqueness. Reserved system paths are rejected at the
 * service layer.
 */

import { eq, and } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { pathRegistry } from "../db/schema.js";
import { now } from "../lib/time.js";
import { normalizePath } from "../lib/url.js";
import { isReservedPath } from "../lib/constants.js";
import { ValidationError, ConflictError } from "../lib/errors.js";

export type OwnerType = "page" | "post" | "redirect";

export interface PathRegistryEntry {
  path: string;
  ownerType: OwnerType;
  ownerId: number;
  createdAt: number;
}

export interface PathRegistryService {
  /**
   * Claim a path for an entity. Rejects reserved paths and conflicts.
   * Idempotent: re-claiming the same path for the same owner is a no-op.
   *
   * @param path - The URL path to claim
   * @param ownerType - The type of entity claiming the path
   * @param ownerId - The ID of the entity claiming the path
   * @returns The registry entry
   */
  claim(
    path: string,
    ownerType: OwnerType,
    ownerId: number,
  ): Promise<PathRegistryEntry>;

  /**
   * Release a claimed path.
   *
   * @param path - The URL path to release
   */
  release(path: string): Promise<void>;

  /**
   * Release all paths owned by a specific entity.
   *
   * @param ownerType - The type of entity
   * @param ownerId - The ID of the entity
   */
  releaseByOwner(ownerType: OwnerType, ownerId: number): Promise<void>;

  /**
   * Look up a path in the registry.
   *
   * @param path - The URL path to look up
   * @returns The registry entry, or null if not claimed
   */
  getByPath(path: string): Promise<PathRegistryEntry | null>;

  /**
   * Check if a path is available (not reserved and not claimed).
   *
   * @param path - The URL path to check
   * @returns true if the path is available
   */
  isAvailable(path: string): Promise<boolean>;
}

export function createPathRegistryService(db: Database): PathRegistryService {
  function toEntry(row: typeof pathRegistry.$inferSelect): PathRegistryEntry {
    return {
      path: row.path,
      ownerType: row.ownerType as OwnerType,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
    };
  }

  return {
    async claim(path, ownerType, ownerId) {
      const normalized = normalizePath(path);

      if (isReservedPath(normalized)) {
        throw new ValidationError(
          `Path "${normalized}" is reserved and cannot be used`,
        );
      }

      // Check existing claim
      const existing = await db
        .select()
        .from(pathRegistry)
        .where(eq(pathRegistry.path, normalized))
        .limit(1);

      if (existing[0]) {
        const entry = toEntry(existing[0]);
        // Idempotent: same owner re-claiming is a no-op
        if (entry.ownerType === ownerType && entry.ownerId === ownerId) {
          return entry;
        }
        throw new ConflictError(`Path "${normalized}" is already in use`);
      }

      const timestamp = now();
      await db.insert(pathRegistry).values({
        path: normalized,
        ownerType,
        ownerId,
        createdAt: timestamp,
      });

      return { path: normalized, ownerType, ownerId, createdAt: timestamp };
    },

    async release(path) {
      const normalized = normalizePath(path);
      await db.delete(pathRegistry).where(eq(pathRegistry.path, normalized));
    },

    async releaseByOwner(ownerType, ownerId) {
      await db
        .delete(pathRegistry)
        .where(
          and(
            eq(pathRegistry.ownerType, ownerType),
            eq(pathRegistry.ownerId, ownerId),
          ),
        );
    },

    async getByPath(path) {
      const normalized = normalizePath(path);
      const result = await db
        .select()
        .from(pathRegistry)
        .where(eq(pathRegistry.path, normalized))
        .limit(1);
      return result[0] ? toEntry(result[0]) : null;
    },

    async isAvailable(path) {
      const normalized = normalizePath(path);
      if (isReservedPath(normalized)) return false;

      const existing = await db
        .select()
        .from(pathRegistry)
        .where(eq(pathRegistry.path, normalized))
        .limit(1);
      return existing.length === 0;
    },
  };
}
