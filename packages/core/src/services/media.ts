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
import {
  ConfigurationError,
  ExternalServiceError,
  MediaQuotaExceededError,
  ValidationError,
} from "../lib/errors.js";
import type { HostedControlPlaneClient } from "../lib/hosted-control-plane.js";

const DEFAULT_MEDIA_POSITION = "a0";

/**
 * MIME type stored on the `media` row for a text attachment. This matches the
 * public `.html` artifact's content type — the DB row describes the user-facing
 * object, not the private JSON source.
 */
const TEXT_ATTACHMENT_HTML_MIME_TYPE = "text/html; charset=utf-8";

/**
 * MIME type applied to the JSON source object in storage. Never stored on the
 * DB row (which always tracks the public artifact).
 */
const TEXT_ATTACHMENT_JSON_MIME_TYPE = "application/json";

/**
 * Original filename used when generating storage keys for text attachments.
 * The `.html` suffix flows through `generateStorageKey` and ends up as the
 * media row's `storageKey` extension.
 */
const TEXT_ATTACHMENT_FILENAME = "attached-text.html";

/**
 * Cache-Control header used for both the HTML and JSON objects. Text
 * attachments are content-addressed (every edit produces a new storage key),
 * so the stored bytes at any given key are immutable for the lifetime of the
 * key — safe to cache forever.
 */
const TEXT_ATTACHMENT_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Derive the JSON sibling key for a text-attachment `.html` storage key.
 *
 * Text attachments live as a pair of sibling objects in storage:
 *
 * - `{key}.html` — primary, public CDN artifact (pre-rendered HTML).
 *   The media row's `storageKey` column always points here.
 * - `{key}.json` — Tiptap AST source of truth, used by the markdown API
 *   endpoint and any future re-rendering.
 *
 * Use this helper everywhere the JSON key is needed so the suffix convention
 * lives in one place.
 *
 * @param htmlKey - The media.storageKey value (expected to end in `.html`)
 * @returns The paired JSON key
 * @example
 * ```ts
 * textAttachmentJsonKey("sites/s/media/xyz.html");
 * // "sites/s/media/xyz.json"
 * ```
 */
export function textAttachmentJsonKey(htmlKey: string): string {
  return htmlKey.replace(/\.html$/, ".json");
}

/**
 * Returns true if the given media record is a Jant-composed text attachment
 * (created via `createTextAttachment`), as opposed to a plain text file that
 * happened to be uploaded via `/api/upload` (e.g. a `.md` or `.txt` file).
 *
 * Both kinds share `mediaKind === "text"` because the upload category is
 * resolved from MIME, but only Jant-composed attachments have the split
 * `.html` + `.json` sibling layout in storage. Detection uses the exact MIME
 * assigned at creation time, not a prefix match, to keep it unambiguous.
 */
