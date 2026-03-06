/**
 * Upload API Routes
 *
 * Handles file uploads to R2 storage.
 * Supports both JSON and SSE (Datastar) responses.
 */

import { Hono, type Context } from "hono";
import { html } from "hono/html";
import { msg } from "@lingui/core/macro";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { requireAuthApi } from "../../middleware/auth.js";
import {
  getMediaUrl,
  getImageUrl,
  getPublicUrlForProvider,
} from "../../lib/image.js";
import { sse } from "../../lib/sse.js";
import { validateUploadFile, generateStorageKey } from "../../lib/upload.js";
import { assertFound } from "../../lib/errors.js";
import { getI18n } from "../../i18n/index.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const uploadApiRoutes = new Hono<Env>();

// Require auth for all upload routes
uploadApiRoutes.use("*", requireAuthApi());

/**
 * Render a media card HTML string for SSE response
 */
function renderMediaCard(
  media: {
    id: string;
    storageKey: string;
    mimeType: string;
    originalName: string;
    alt: string | null;
    size: number;
  },
  publicUrl?: string,
  imageTransformUrl?: string,
): string {
  const fullUrl = getMediaUrl(media.storageKey, publicUrl);
  const thumbnailUrl = getImageUrl(fullUrl, imageTransformUrl, {
    width: 300,
    quality: 80,
    format: "auto",
    fit: "cover",
  });
  const isImage = media.mimeType.startsWith("image/");
  const displayName = media.alt || media.originalName;
  const sizeStr = formatSize(media.size);

  if (isImage) {
    return html`
      <div class="group relative" data-media-id="${media.id}">
        <button
          type="button"
          class="block w-full aspect-square bg-muted rounded-lg overflow-hidden border hover:border-primary cursor-pointer"
          onclick="document.getElementById('lightbox-img').src = '${fullUrl}'; document.getElementById('lightbox').showModal()"
        >
          <img
            src="${thumbnailUrl}"
            alt="${displayName}"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        </button>
        <span class="block mt-2 text-xs truncate" title="${media.originalName}">
          ${media.originalName}
        </span>
        <div class="text-xs text-muted-foreground">${sizeStr}</div>
      </div>
    `.toString();
  }

  return html`
    <div class="group relative" data-media-id="${media.id}">
      <div
        class="block aspect-square bg-muted rounded-lg overflow-hidden border"
      >
        <div
          class="w-full h-full flex items-center justify-center text-muted-foreground"
        >
          <span class="text-xs">${media.mimeType}</span>
        </div>
      </div>
      <span class="block mt-2 text-xs truncate" title="${media.originalName}">
        ${media.originalName}
      </span>
      <div class="text-xs text-muted-foreground">${sizeStr}</div>
    </div>
  `.toString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if request wants SSE response (from Datastar)
 */
function wantsSSE(c: {
  req: { header: (name: string) => string | undefined };
}): boolean {
  const accept = c.req.header("accept") || "";
  return accept.includes("text/event-stream");
}

/**
 * Return an SSE error response that removes the upload placeholder and shows a toast
 */
function sseUploadError(c: Context<Env>, message: string): Response {
  return sse(c, async (stream) => {
    await stream.remove("#upload-placeholder");
    await stream.toast(message, "error");
  });
}

// Upload a file
uploadApiRoutes.post("/", async (c) => {
  const i18n = getI18n(c);
  const storage = c.var.storage;
  if (!storage) {
    const errorText = i18n._(
      msg({
        message: "File storage isn't set up. Check your server config.",
        comment: "@context: Error when file storage is not set up",
      }),
    );
    if (wantsSSE(c)) {
      return sseUploadError(c, errorText);
    }
    return c.json({ error: errorText }, 500);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    const errorText = i18n._(
      msg({
        message: "No file selected. Choose a file to upload.",
        comment: "@context: Error when no file was selected for upload",
      }),
    );
    if (wantsSSE(c)) {
      return sseUploadError(c, errorText);
    }
    return c.json({ error: errorText }, 400);
  }

  // Validate file type and size
  const uploadError = validateUploadFile(file, {
    maxFileSizeMB: c.var.appConfig.uploadMaxFileSize,
  });
  if (uploadError) {
    if (wantsSSE(c)) {
      return sseUploadError(c, uploadError);
    }
    return c.json({ error: uploadError }, 400);
  }

  // Generate unique filename using UUIDv7
  const { id, filename, storageKey } = generateStorageKey(file.name);

  try {
    // Read optional summary (provided for text attachments)
    let summary = (formData.get("summary") as string) || undefined;
    let chars: number | undefined;
    // Buffer for text files — file.stream() may not work after file.text()
    let textBuffer: Uint8Array | undefined;

    // Extract summary and char count BEFORE consuming the stream for storage,
    // because file.text() may not work after file.stream() is consumed.
    if (
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.type === "text/csv"
    ) {
      try {
        const textContent = await file.text();
        textBuffer = new TextEncoder().encode(textContent);
        chars = textContent.length;
        if (!summary) {
          summary = textContent.slice(0, 100).trim() || undefined;
        }
      } catch {
        // Ignore — summary and chars are optional
      }
    } else if (file.type === "text/x-tiptap+json") {
      try {
        const raw = await file.text();
        textBuffer = new TextEncoder().encode(raw);
        const envelope = JSON.parse(raw) as {
          json?: { content?: unknown[] };
          html?: string;
        };
        // Walk the TipTap JSON tree to extract plain text
        if (envelope.json) {
          let text = "";
          const walk = (node: Record<string, unknown>) => {
            if (typeof node.text === "string") text += node.text;
            if (Array.isArray(node.content))
              (node.content as Record<string, unknown>[]).forEach(walk);
          };
          walk(envelope.json as Record<string, unknown>);
          chars = text.length;
        }
      } catch {
        // Ignore — chars is optional
      }
    }

    // Upload to storage — use buffered bytes for text files (stream may be consumed)
    await storage.put(storageKey, textBuffer ?? file.stream(), {
      contentType: file.type,
    });

    // Read optional client-side metadata
    const widthRaw = parseInt(formData.get("width") as string) || undefined;
    const heightRaw = parseInt(formData.get("height") as string) || undefined;
    const blurhashRaw = (formData.get("blurhash") as string) || undefined;

    // Upload poster frame for videos (if provided by client)
    let posterKey: string | undefined;
    const posterFile = formData.get("poster") as File | null;
    if (posterFile && file.type.startsWith("video/")) {
      const date = new Date();
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      posterKey = `media/${year}/${month}/${id}-poster.webp`;
      await storage.put(posterKey, posterFile.stream(), {
        contentType: "image/webp",
      });
    }

    // Save to database
    const media = await c.var.services.media.create({
      id,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      storageKey,
      provider: c.var.appConfig.storageDriver,
      width: widthRaw && widthRaw > 0 ? widthRaw : undefined,
      height: heightRaw && heightRaw > 0 ? heightRaw : undefined,
      blurhash:
        blurhashRaw && blurhashRaw.length < 200 ? blurhashRaw : undefined,
      posterKey,
      summary,
      chars,
    });

    // SSE response for Datastar
    if (wantsSSE(c)) {
      const mediaPublicUrl = getPublicUrlForProvider(
        c.var.appConfig.storageDriver,
        c.var.appConfig.r2PublicUrl,
        c.var.appConfig.s3PublicUrl,
      );
      const cardHtml = renderMediaCard(
        media,
        mediaPublicUrl,
        c.var.appConfig.imageTransformUrl,
      );

      return sse(c, async (stream) => {
        // Replace placeholder with real media card
        await stream.patchElements(cardHtml, {
          mode: "outer",
          selector: "#upload-placeholder",
        });
        await stream.toast(
          i18n._(
            msg({
              message: "File uploaded.",
              comment: "@context: Toast after successful file upload",
            }),
          ),
        );
      });
    }

    // JSON response for API clients
    const mediaPublicUrl = getPublicUrlForProvider(
      c.var.appConfig.storageDriver,
      c.var.appConfig.r2PublicUrl,
      c.var.appConfig.s3PublicUrl,
    );
    const publicUrl = getMediaUrl(storageKey, mediaPublicUrl);
    return c.json({
      id: media.id,
      filename: media.filename,
      url: publicUrl,
      mimeType: media.mimeType,
      size: media.size,
    });
  } catch (err) {
    // eslint-disable-next-line no-console -- Error logging is intentional
    console.error("Upload error:", err);

    const errorText = i18n._(
      msg({
        message: "Upload didn't go through. Try again in a moment.",
        comment: "@context: Error when file upload fails",
      }),
    );
    if (wantsSSE(c)) {
      return sse(c, async (stream) => {
        await stream.remove("#upload-placeholder");
        await stream.toast(errorText, "error");
      });
    }
    return c.json({ error: errorText }, 500);
  }
});

// List uploaded files (JSON only)
uploadApiRoutes.get("/", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const mediaList = await c.var.services.media.list({ limit });
  const { r2PublicUrl, s3PublicUrl } = c.var.appConfig;

  return c.json({
    media: mediaList.map((m) => ({
      id: m.id,
      filename: m.filename,
      url: getMediaUrl(
        m.storageKey,
        getPublicUrlForProvider(m.provider, r2PublicUrl, s3PublicUrl),
      ),
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.createdAt,
    })),
  });
});

// Delete a file
uploadApiRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  assertFound(await c.var.services.media.getById(id), "Media");

  await c.var.services.media.delete(id, c.var.storage);

  return c.json({ success: true });
});
