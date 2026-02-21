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
import type { Media } from "../types.js";

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
  delete(id: string): Promise<boolean>;
  getByStorageKey(storageKey: string): Promise<Media | null>;
  attachToPost(postId: number, mediaIds: string[]): Promise<void>;
  detachFromPost(postId: number): Promise<void>;
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
      createdAt: row.createdAt,
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
          createdAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toMedia(result[0]!);
    },

    async attachToPost(postId, mediaIds) {
      // Clear existing attachments
      await db
        .update(media)
        .set({ postId: null, position: 0 })
        .where(eq(media.postId, postId));

      // Set new attachments with position = array index
      for (let i = 0; i < mediaIds.length; i++) {
        const mediaId = mediaIds[i];
        if (!mediaId) continue;
        await db
          .update(media)
          .set({ postId, position: i })
          .where(eq(media.id, mediaId));
      }
    },

    async detachFromPost(postId) {
      await db
        .update(media)
        .set({ postId: null, position: 0 })
        .where(eq(media.postId, postId));
    },

    async delete(id) {
      const result = await db.delete(media).where(eq(media.id, id)).returning();
      return result.length > 0;
    },
  };
}
