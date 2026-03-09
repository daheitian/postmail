/**
 * Custom URL Service
 *
 * Unified service replacing redirect + path-registry services.
 * Manages custom URL mappings for posts, collections, and redirects.
 */

import { desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { customUrls, posts } from "../db/schema.js";
import { now } from "../lib/time.js";
import { normalizePath } from "../lib/url.js";
import { isReservedPath } from "../lib/constants.js";
import type { CustomUrl } from "../types.js";
import { ValidationError, ConflictError } from "../lib/errors.js";

export interface CreateCustomUrl {
  path: string;
  targetType: "post" | "collection" | "redirect";
  targetId?: string;
  toPath?: string;
  redirectType?: 301 | 302;
}

export interface CustomUrlService {
  getByPath(path: string): Promise<CustomUrl | null>;
  getByTarget(
    targetType: "post" | "collection",
    targetId: string,
  ): Promise<CustomUrl | null>;
  create(data: CreateCustomUrl): Promise<CustomUrl>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  list(opts?: { limit?: number; offset?: number }): Promise<CustomUrl[]>;
  /** Check if a path is available (not used by custom_urls or posts.slug) */
  isPathAvailable(path: string): Promise<boolean>;
}

export function createCustomUrlService(db: Database): CustomUrlService {
  function toCustomUrl(row: typeof customUrls.$inferSelect): CustomUrl {
    return {
      id: row.id,
      path: row.path,
      targetType: row.targetType as CustomUrl["targetType"],
      targetId: row.targetId,
      toPath: row.toPath,
      redirectType: row.redirectType as CustomUrl["redirectType"],
      createdAt: row.createdAt,
    };
  }

  return {
    async getByPath(path) {
      const normalized = normalizePath(path);
      const result = await db
        .select()
        .from(customUrls)
        .where(eq(customUrls.path, normalized))
        .limit(1);
      return result[0] ? toCustomUrl(result[0]) : null;
    },

    async getByTarget(targetType, targetId) {
      const result = await db
        .select()
        .from(customUrls)
        .where(eq(customUrls.targetId, targetId))
        .limit(1);
      // Filter in JS since we check targetType too
      const match = result.find((r) => r.targetType === targetType);
      return match ? toCustomUrl(match) : null;
    },

    async create(data) {
      const id = uuidv7();
      const timestamp = now();
      const normalized = normalizePath(data.path);

      if (isReservedPath(normalized)) {
        throw new ValidationError(
          `Path "${normalized}" is reserved and cannot be used`,
        );
      }

      // Check uniqueness in custom_urls
      const existingCustomUrl = await this.getByPath(normalized);
      if (existingCustomUrl) {
        throw new ConflictError(`Path "${normalized}" is already in use`);
      }

      // Check cross-table uniqueness with posts.slug
      const existingPost = await db
        .select()
        .from(posts)
        .where(eq(posts.slug, normalized))
        .limit(1);
      if (existingPost.length > 0) {
        throw new ConflictError(
          `Path "${normalized}" conflicts with an existing post slug`,
        );
      }

      const result = await db
        .insert(customUrls)
        .values({
          id,
          path: normalized,
          targetType: data.targetType,
          targetId: data.targetId ?? null,
          toPath: data.toPath ?? null,
          redirectType: data.redirectType ?? null,
          createdAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toCustomUrl(result[0]!);
    },

    async delete(id) {
      const result = await db
        .delete(customUrls)
        .where(eq(customUrls.id, id))
        .returning();
      return result.length > 0;
    },

    async count() {
      const result = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(customUrls);
      return result[0]?.count ?? 0;
    },

    async list(opts) {
      let q = db
        .select()
        .from(customUrls)
        .orderBy(desc(customUrls.createdAt))
        .$dynamic();
      if (opts?.limit !== undefined) q = q.limit(opts.limit);
      if (opts?.offset !== undefined) q = q.offset(opts.offset);
      const rows = await q;
      return rows.map(toCustomUrl);
    },

    async isPathAvailable(path) {
      const normalized = normalizePath(path);
      if (isReservedPath(normalized)) return false;

      // Check custom_urls
      const existing = await db
        .select()
        .from(customUrls)
        .where(eq(customUrls.path, normalized))
        .limit(1);
      if (existing.length > 0) return false;

      // Check posts.slug
      const existingPost = await db
        .select()
        .from(posts)
        .where(eq(posts.slug, normalized))
        .limit(1);
      return existingPost.length === 0;
    },
  };
}
