/**
 * Multipart Upload API Routes
 *
 * Handles chunked file uploads for files that exceed the Cloudflare Workers
 * 100MB request body limit. Uses R2's native multipart upload API.
 *
 * Protocol:
 *   1. POST /            — Initiate: validate metadata, start R2 multipart upload
 *   2. PUT /:id/part     — Upload a single chunk (raw body, not FormData)
 *   3. POST /:id/complete — Finalize: combine parts in R2, create DB record
 *   4. POST /:id/abort   — Cancel: discard uploaded parts
 *   5. PUT /:id/poster   — Upload poster frame (video thumbnails, small FormData)
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { getMediaUrl, getPublicUrlForProvider } from "../../lib/image.js";
import {
  validateUploadFileMetadata,
  generateStorageKey,
} from "../../lib/upload.js";
import { supportsMultipart } from "../../lib/storage.js";
import type { UploadedPart } from "../../lib/storage.js";
import { ValidationError, NotFoundError } from "../../lib/errors.js";
import { parseValidated } from "../../lib/schemas.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

// ── Session tracking ─────────────────────────────────────────────────

interface MultipartSession {
  storageKey: string;
  uploadId: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  blurhash?: string;
  posterKey?: string;
  parts: UploadedPart[];
  createdAt: number;
}

/** In-memory session map. Per-isolate; acceptable for single upload sequences. */
const sessions = new Map<string, MultipartSession>();

/** Max session age before cleanup (1 hour) */
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;

/** Lazily purge stale sessions */
function purgeStale(): void {
  const cutoff = Date.now() - SESSION_MAX_AGE_MS;
  for (const [id, session] of sessions) {
    if (session.createdAt < cutoff) {
      sessions.delete(id);
    }
  }
}

// ── Schemas ──────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurhash: z.string().max(200).optional(),
});

const CompleteSchema = z.object({
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string().min(1),
    }),
  ),
});

// ── Routes ───────────────────────────────────────────────────────────

export const multipartUploadApiRoutes = new Hono<Env>();

// Require auth for all multipart routes
multipartUploadApiRoutes.use("*", requireAuthApi());

// POST / — Initiate a multipart upload
multipartUploadApiRoutes.post("/", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  purgeStale();

  const body = await c.req.json();
  const data = parseValidated(InitiateSchema, body);

  // Validate file type and size
  const error = validateUploadFileMetadata(data.contentType, data.size, {
    maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
  });
  if (error) {
    throw new ValidationError(error);
  }

  const { id, filename, storageKey } = generateStorageKey(data.filename);

  const upload = await storage.createMultipartUpload(storageKey, {
    contentType: data.contentType,
  });

  sessions.set(id, {
    storageKey,
    uploadId: upload.uploadId,
    filename,
    originalName: data.filename,
    contentType: data.contentType,
    size: data.size,
    width: data.width,
    height: data.height,
    blurhash: data.blurhash,
    parts: [],
    createdAt: Date.now(),
  });

  return c.json({ id, uploadId: upload.uploadId, storageKey });
});

// PUT /:id/part?partNumber=N — Upload a single part
multipartUploadApiRoutes.put("/:id/part", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  const id = c.req.param("id");
  const session = sessions.get(id);
  if (!session) {
    throw new NotFoundError("Upload session");
  }

  const partNumberRaw = c.req.query("partNumber");
  if (!partNumberRaw) {
    throw new ValidationError("partNumber query parameter is required");
  }
  const partNumber = parseInt(partNumberRaw, 10);
  if (isNaN(partNumber) || partNumber < 1) {
    throw new ValidationError("partNumber must be a positive integer");
  }

  const body = await c.req.arrayBuffer();
  const part = await storage.uploadPart(
    session.storageKey,
    session.uploadId,
    partNumber,
    body,
  );

  session.parts.push(part);

  return c.json({ partNumber: part.partNumber, etag: part.etag });
});

// POST /:id/complete — Finalize the upload
multipartUploadApiRoutes.post("/:id/complete", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  const id = c.req.param("id");
  const session = sessions.get(id);
  if (!session) {
    throw new NotFoundError("Upload session");
  }

  const body = await c.req.json();
  const data = parseValidated(CompleteSchema, body);

  // Complete the R2 multipart upload
  await storage.completeMultipartUpload(
    session.storageKey,
    session.uploadId,
    data.parts,
  );

  // Create the DB record
  const media = await c.var.services.media.create({
    id,
    filename: session.filename,
    originalName: session.originalName,
    mimeType: session.contentType,
    size: session.size,
    storageKey: session.storageKey,
    provider: c.var.appConfig.storageDriver,
    width: session.width && session.width > 0 ? session.width : undefined,
    height: session.height && session.height > 0 ? session.height : undefined,
    blurhash: session.blurhash,
    posterKey: session.posterKey,
  });

  sessions.delete(id);

  const mediaPublicUrl = getPublicUrlForProvider(
    c.var.appConfig.storageDriver,
    c.var.appConfig.r2PublicUrl,
    c.var.appConfig.s3PublicUrl,
  );
  const publicUrl = getMediaUrl(session.storageKey, mediaPublicUrl);

  return c.json({
    id: media.id,
    filename: media.filename,
    url: publicUrl,
    mimeType: media.mimeType,
    size: media.size,
  });
});

// POST /:id/abort — Cancel the upload
multipartUploadApiRoutes.post("/:id/abort", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  const id = c.req.param("id");
  const session = sessions.get(id);
  if (!session) {
    throw new NotFoundError("Upload session");
  }

  await storage.abortMultipartUpload(session.storageKey, session.uploadId);
  sessions.delete(id);

  return c.json({ success: true });
});

// PUT /:id/poster — Upload poster frame (video thumbnails)
multipartUploadApiRoutes.put("/:id/poster", async (c) => {
  const storage = c.var.storage;
  if (!storage) {
    return c.json({ error: "Storage not configured." }, 500);
  }

  const id = c.req.param("id");
  const session = sessions.get(id);
  if (!session) {
    throw new NotFoundError("Upload session");
  }

  const formData = await c.req.formData();
  const posterFile = formData.get("poster") as File | null;
  if (!posterFile) {
    throw new ValidationError("No poster file provided");
  }

  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const posterKey = `media/${year}/${month}/${id}-poster.webp`;

  await storage.put(posterKey, posterFile.stream(), {
    contentType: "image/webp",
  });

  session.posterKey = posterKey;

  return c.json({ posterKey });
});
