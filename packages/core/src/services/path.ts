/**
 * Path Service
 *
 * Centralizes path ownership and resolution for posts, collections, aliases,
 * and redirects. Stored paths are normalized relative paths without a leading
 * slash (for example: "hello-world" or "c/notes").
 */

import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { pathRegistry } from "../db/schema.js";
import { now } from "../lib/time.js";
import { ConflictError } from "../lib/errors.js";
import { normalizePath } from "../lib/url.js";
import type { PathKind, PathRecord } from "../types.js";

export interface ResolvedPath extends PathRecord {
  targetType: "post" | "collection" | "redirect";
}

export interface CreatePathInput {
  path: string;
  kind: PathKind;
  postId?: string | null;
  collectionId?: string | null;
  redirectToPath?: string | null;
  redirectType?: 301 | 302 | null;
}

export interface PathService {
  getByPath(path: string): Promise<PathRecord | null>;
  resolve(path: string): Promise<ResolvedPath | null>;
  isPathAvailable(path: string, excludeId?: string): Promise<boolean>;
  getPostSlug(postId: string): Promise<string | null>;
  getCollectionSlug(collectionId: string): Promise<string | null>;
  getPostSlugMap(postIds: string[]): Promise<Map<string, string>>;
  getCollectionSlugMap(collectionIds: string[]): Promise<Map<string, string>>;
  create(input: CreatePathInput): Promise<PathRecord>;
  createPostSlug(postId: string, slug: string): Promise<PathRecord>;
  updatePostSlug(postId: string, slug: string): Promise<void>;
  createCollectionSlug(collectionId: string, slug: string): Promise<PathRecord>;
  updateCollectionSlug(collectionId: string, slug: string): Promise<void>;
  deleteByPostId(postId: string): Promise<void>;
}

export function toCollectionPath(slug: string): string {
  return normalizePath(`c/${slug}`);
}

export function fromCollectionPath(path: string): string {
  return path.startsWith("c/") ? path.slice(2) : path;
}

function isUniqueConstraintError(err: unknown): boolean {
  let current: unknown = err;
  while (current) {
    const msg = String(current);
    if (
      msg.includes("UNIQUE constraint") ||
      msg.includes("SQLITE_CONSTRAINT")
    ) {
      return true;
    }
    current =
      current instanceof Error && current.cause !== current
        ? current.cause
        : undefined;
  }
  return false;
}

