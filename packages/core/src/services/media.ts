/**
 * Media Service
 *
 * Handles media upload and management with pluggable storage backends.
 */

import { eq, desc, inArray, asc, sql, and } from "drizzle-orm";
import { generateKeyBetween } from "fractional-indexing";
import { type Database, supportsDrizzleTransaction } from "../db/index.js";
import type { DatabaseDialect } from "../db/dialect.js";
import {
  sqliteSchemaBundle,
  type DatabaseSchema,
} from "../db/schema-bundle.js";
import { createEntityId } from "../lib/ids.js";
import { markdownToTiptapJson } from "../lib/markdown-to-tiptap.js";
import { extractBodyText } from "../lib/summary.js";
import { now } from "../lib/time.js";
import type { StorageDriver } from "../lib/storage.js";
import { renderTiptapJson } from "../lib/tiptap-render.js";
import { tiptapJsonToMarkdown } from "../lib/tiptap-to-markdown.js";
import {
  generateStorageKey,
  toMediaKind,
  validateUploadFileMetadata,
} from "../lib/upload.js";
import type {
  Media,
  MediaKind,
  TextAttachmentContent,
  TextAttachmentContentFormat,
} from "../types.js";
import {
  MAX_MEDIA_ATTACHMENTS,
  MEDIA_KINDS,
  STORAGE_DRIVERS,
} from "../types.js";
import { ConfigurationError, ValidationError } from "../lib/errors.js";

const DEFAULT_MEDIA_POSITION = "a0";
const ATTACHED_TEXT_MIME_TYPE = "text/x-tiptap+json";
const ATTACHED_TEXT_FILENAME = "attached-text.md";

