/**
 * Multipart Upload API Routes
 *
 * Handles chunked file uploads for files that exceed the Cloudflare Workers
 * 100MB request body limit. Uses the storage driver's multipart API.
 *
 * Protocol:
 *   1. POST /            — Initiate: validate metadata, start multipart upload
 *   2. PUT /:id/part     — Upload a single chunk (raw body, not FormData)
 *   3. POST /:id/complete — Finalize: combine parts, create DB record
 *   4. POST /:id/abort   — Cancel: discard uploaded parts
 *   5. PUT /:id/poster   — Upload poster frame (video thumbnails, small FormData)
 */

import { Hono, type Context } from "hono";
import { z } from "zod";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import { getMediaUrl, getPublicUrlForProvider } from "../../lib/image.js";
import {
  detectPosterMimeType,
  generateStorageKey,
  getPosterExtension,
  getStoredUploadPolicy,
  getStoredUploadSignaturePeekLength,
  getPosterStorageKey,
  validateStoredUploadMetadata,
  validateStoredUploadSignature,
} from "../../lib/upload.js";
import { supportsMultipart } from "../../lib/storage.js";
import {
  MediaQuotaExceededError,
  ValidationError,
  parseIdParam,
} from "../../lib/errors.js";
import { getI18n } from "../../i18n/index.js";
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
  durationSeconds: z.number().int().positive().optional(),
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

function getHostedMediaQuotaExceededText(c: Context<Env>): string {
  return getI18n(c)._(
    msg({
      message:
        "This upload would exceed your shared hosted media limit. Remove files or upgrade storage to continue.",
      comment:
        "@context: Error shown when a hosted upload would exceed the shared account media limit",
    }),
  );
}

// POST / — Initiate a multipart upload
multipartUploadApiRoutes.post("/", async (c) => {
  const storage = c.var.storage;
  if (!storage || !supportsMultipart(storage)) {
    return c.json({ error: "Storage doesn't support multipart uploads." }, 500);
  }

  const body = await c.req.json();
  const data = parseValidated(InitiateSchema, body);

  // Validate file type and size
  const error = validateStoredUploadMetadata(data.contentType, data.size, {
    maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
  });
  if (error) {
    throw new ValidationError(error);
  }
  const uploadPolicy = getStoredUploadPolicy(data.contentType);
  if (!uploadPolicy) {
    throw new ValidationError(
      `File type "${data.contentType}" is not supported.`,
    );
  }

  const { id, filename, storageKey } = generateStorageKey(
    c.var.currentSite.id,
    data.filename,
  );

  try {
    await c.var.services.media.assertCanWriteBytes(data.size);
  } catch (error) {
    if (error instanceof MediaQuotaExceededError) {
      return c.json({ error: getHostedMediaQuotaExceededText(c) }, 409);
    }

    throw error;
  }

  const upload = await storage.createMultipartUpload(storageKey, {
    contentType: data.contentType,
    contentDisposition: uploadPolicy.contentDisposition,
    cacheControl: "public, max-age=31536000, immutable",
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
  const validationError = validateStoredUploadMetadata(
    data.contentType,
    data.size,
    { maxFileSizeMB: c.var.appConfig.uploadMaxFileSize },
  );
  if (validationError) {
    throw new ValidationError(validationError);
  }
  const uploadPolicy = getStoredUploadPolicy(data.contentType);
  if (!uploadPolicy) {
    throw new ValidationError(
      `File type "${data.contentType}" is not supported.`,
    );
  }

  try {
    await c.var.services.media.assertCanWriteBytes(data.size);
  } catch (error) {
    if (error instanceof MediaQuotaExceededError) {
      await storage.abortMultipartUpload(data.storageKey, data.uploadId);
      return c.json({ error: getHostedMediaQuotaExceededText(c) }, 409);
    }

    throw error;
  }

  // Complete the R2 multipart upload
  await storage.completeMultipartUpload(
    data.storageKey,
    data.uploadId,
    data.parts,
  );

  const peekLength = getStoredUploadSignaturePeekLength(data.contentType);
  if (peekLength > 0) {
    const object = await storage.get(data.storageKey, {
      range: { offset: 0, length: peekLength },
    });
    if (!object) {
      throw new ValidationError("The uploaded file could not be found.");
    }
    const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
    const signatureError = validateStoredUploadSignature(
      data.contentType,
      bytes,
    );
    if (signatureError) {
      await storage.delete(data.storageKey).catch(() => {});
      if (data.posterKey) {
        await storage.delete(data.posterKey).catch(() => {});
      }
      throw new ValidationError(signatureError);
    }
  }

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
    durationSeconds:
      data.durationSeconds && data.durationSeconds > 0
        ? data.durationSeconds
        : undefined,
    blurhash: data.blurhash,
    waveform: data.waveform,
    posterKey: data.posterKey,
    mediaKind: uploadPolicy.mediaKind,
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

  const posterBytes = new Uint8Array(await posterFile.arrayBuffer());
  const posterMime = detectPosterMimeType(posterBytes);
  if (!posterMime) {
    throw new ValidationError(
      "Unsupported poster format. Only WebP and PNG are accepted.",
    );
  }

  const posterExt = getPosterExtension(posterMime)!;
  const posterKey = getPosterStorageKey(c.var.currentSite.id, id, posterExt);

  await storage.put(posterKey, posterBytes, {
    contentType: posterMime,
  });

  return c.json({ posterKey });
});
