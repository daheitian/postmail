/**
 * Media Service
 *
 * Handles media upload and management with pluggable storage backends.
 */

import { eq, desc, inArray, asc, sql, and, or } from "drizzle-orm";
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
 * MIME type stored on disk and on the `media` row for a Jant-composed text
 * attachment. Markdown is the canonical source — HTML is rendered on read,
 * never persisted. `charset=utf-8` is explicit so browsers that load the raw
 * CDN URL decode correctly.
 */
const TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE = "text/markdown; charset=utf-8";

/**
 * `Content-Disposition` applied to text-attachment storage objects. `inline`
 * keeps browsers from prompting to download when the raw `.md` CDN URL is
 * clicked (e.g. from a link in an exported Zola site).
 */
const TEXT_ATTACHMENT_CONTENT_DISPOSITION = "inline";

/**
 * Original filename used when generating storage keys for text attachments.
 * The `.md` suffix flows through `generateStorageKey` and ends up as the
 * media row's `storageKey` extension.
 */
const TEXT_ATTACHMENT_FILENAME = "attached-text.md";

/**
 * Cache-Control for the `.md` object. Attachments are content-addressed —
 * every edit produces a new storage key — so the bytes at any given key are
 * immutable for the lifetime of the key and safe to cache forever.
 */
const TEXT_ATTACHMENT_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * MIME types that identify legacy text-attachment storage layouts, still used
 * by the migration path to find rows that need converting to the current
 * markdown-only format.
 *
 * - `text/x-tiptap+json` → single-envelope era (`{ json, html }` JSON blob).
 * - `text/html; charset=utf-8` → split-sibling era (`.html` primary +
 *   `.json` sibling at `storageKey.replace(/\.html$/, ".json")`).
 */
const LEGACY_TEXT_ATTACHMENT_ENVELOPE_MIME_TYPE = "text/x-tiptap+json";
const LEGACY_TEXT_ATTACHMENT_SPLIT_MIME_TYPE = "text/html; charset=utf-8";

/**
 * Default maximum number of legacy records processed per migration call.
 * Keeps a single invocation bounded so callers can drive progress in batches.
 */
const TEXT_ATTACHMENT_MIGRATION_DEFAULT_LIMIT = 50;
const TEXT_ATTACHMENT_MIGRATION_MAX_LIMIT = 500;

/**
 * Returns true if the given media record is a Jant-composed text attachment
 * stored as markdown (the current format). Plain text-file uploads (`.md`,
 * `.txt`, `.csv`) also carry `mediaKind === "text"` but were uploaded through
 * `/api/upload` as raw files — they share the text kind but not the content
 * pipeline. Detection uses the exact MIME assigned at creation, so raw
 * `text/markdown` file uploads (which use `text/markdown` without an explicit
 * charset from the browser) do not collide.
 */
