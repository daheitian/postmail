/**
 * Media Service
 *
 * Handles media upload and management with pluggable storage backends.
 */

import { eq, desc, inArray, asc, sql, and } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Database } from "../db/index.js";
import { media } from "../db/schema.js";
import { now } from "../lib/time.js";
import type { StorageDriver } from "../lib/storage.js";
import type { Media } from "../types.js";
import { MAX_MEDIA_ATTACHMENTS } from "../types.js";
import { ValidationError } from "../lib/errors.js";

export interface MediaFilters {
  limit?: number;
  /** Filter by MIME type prefix, e.g. "image/" */
  mimePrefix?: string;
}

export interface MediaService {
  getById(id: string): Promise<Media | null>;
  getByIds(ids: string[]): Promise<Media[]>;
  getByPostId(postId: number): Promise<Media[]>;
  getByPostIds(postIds: number[]): Promise<Map<number, Media[]>>;
  list(filters?: MediaFilters): Promise<Media[]>;
  create(data: CreateMediaData): Promise<Media>;
  /**
   * Validate media IDs: checks count limit and verifies all IDs exist in the database.
   * No-op when the array is empty.
   *
   * @param ids - Media IDs to validate
   * @throws {ValidationError} When count exceeds MAX_MEDIA_ATTACHMENTS or any ID is missing
   */
  validateIds(ids: string[]): Promise<void>;
  /**
   * Delete a media record and its storage file.
   *
   * @param id - Media record ID
   * @param storage - Optional storage driver; when provided the file is deleted from storage
   * @returns true if the record existed and was deleted
   */
  delete(id: string, storage?: StorageDriver | null): Promise<boolean>;
  /**
   * Delete multiple media records and their storage files.
   *
   * @param ids - Media record IDs
   * @param storage - Optional storage driver; when provided the files are deleted from storage
   */
  deleteByIds(ids: string[], storage?: StorageDriver | null): Promise<void>;
  getByStorageKey(storageKey: string): Promise<Media | null>;
  attachToPost(postId: number, mediaIds: string[]): Promise<void>;
  detachFromPost(postId: number): Promise<void>;
  updateAlt(id: string, alt: string): Promise<void>;
}

export interface CreateMediaData {
  id?: string;
  postId?: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  provider?: string;
  width?: number;
  height?: number;
  alt?: string;
  position?: number;
  blurhash?: string;
  posterKey?: string;
  summary?: string;
}

export function createMediaService(db: Database): MediaService {
  function toMedia(row: typeof media.$inferSelect): Media {
    return {
      id: row.id,
      postId: row.postId,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      storageKey: row.storageKey,
      provider: row.provider,
      width: row.width,
      height: row.height,
      alt: row.alt,
      position: row.position,
      blurhash: row.blurhash,
      posterKey: row.posterKey,
      summary: row.summary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(media)
        .where(eq(media.id, id))
        .limit(1);
      return result[0] ? toMedia(result[0]) : null;
    },

    async getByIds(ids) {
      if (ids.length === 0) return [];
      const rows = await db.select().from(media).where(inArray(media.id, ids));
      return rows.map(toMedia);
    },

    async getByPostId(postId) {
      const rows = await db
        .select()
        .from(media)
        .where(eq(media.postId, postId))
        .orderBy(asc(media.position));
      return rows.map(toMedia);
    },

    async getByPostIds(postIds) {
      const result = new Map<number, Media[]>();
      if (postIds.length === 0) return result;

      const rows = await db
        .select()
        .from(media)
        .where(inArray(media.postId, postIds))
        .orderBy(asc(media.position));

      for (const row of rows) {
        const m = toMedia(row);
        if (m.postId === null) continue;
        const list = result.get(m.postId);
        if (list) {
          list.push(m);
        } else {
          result.set(m.postId, [m]);
        }
      }

      return result;
    },

    async getByStorageKey(storageKey) {
      const result = await db
        .select()
        .from(media)
        .where(eq(media.storageKey, storageKey))
        .limit(1);
      return result[0] ? toMedia(result[0]) : null;
    },

    async list(filters?: MediaFilters) {
      const limit = filters?.limit ?? 100;
      const conditions = [];
      if (filters?.mimePrefix) {
        conditions.push(
          sql`${media.mimeType} LIKE ${filters.mimePrefix + "%"}`,
        );
      }
      const rows = await db
        .select()
        .from(media)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(media.createdAt))
        .limit(limit);
      return rows.map(toMedia);
    },

    async validateIds(ids) {
      if (ids.length === 0) return;

      if (ids.length > MAX_MEDIA_ATTACHMENTS) {
        throw new ValidationError(
          `Posts allow at most ${MAX_MEDIA_ATTACHMENTS} media attachments`,
        );
      }

      const existing = await this.getByIds(ids);
      if (existing.length !== ids.length) {
        throw new ValidationError("One or more media IDs are invalid");
      }
    },

    async create(data) {
      const id = data.id ?? uuidv7();
      const timestamp = now();

      const result = await db
        .insert(media)
        .values({
          id,
          postId: data.postId ?? null,
          filename: data.filename,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          provider: data.provider ?? "r2",
          width: data.width ?? null,
          height: data.height ?? null,
          alt: data.alt ?? null,
          position: data.position ?? 0,
          blurhash: data.blurhash ?? null,
          posterKey: data.posterKey ?? null,
          summary: data.summary ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toMedia(result[0]!);
    },

    async attachToPost(postId, mediaIds) {
      const timestamp = now();
      const clearQuery = db
        .update(media)
        .set({ postId: null, position: 0, updatedAt: timestamp })
        .where(eq(media.postId, postId));

      const validIds = mediaIds.filter((id): id is string => Boolean(id));
      if (validIds.length === 0) {
        // Only clear — single statement, no batch needed
        await clearQuery;
        return;
      }

      // Clear existing + re-attach atomically
      const attachQueries = validIds.map((mediaId, i) =>
        db
          .update(media)
          .set({ postId, position: i, updatedAt: timestamp })
          .where(eq(media.id, mediaId)),
      );
      await db.batch([clearQuery, ...attachQueries] as [
        typeof clearQuery,
        ...(typeof attachQueries)[number][],
      ]);
    },

    async detachFromPost(postId) {
      await db
        .update(media)
        .set({ postId: null, position: 0 })
        .where(eq(media.postId, postId));
    },

    async updateAlt(id, alt) {
      await db
        .update(media)
        .set({ alt, updatedAt: now() })
        .where(eq(media.id, id));
    },

    async delete(id, storage) {
      const record = await this.getById(id);
      if (!record) return false;

      if (storage) {
        await storage.delete(record.storageKey).catch((err) => {
          // eslint-disable-next-line no-console -- Error logging is intentional
          console.error("Storage delete error:", err);
        });
        if (record.posterKey) {
          await storage.delete(record.posterKey).catch((err) => {
            // eslint-disable-next-line no-console -- Error logging is intentional
            console.error("Storage delete poster error:", err);
          });
        }
      }

      await db.delete(media).where(eq(media.id, id));
      return true;
    },

    async deleteByIds(ids, storage) {
      if (ids.length === 0) return;

      if (storage) {
        const records = await this.getByIds(ids);
        const keys = records.flatMap((r) =>
          r.posterKey ? [r.storageKey, r.posterKey] : [r.storageKey],
        );
        await Promise.all(
          keys.map((key) =>
            storage.delete(key).catch((err) => {
              // eslint-disable-next-line no-console -- Error logging is intentional
              console.error("Storage delete error:", err);
            }),
          ),
        );
      }

      await db.delete(media).where(inArray(media.id, ids));
    },
  };
}