function ensureAllowedMediaValue<T extends string>(
  value: string,
  allowed: readonly T[],
  message: string,
  ErrorCtor: new (message: string) => Error = ValidationError,
): T {
  if ((allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new ErrorCtor(message);
}

function ensureStorageProvider(
  value: string,
  ErrorCtor: new (message: string) => Error = ValidationError,
): string {
  return ensureAllowedMediaValue(
    value,
    STORAGE_DRIVERS,
    "Storage provider must be r2, s3, or local.",
    ErrorCtor,
  );
}

function ensureMediaKind(
  value: string,
  ErrorCtor: new (message: string) => Error = ValidationError,
): MediaKind {
  return ensureAllowedMediaValue(
    value,
    MEDIA_KINDS,
    "Media kind must be image, video, audio, text, or document.",
    ErrorCtor,
  );
}

export interface MediaFilters {
  limit?: number;
  /** Filter by MIME type prefix, e.g. "image/" */
  mimePrefix?: string;
}

export interface CreateTextAttachmentData {
  contentFormat: TextAttachmentContentFormat;
  content: string;
  summary?: string;
}

export interface TextAttachmentDeps {
  storage?: StorageDriver | null;
  storageDriver: string;
  maxFileSizeMB: number;
}

export interface MediaService {
  getById(id: string): Promise<Media | null>;
  getByIds(ids: string[]): Promise<Media[]>;
  getByPostId(postId: string): Promise<Media[]>;
  getByPostIds(postIds: string[]): Promise<Map<string, Media[]>>;
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
  getByStorageKey(storageKey: string, provider: string): Promise<Media | null>;
  createTextAttachment(
    data: CreateTextAttachmentData,
    deps: TextAttachmentDeps,
  ): Promise<Media>;
  getTextAttachmentContent(
    id: string,
    storage?: StorageDriver | null,
  ): Promise<TextAttachmentContent | null>;
  attachToPost(postId: string, mediaIds: string[]): Promise<void>;
  detachFromPost(postId: string): Promise<void>;
  updateAlt(id: string, alt: string): Promise<void>;
}

export interface CreateMediaData {
  id?: string;
  postId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  provider?: string;
  width?: number;
  height?: number;
  alt?: string;
  position?: string;
  blurhash?: string;
  waveform?: string;
  posterKey?: string;
  summary?: string;
  chars?: number;
  mediaKind?: MediaKind;
}

export function createMediaService(
  db: Database,
  siteId: string,
  databaseSchema: DatabaseSchema = sqliteSchemaBundle,
  databaseDialect: DatabaseDialect = "sqlite",
): MediaService {
  const { media } = databaseSchema;

  async function getLastPosition(postId: string): Promise<string | null> {
    const rows = await db
      .select({ position: media.position })
      .from(media)
      .where(and(eq(media.siteId, siteId), eq(media.postId, postId)))
      .orderBy(sql`${media.position} DESC`)
      .limit(1);
    return rows[0]?.position ?? null;
  }

  function buildSequentialPositions(count: number): string[] {
    const positions: string[] = [];
    let previous: string | null = null;

    for (let i = 0; i < count; i += 1) {
      previous = generateKeyBetween(previous, null);
      positions.push(previous);
    }

    return positions;
  }

  function toMedia(row: typeof media.$inferSelect): Media {
    return {
      id: row.id,
      siteId: row.siteId,
      postId: row.postId,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      storageKey: row.storageKey,
      provider: ensureStorageProvider(row.provider, Error),
      width: row.width,
      height: row.height,
      alt: row.alt,
      position: row.position,
      blurhash: row.blurhash,
      waveform: row.waveform,
      posterKey: row.posterKey,
      summary: row.summary,
      chars: row.chars,
      mediaKind: ensureMediaKind(row.mediaKind, Error),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async getById(id) {
      const result = await db
        .select()
        .from(media)
        .where(and(eq(media.siteId, siteId), eq(media.id, id)))
        .limit(1);
      return result[0] ? toMedia(result[0]) : null;
    },

    async getByIds(ids) {
      if (ids.length === 0) return [];
      const rows = await db
        .select()
        .from(media)
        .where(and(eq(media.siteId, siteId), inArray(media.id, ids)));
      return rows.map(toMedia);
    },

    async getByPostId(postId) {
      const rows = await db
        .select()
        .from(media)
        .where(and(eq(media.siteId, siteId), eq(media.postId, postId)))
        .orderBy(asc(media.position));
      return rows.map(toMedia);
    },

    async getByPostIds(postIds) {
      const result = new Map<string, Media[]>();
      if (postIds.length === 0) return result;

      const rows = await db
        .select()
        .from(media)
        .where(and(eq(media.siteId, siteId), inArray(media.postId, postIds)))
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

    async getByStorageKey(storageKey, provider) {
      const result = await db
        .select()
        .from(media)
        .where(
          and(
            eq(media.siteId, siteId),
            eq(media.storageKey, storageKey),
            eq(media.provider, provider),
          ),
        )
        .limit(1);
      return result[0] ? toMedia(result[0]) : null;
    },

    async list(filters?: MediaFilters) {
      const limit = filters?.limit ?? 100;
      const conditions = [eq(media.siteId, siteId)];
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
          `Posts allow at most ${MAX_MEDIA_ATTACHMENTS} attachments`,
        );
      }

      const existing = await this.getByIds(ids);
      if (existing.length !== ids.length) {
        throw new ValidationError(
          "One or more attachments reference invalid media IDs",
        );
      }
    },

    async create(data) {
      const id = data.id ?? createEntityId("media");
      const timestamp = now();
      const provider = ensureStorageProvider(data.provider ?? "r2");
      const mediaKind = ensureMediaKind(
        data.mediaKind ?? toMediaKind(data.mimeType),
      );
      const lastPosition =
        data.position === undefined && data.postId
          ? await getLastPosition(data.postId)
          : null;

      const result = await db
        .insert(media)
        .values({
          id,
          siteId,
          postId: data.postId ?? null,
          filename: data.filename,
          originalName: data.originalName,
          mimeType: data.mimeType,
          size: data.size,
          storageKey: data.storageKey,
          provider,
          width: data.width ?? null,
          height: data.height ?? null,
          alt: data.alt ?? null,
          position:
            data.position ??
            (data.postId
              ? generateKeyBetween(lastPosition, null)
              : DEFAULT_MEDIA_POSITION),
          blurhash: data.blurhash ?? null,
          waveform: data.waveform ?? null,
          posterKey: data.posterKey ?? null,
          summary: data.summary ?? null,
          chars: data.chars ?? null,
          mediaKind,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- DB insert with .returning() always returns inserted row
      return toMedia(result[0]!);
    },

    async createTextAttachment(data, deps) {
      if (!deps.storage) {
        throw new ConfigurationError(
          "File storage isn't set up. Check your server config.",
        );
      }
      if (data.contentFormat !== "markdown") {
        throw new ValidationError("Unsupported text attachment format");
      }

      const bodyJson = markdownToTiptapJson(data.content);
      const bodyHtml = renderTiptapJson(bodyJson);
      const bodyText = extractBodyText(bodyJson) ?? "";
      const summary = data.summary?.trim() || bodyText.slice(0, 100).trim();
      const envelope = JSON.stringify({
        json: JSON.parse(bodyJson) as unknown,
        html: bodyHtml,
      });
      const bytes = new TextEncoder().encode(envelope);
      const uploadError = validateUploadFileMetadata(
        ATTACHED_TEXT_MIME_TYPE,
        bytes.byteLength,
        {
          maxFileSizeMB: deps.maxFileSizeMB,
        },
      );
      if (uploadError) {
        throw new ValidationError(uploadError);
      }

      const { id, filename, storageKey } = generateStorageKey(
        siteId,
        ATTACHED_TEXT_FILENAME,
      );
      await deps.storage.put(storageKey, bytes, {
        contentType: ATTACHED_TEXT_MIME_TYPE,
      });

      return this.create({
        id,
        filename,
        originalName: ATTACHED_TEXT_FILENAME,
        mimeType: ATTACHED_TEXT_MIME_TYPE,
        size: bytes.byteLength,
        storageKey,
        provider: deps.storageDriver,
        summary: summary || undefined,
        chars: bodyText.length,
        mediaKind: "text",
      });
    },

    async getTextAttachmentContent(id, storage) {
      const record = await this.getById(id);
      if (!record || record.mimeType !== ATTACHED_TEXT_MIME_TYPE) {
        return null;
      }
      if (!storage) {
        throw new ConfigurationError(
          "File storage isn't set up. Check your server config.",
        );
      }

      const object = await storage.get(record.storageKey);
      if (!object) return null;

      const raw = await new Response(object.body).text();
      const envelope = JSON.parse(raw) as { json?: unknown };
      const json = envelope.json ? JSON.stringify(envelope.json) : "";

      return {
        id: record.id,
        type: "text",
        contentFormat: "markdown",
        content: tiptapJsonToMarkdown(json),
        summary: record.summary,
        chars: record.chars,
      };
    },

    async attachToPost(postId, mediaIds) {
      const timestamp = now();
      const clearQuery = db
        .update(media)
        .set({
          postId: null,
          position: DEFAULT_MEDIA_POSITION,
          updatedAt: timestamp,
        })
        .where(and(eq(media.siteId, siteId), eq(media.postId, postId)));

      const validIds = mediaIds.filter((id): id is string => Boolean(id));
      if (validIds.length === 0) {
        // Only clear — single statement, no batch needed
        await clearQuery;
        return;
      }

      const positions = buildSequentialPositions(validIds.length);

      // Clear existing + re-attach atomically
      if (!supportsDrizzleTransaction(db, databaseDialect)) {
        const attachQueries = validIds.map((mediaId, index) => {
          const position = positions[index];
          if (!position) {
            throw new Error("Failed to assign a media position");
          }

          return db
            .update(media)
            .set({ postId, position, updatedAt: timestamp })
            .where(and(eq(media.siteId, siteId), eq(media.id, mediaId)));
        });

        await db.batch([clearQuery, ...attachQueries] as [
          typeof clearQuery,
          ...(typeof attachQueries)[number][],
        ]);
        return;
      }

      await db.transaction(async (tx) => {
        await tx
          .update(media)
          .set({
            postId: null,
            position: DEFAULT_MEDIA_POSITION,
            updatedAt: timestamp,
          })
          .where(and(eq(media.siteId, siteId), eq(media.postId, postId)));

        for (const [index, mediaId] of validIds.entries()) {
          const position = positions[index];
          if (!position) {
            throw new Error("Failed to assign a media position");
          }

          await tx
            .update(media)
            .set({ postId, position, updatedAt: timestamp })
            .where(and(eq(media.siteId, siteId), eq(media.id, mediaId)));
        }
      });
    },

    async detachFromPost(postId) {
      await db
        .update(media)
        .set({ postId: null, position: DEFAULT_MEDIA_POSITION })
        .where(and(eq(media.siteId, siteId), eq(media.postId, postId)));
    },

    async updateAlt(id, alt) {
      await db
        .update(media)
        .set({ alt, updatedAt: now() })
        .where(and(eq(media.siteId, siteId), eq(media.id, id)));
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

      await db
        .delete(media)
        .where(and(eq(media.siteId, siteId), eq(media.id, id)));
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

      await db
        .delete(media)
        .where(and(eq(media.siteId, siteId), inArray(media.id, ids)));
    },
  };
}
