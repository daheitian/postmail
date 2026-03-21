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
  getPosterStorageKey,
} from "../../lib/upload.js";
import { supportsMultipart } from "../../lib/storage.js";
import { ValidationError, parseIdParam } from "../../lib/errors.js";
import { ID_PREFIX } from "../../lib/ids.js";
import { parseValidated } from "../../lib/schemas.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

// ── Schemas ──────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

const UploadPartSchema = z.object({
  storageKey: z.string().min(1),
  uploadId: z.string().min(1),
});

const CompleteSchema = z.object({
  storageKey: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string().min(1),
    }),
  ),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurhash: z.string().max(200).optional(),
  waveform: z.string().max(2000).optional(),
  posterKey: z.string().optional(),
});

const AbortSchema = z.object({
  storageKey: z.string().min(1),
  uploadId: z.string().min(1),
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

  const body = await c.req.json();
  const data = parseValidated(InitiateSchema, body);

  // Validate file type and size
  const error = validateUploadFileMetadata(data.contentType, data.size, {
    maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
  });
  if (error) {
    throw new ValidationError(error);
  }

  const { id, filename, storageKey } = generateStorageKey(
    c.var.currentSite.id,
    data.filename,
  );

  const upload = await storage.createMultipartUpload(storageKey, {
    contentType: data.contentType,
  });

  return c.json({
    id,
    uploadId: upload.uploadId,
    storageKey,
    filename,
    originalName: data.filename,
  });
});

// PUT /:id/part?partNumber=N&storageKey=...&uploadId=... — Upload a single part
multipartUploadApiRoutes.put("/:id/part", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  parseIdParam(c.req.param("id"), ID_PREFIX.media);

  const storageKey = c.req.query("storageKey");
  const uploadId = c.req.query("uploadId");
  if (!storageKey || !uploadId) {
    throw new ValidationError(
      "storageKey and uploadId query parameters are required",
    );
  }
  parseValidated(UploadPartSchema, { storageKey, uploadId });

  const partNumberRaw = c.req.query("partNumber");
  if (!partNumberRaw) {
    throw new ValidationError("partNumber query parameter is required");
  }
  const partNumber = parseInt(partNumberRaw, 10);
  if (isNaN(partNumber) || partNumber < 1) {
    throw new ValidationError("partNumber must be a positive integer");
  }

  const body = await c.req.arrayBuffer();
  const part = await storage.uploadPart(storageKey, uploadId, partNumber, body);

  return c.json({ partNumber: part.partNumber, etag: part.etag });
});

// POST /:id/complete — Finalize the upload
multipartUploadApiRoutes.post("/:id/complete", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  const id = parseIdParam(c.req.param("id"), ID_PREFIX.media);
  const body = await c.req.json();
  const data = parseValidated(CompleteSchema, body);

  // Validate file type and size
  const validationError = validateUploadFileMetadata(
    data.contentType,
    data.size,
    { maxFileSizeMB: c.var.appConfig.uploadMaxFileSize },
  );
  if (validationError) {
    throw new ValidationError(validationError);
  }

  // Complete the R2 multipart upload
  await storage.completeMultipartUpload(
    data.storageKey,
    data.uploadId,
    data.parts,
  );

  // Create the DB record
  const media = await c.var.services.media.create({
    id,
    filename: data.filename,
    originalName: data.originalName,
    mimeType: data.contentType,
    size: data.size,
    storageKey: data.storageKey,
    provider: c.var.appConfig.storageDriver,
    width: data.width && data.width > 0 ? data.width : undefined,
    height: data.height && data.height > 0 ? data.height : undefined,
    blurhash: data.blurhash,
    waveform: data.waveform,
    posterKey: data.posterKey,
  });

  const mediaPublicUrl = getPublicUrlForProvider(
    c.var.appConfig.storageDriver,
    c.var.appConfig.r2PublicUrl,
    c.var.appConfig.s3PublicUrl,
    c.var.appConfig.localPublicUrl,
  );
  const publicUrl = getMediaUrl(
    data.storageKey,
    mediaPublicUrl,
    c.var.appConfig.sitePathPrefix,
  );

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

  parseIdParam(c.req.param("id"), ID_PREFIX.media);

  const body = await c.req.json();
  const data = parseValidated(AbortSchema, body);

  await storage.abortMultipartUpload(data.storageKey, data.uploadId);

  return c.json({ success: true });
});

// PUT /:id/poster — Upload poster frame (video thumbnails)
multipartUploadApiRoutes.put("/:id/poster", async (c) => {
  const storage = c.var.storage;
  if (!storage) {
    return c.json({ error: "Storage not configured." }, 500);
  }

  const id = parseIdParam(c.req.param("id"), ID_PREFIX.media);
  const formData = await c.req.formData();
  const posterFile = formData.get("poster") as File | null;
  if (!posterFile) {
    throw new ValidationError("No poster file provided");
  }

  if (!posterFile.type.startsWith("image/")) {
    throw new ValidationError(
      `Invalid file type "${posterFile.type}". Only image files are accepted for poster frames.`,
    );
  }

  const posterKey = getPosterStorageKey(c.var.currentSite.id, id);

  await storage.put(posterKey, posterFile.stream(), {
    contentType: "image/webp",
  });

  return c.json({ posterKey });
});