export function isTextAttachment(
  media: Pick<Media, "mediaKind" | "mimeType">,
): boolean {
  return (
    media.mediaKind === "text" &&
    media.mimeType === TEXT_ATTACHMENT_HTML_MIME_TYPE
  );
}

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
  assertCanWriteBytes(additionalBytes: number): Promise<void>;
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
  /**
   * Return the pre-rendered HTML stored in the text-attachment envelope.
   * Used for SSR pages where we can serve the HTML directly without a
   * round-trip through markdown conversion.
   */
  getTextAttachmentHtml(
    id: string,
    storage?: StorageDriver | null,
  ): Promise<{
    id: string;
    html: string;
    summary: string | null;
    chars: number | null;
  } | null>;
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
  durationSeconds?: number;
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
  deps?: {
    enforceHostedQuota?: boolean;
    hostedControlPlane?: HostedControlPlaneClient | null;
  },
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
      durationSeconds: row.durationSeconds,
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

  async function assertCanWriteBytes(additionalBytes: number): Promise<void> {
    if (!Number.isFinite(additionalBytes) || additionalBytes < 0) {
      throw new ValidationError(
        "Media write checks require a non-negative byte count.",
      );
    }

    if (additionalBytes === 0) {
      return;
    }

    if (!deps?.enforceHostedQuota) {
      return;
    }

    if (!deps.hostedControlPlane) {
      throw new ConfigurationError(
        "Hosted media quota checks require a configured control plane client.",
      );
    }

    try {
      const result = await deps.hostedControlPlane.checkMediaWriteQuota({
        additionalBytes,
        coreSiteId: siteId,
      });

      if (result.allowed) {
        return;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new ExternalServiceError(error.message);
      }

      throw new ExternalServiceError(
        "Hosted media quota check failed before the upload could continue.",
      );
    }

    throw new MediaQuotaExceededError();
  }

  return {
    async assertCanWriteBytes(additionalBytes) {
      await assertCanWriteBytes(additionalBytes);
    },

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
          durationSeconds: data.durationSeconds ?? null,
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

      // Input contract: the API accepts markdown for friendliness. Internally
      // we normalize to Tiptap JSON (the source of truth) and render HTML
      // (the public artifact). Markdown itself is never persisted — it is a
      // boundary format only.
      const bodyJson = markdownToTiptapJson(data.content);
      const bodyHtml = renderTiptapJson(bodyJson);
      const bodyText = extractBodyText(bodyJson) ?? "";
      const summary = data.summary?.trim() || bodyText.slice(0, 100).trim();

      const encoder = new TextEncoder();
      const htmlBytes = encoder.encode(bodyHtml);
      const jsonBytes = encoder.encode(bodyJson);

      // Validate against the public artifact — that is the size the user
      // effectively uploaded. The JSON source rides along and is typically
      // comparable in size; we don't double-count.
      const uploadError = validateUploadFileMetadata(
        TEXT_ATTACHMENT_HTML_MIME_TYPE,
        htmlBytes.byteLength,
        {
          maxFileSizeMB: deps.maxFileSizeMB,
        },
      );
      if (uploadError) {
        throw new ValidationError(uploadError);
      }

      const {
        id,
        filename,
        storageKey: htmlKey,
      } = generateStorageKey(siteId, TEXT_ATTACHMENT_FILENAME);
      const jsonKey = textAttachmentJsonKey(htmlKey);

      // Write order: JSON source first, then public HTML. The HTML file is
      // the one readers (SSR, CDN visitors, exports) reach for — making it
      // the last to land means a partial write never leaves a reachable
      // attachment whose source is missing. On HTML failure we roll back the
      // JSON so we don't strand a source object with no public counterpart.
      await deps.storage.put(jsonKey, jsonBytes, {
        contentType: TEXT_ATTACHMENT_JSON_MIME_TYPE,
        cacheControl: TEXT_ATTACHMENT_CACHE_CONTROL,
      });

      try {
        await deps.storage.put(htmlKey, htmlBytes, {
          contentType: TEXT_ATTACHMENT_HTML_MIME_TYPE,
          cacheControl: TEXT_ATTACHMENT_CACHE_CONTROL,
        });
      } catch (error) {
        await deps.storage.delete(jsonKey).catch(() => undefined);
        throw error;
      }

      return this.create({
        id,
        filename,
        originalName: TEXT_ATTACHMENT_FILENAME,
        mimeType: TEXT_ATTACHMENT_HTML_MIME_TYPE,
        size: htmlBytes.byteLength,
        storageKey: htmlKey,
        provider: deps.storageDriver,
        summary: summary || undefined,
        chars: bodyText.length,
        mediaKind: "text",
      });
    },

    async getTextAttachmentContent(id, storage) {
      const record = await this.getById(id);
      if (!record || !isTextAttachment(record)) {
        return null;
      }
      if (!storage) {
        throw new ConfigurationError(
          "File storage isn't set up. Check your server config.",
        );
      }

      // The .json sibling holds the Tiptap AST. Detection is via mediaKind
      // rather than mimeType because the row's mimeType tracks the public
      // HTML artifact, not the private JSON source.
      const jsonKey = textAttachmentJsonKey(record.storageKey);
      const object = await storage.get(jsonKey);
      if (!object) return null;

      const json = await new Response(object.body).text();

      return {
        id: record.id,
        type: "text",
        contentFormat: "markdown",
        content: tiptapJsonToMarkdown(json),
        summary: record.summary,
        chars: record.chars,
      };
    },

    async getTextAttachmentHtml(id, storage) {
      const record = await this.getById(id);
      if (!record || !isTextAttachment(record)) {
        return null;
      }
      if (!storage) {
        throw new ConfigurationError(
          "File storage isn't set up. Check your server config.",
        );
      }

      // The primary storageKey points directly to the pre-rendered HTML —
      // no envelope unwrapping, no round-trip through markdown.
      const object = await storage.get(record.storageKey);
      if (!object) return null;

      const html = await new Response(object.body).text();

      return {
        id: record.id,
        html,
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
        // Delete the public artifact first so readers see a 404 immediately,
        // then best-effort clean up any sibling source/poster objects.
        await storage.delete(record.storageKey).catch((err) => {
          // eslint-disable-next-line no-console -- Error logging is intentional
          console.error("Storage delete error:", err);
        });
        if (isTextAttachment(record)) {
          await storage
            .delete(textAttachmentJsonKey(record.storageKey))
            .catch((err) => {
              // eslint-disable-next-line no-console -- Error logging is intentional
              console.error("Storage delete text source error:", err);
            });
        }
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
        const keys: string[] = [];
        for (const record of records) {
          keys.push(record.storageKey);
          if (isTextAttachment(record)) {
            keys.push(textAttachmentJsonKey(record.storageKey));
          }
          if (record.posterKey) {
            keys.push(record.posterKey);
          }
        }
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