export function createPathService(db: Database): PathService {
  function toPathRecord(row: typeof pathRegistry.$inferSelect): PathRecord {
    return {
      id: row.id,
      path: row.path,
      kind: row.kind as PathKind,
      postId: row.postId,
      collectionId: row.collectionId,
      redirectToPath: row.redirectToPath,
      redirectType: row.redirectType as 301 | 302 | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function normalizeStoredPath(path: string): string {
    return normalizePath(path);
  }

  async function insertPath(input: CreatePathInput): Promise<PathRecord> {
    const timestamp = now();
    const normalizedPath = normalizeStoredPath(input.path);

    try {
      const result = await db
        .insert(pathRegistry)
        .values({
          id: uuidv7(),
          path: normalizedPath,
          kind: input.kind,
          postId: input.postId ?? null,
          collectionId: input.collectionId ?? null,
          redirectToPath: input.redirectToPath
            ? normalizeStoredPath(input.redirectToPath)
            : null,
          redirectType: input.redirectType ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toPathRecord(result[0]!);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError(`Path "${normalizedPath}" is already in use`);
      }
      throw err;
    }
  }

  return {
    async getByPath(path) {
      const normalized = normalizeStoredPath(path);
      const result = await db
        .select()
        .from(pathRegistry)
        .where(eq(pathRegistry.path, normalized))
        .limit(1);
      return result[0] ? toPathRecord(result[0]) : null;
    },

    async resolve(path) {
      const record = await this.getByPath(path);
      if (!record) return null;

      const targetType =
        record.kind === "redirect"
          ? "redirect"
          : record.postId
            ? "post"
            : "collection";

      return { ...record, targetType };
    },

    async isPathAvailable(path, excludeId) {
      const normalized = normalizeStoredPath(path);
      const conditions = [eq(pathRegistry.path, normalized)];
      if (excludeId) conditions.push(ne(pathRegistry.id, excludeId));

      const result = await db
        .select({ id: pathRegistry.id })
        .from(pathRegistry)
        .where(and(...conditions))
        .limit(1);

      return result.length === 0;
    },

    async getPostSlug(postId) {
      const result = await db
        .select({ path: pathRegistry.path })
        .from(pathRegistry)
        .where(
          and(eq(pathRegistry.postId, postId), eq(pathRegistry.kind, "slug")),
        )
        .limit(1);
      return result[0]?.path ?? null;
    },

    async getCollectionSlug(collectionId) {
      const result = await db
        .select({ path: pathRegistry.path })
        .from(pathRegistry)
        .where(
          and(
            eq(pathRegistry.collectionId, collectionId),
            eq(pathRegistry.kind, "slug"),
          ),
        )
        .limit(1);
      return result[0] ? fromCollectionPath(result[0].path) : null;
    },

    async getPostSlugMap(postIds) {
      const result = new Map<string, string>();
      if (postIds.length === 0) return result;

      const rows = await db
        .select({
          postId: pathRegistry.postId,
          path: pathRegistry.path,
        })
        .from(pathRegistry)
        .where(
          and(
            inArray(pathRegistry.postId, postIds),
            eq(pathRegistry.kind, "slug"),
            isNotNull(pathRegistry.postId),
          ),
        );

      for (const row of rows) {
        if (row.postId) result.set(row.postId, row.path);
      }
      return result;
    },

    async getCollectionSlugMap(collectionIds) {
      const result = new Map<string, string>();
      if (collectionIds.length === 0) return result;

      const rows = await db
        .select({
          collectionId: pathRegistry.collectionId,
          path: pathRegistry.path,
        })
        .from(pathRegistry)
        .where(
          and(
            inArray(pathRegistry.collectionId, collectionIds),
            eq(pathRegistry.kind, "slug"),
            isNotNull(pathRegistry.collectionId),
          ),
        );

      for (const row of rows) {
        if (row.collectionId) {
          result.set(row.collectionId, fromCollectionPath(row.path));
        }
      }
      return result;
    },

    async create(input) {
      return insertPath(input);
    },

    async createPostSlug(postId, slug) {
      return insertPath({ path: slug, kind: "slug", postId });
    },

    async updatePostSlug(postId, slug) {
      const timestamp = now();
      const normalized = normalizeStoredPath(slug);

      try {
        await db
          .update(pathRegistry)
          .set({
            path: normalized,
            updatedAt: timestamp,
          })
          .where(
            and(eq(pathRegistry.postId, postId), eq(pathRegistry.kind, "slug")),
          );
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ConflictError(`Path "${normalized}" is already in use`);
        }
        throw err;
      }
    },

    async createCollectionSlug(collectionId, slug) {
      return insertPath({
        path: toCollectionPath(slug),
        kind: "slug",
        collectionId,
      });
    },

    async updateCollectionSlug(collectionId, slug) {
      const timestamp = now();
      const normalized = toCollectionPath(slug);

      try {
        await db
          .update(pathRegistry)
          .set({
            path: normalized,
            updatedAt: timestamp,
          })
          .where(
            and(
              eq(pathRegistry.collectionId, collectionId),
              eq(pathRegistry.kind, "slug"),
            ),
          );
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          throw new ConflictError(`Path "${normalized}" is already in use`);
        }
        throw err;
      }
    },

    async deleteByPostId(postId) {
      await db.delete(pathRegistry).where(eq(pathRegistry.postId, postId));
    },
  };
}