export function isTextAttachment(
  media: Pick<Media, "mediaKind" | "mimeType">,
): boolean {
  return (
    media.mediaKind === "text" &&
    media.mimeType === TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE
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
   * Return the pre-rendered HTML sibling stored alongside the Tiptap AST.
   * Used for SSR pages where the HTML can be served directly without a
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
  /**
   * One-off maintenance operation that converts legacy text-attachment rows
   * to the current markdown-only format. Handles both prior storage layouts:
   *
   * - Envelope era (`text/x-tiptap+json` MIME, single JSON with `json` + `html`).
   * - Split era (`text/html; charset=utf-8` MIME with a `.json` sibling).
   *
   * Rows with `text/markdown; charset=utf-8` are already current and ignored.
   * Safe to re-run. Processes in batches; pass `limit` to control batch size.
   * Returns a summary so callers can loop until `remaining === 0`.
   */
  migrateLegacyTextAttachments(deps: {
    storage: StorageDriver;
    storageDriver: string;
    limit?: number;
  }): Promise<{
    migrated: number;
    failed: number;
    remaining: number;
    errors: Array<{ mediaId: string; message: string }>;
  }>;
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

  /**
   * Migrate a single legacy text-attachment row to the current markdown-only
   * format. Handles both historical shapes in one place so callers don't
   * have to branch:
   *
   * - Envelope era (`text/x-tiptap+json`): single object with
   *   `{ json, html }`. Extract the Tiptap AST, convert to markdown.
   * - Split era (`text/html; charset=utf-8`): two sibling objects; the
   *   `.json` sibling holds the AST. Read it, convert to markdown, delete
   *   both old objects.
   */
  async function migrateLegacyTextAttachmentRow(
    row: typeof media.$inferSelect,
    storage: StorageDriver,
    storageDriver: string,
  ): Promise<void> {
    const provider = ensureStorageProvider(row.provider, Error);
    const expectedProvider = ensureStorageProvider(storageDriver, Error);
    if (provider !== expectedProvider) {
      throw new Error(
        `Row ${row.id} lives on provider "${provider}" but migration was called with driver "${expectedProvider}"`,
      );
    }

    const oldKeys: string[] = [row.storageKey];
    let markdown: string;

    if (row.mimeType === LEGACY_TEXT_ATTACHMENT_ENVELOPE_MIME_TYPE) {
      const object = await storage.get(row.storageKey);
      if (!object) {
        throw new Error(
          `Legacy envelope object missing from storage at ${row.storageKey}`,
        );
      }
      const raw = await new Response(object.body).text();
      const envelope = JSON.parse(raw) as { json?: unknown };
      if (!envelope.json) {
        throw new Error(
          `Envelope at ${row.storageKey} is missing expected json field`,
        );
      }
      markdown = tiptapJsonToMarkdown(JSON.stringify(envelope.json));
    } else if (row.mimeType === LEGACY_TEXT_ATTACHMENT_SPLIT_MIME_TYPE) {
      const jsonKey = row.storageKey.replace(/\.html$/, ".json");
      if (jsonKey === row.storageKey) {
        throw new Error(
          `Split-format row ${row.id} storageKey "${row.storageKey}" does not end in .html; cannot derive JSON sibling`,
        );
      }
      const object = await storage.get(jsonKey);
      if (!object) {
        throw new Error(
          `JSON sibling missing from storage at ${jsonKey} for split-format row ${row.id}`,
        );
      }
      const raw = await new Response(object.body).text();
      markdown = tiptapJsonToMarkdown(raw);
      oldKeys.push(jsonKey);
    } else {
      throw new Error(
        `Row ${row.id} has unrecognized legacy mimeType "${row.mimeType}"`,
      );
    }

    const mdBytes = new TextEncoder().encode(markdown);

    // Compute the new storage key by swapping extension on the old one.
    // Reusing the path prefix keeps objects grouped by site under the same
    // prefix, which matters for storage backends that scan by prefix.
    const baseKey = row.storageKey.replace(/\.[^.]+$/, "");
    const mdKey = `${baseKey}.md`;

    await storage.put(mdKey, mdBytes, {
      contentType: TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE,
      contentDisposition: TEXT_ATTACHMENT_CONTENT_DISPOSITION,
      cacheControl: TEXT_ATTACHMENT_CACHE_CONTROL,
    });

    // Filename tracks the storageKey's trailing segment so downstream code
    // that inspects `media.filename` stays consistent with the object layout.
    const newFilename = mdKey.split("/").pop() ?? row.filename;

    await db
      .update(media)
      .set({
        storageKey: mdKey,
        filename: newFilename,
        originalName: TEXT_ATTACHMENT_FILENAME,
        mimeType: TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE,
        size: mdBytes.byteLength,
        updatedAt: now(),
      })
      .where(and(eq(media.siteId, siteId), eq(media.id, row.id)));

    // Remove the old objects after the DB row has migrated. Best-effort —
    // if delete fails, we leak the object but readers have already moved
    // on to the new key.
    for (const key of oldKeys) {
      if (key === mdKey) continue;
      await storage.delete(key).catch((err) => {
        // eslint-disable-next-line no-console -- Visibility helps operators spot stuck garbage
        console.error(`Failed to delete legacy object ${key}:`, err);
      });
    }
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

      // Markdown in → markdown on disk. No other format is persisted.
      // HTML and Tiptap AST are computed on read whenever a consumer needs
      // them; keeping them off disk avoids the envelope/sibling complexity
      // and makes markdown the single canonical form everywhere.
      //
      // We still parse to Tiptap once at write time, but only to extract
      // text for summary/chars — we throw the AST away afterwards.
      const bodyJson = markdownToTiptapJson(data.content);
      const bodyText = extractBodyText(bodyJson) ?? "";
      const summary = data.summary?.trim() || bodyText.slice(0, 100).trim();

      const mdBytes = new TextEncoder().encode(data.content);

      const uploadError = validateUploadFileMetadata(
        TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE,
        mdBytes.byteLength,
        {
          maxFileSizeMB: deps.maxFileSizeMB,
        },
      );
      if (uploadError) {
        throw new ValidationError(uploadError);
      }

      const { id, filename, storageKey } = generateStorageKey(
        siteId,
        TEXT_ATTACHMENT_FILENAME,
      );

      await deps.storage.put(storageKey, mdBytes, {
        contentType: TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE,
        contentDisposition: TEXT_ATTACHMENT_CONTENT_DISPOSITION,
        cacheControl: TEXT_ATTACHMENT_CACHE_CONTROL,
      });

      return this.create({
        id,
        filename,
        originalName: TEXT_ATTACHMENT_FILENAME,
        mimeType: TEXT_ATTACHMENT_MARKDOWN_MIME_TYPE,
        size: mdBytes.byteLength,
        storageKey,
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

      // The stored bytes are the markdown source — return them as-is.
      const object = await storage.get(record.storageKey);
      if (!object) return null;

      const content = await new Response(object.body).text();

      return {
        id: record.id,
        type: "text",
        contentFormat: "markdown",
        content,
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

      // Read markdown, render HTML on the fly. Rendering cost is negligible
      // for typical attachment sizes (< 1ms on edge/Node); upstream callers
      // that care (`/api/media/:id/content`, SSR preview) set long cache
      // headers so CDN serves the rendered HTML for subsequent visits.
      const object = await storage.get(record.storageKey);
      if (!object) return null;

      const markdown = await new Response(object.body).text();
      const tiptapJson = markdownToTiptapJson(markdown);
      const html = renderTiptapJson(tiptapJson);

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

    async migrateLegacyTextAttachments(deps) {
      const limit = Math.min(
        Math.max(deps.limit ?? TEXT_ATTACHMENT_MIGRATION_DEFAULT_LIMIT, 1),
        TEXT_ATTACHMENT_MIGRATION_MAX_LIMIT,
      );

      // Select rows that carry either legacy mimeType. The current
      // markdown-only rows (`text/markdown; charset=utf-8`) are excluded
      // automatically because neither `eq` branch matches, making the
      // migration idempotent by construction.
      const legacyRows = await db
        .select()
        .from(media)
        .where(
          and(
            eq(media.siteId, siteId),
            eq(media.mediaKind, "text"),
            or(
              eq(media.mimeType, LEGACY_TEXT_ATTACHMENT_ENVELOPE_MIME_TYPE),
              eq(media.mimeType, LEGACY_TEXT_ATTACHMENT_SPLIT_MIME_TYPE),
            ),
          ),
        )
        .orderBy(asc(media.createdAt))
        .limit(limit + 1);

      const toProcess = legacyRows.slice(0, limit);
      const remainingBeyondBatch = legacyRows.length > limit;

      const errors: Array<{ mediaId: string; message: string }> = [];
      let migrated = 0;
      let failed = 0;

      for (const row of toProcess) {
        try {
          await migrateLegacyTextAttachmentRow(
            row,
            deps.storage,
            deps.storageDriver,
          );
          migrated += 1;
        } catch (error) {
          failed += 1;
          errors.push({
            mediaId: row.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // If the batch was full and there was a peek row beyond it, there's
      // at least one more remaining. Otherwise remaining equals whatever
      // this call couldn't migrate (plus the peek row if any). Callers loop
      // until remaining === 0.
      const remaining =
        (remainingBeyondBatch ? 1 : 0) + (toProcess.length - migrated);

      return { migrated, failed, remaining, errors };
    },

    async delete(id, storage) {
      const record = await this.getById(id);
      if (!record) return false;

      if (storage) {
        // Text attachments have a single `.md` object — same shape as any
        // other media — so no sibling cleanup is needed. Only video/image
        // rows carry a companion poster.
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
        const keys: string[] = [];
        for (const record of records) {
          keys.push(record.storageKey);
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
