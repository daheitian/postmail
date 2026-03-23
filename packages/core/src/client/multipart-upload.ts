/**
 * Client-side Multipart Upload Helper
 *
 * Transparently handles chunked uploads for files that exceed the
 * Cloudflare Workers 100MB request body limit. Used by compose-bridge
 * when a file is larger than MULTIPART_THRESHOLD.
 */

import { getJsonNumber, getJsonString, readJsonObject } from "./json.js";

/** Files at or above this size use multipart upload (95MB, below 100MB Worker limit) */
export const MULTIPART_THRESHOLD = 95 * 1024 * 1024;

/** Size of each upload chunk (50MB) */
const CHUNK_SIZE = 50 * 1024 * 1024;

export interface MultipartUploadResult {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MultipartUploadOptions {
  file: File;
  metadata: {
    width?: number;
    height?: number;
    blurhash?: string;
    waveform?: string;
    poster?: Blob;
  };
  onProgress?: (progress: number) => void;
}

/**
 * Upload a large file using the multipart upload protocol.
 *
 * @param options - File, metadata, and optional progress callback
 * @returns The uploaded media record
 * @throws Error if any step of the upload fails
 */
export async function uploadMultipart(
  options: MultipartUploadOptions,
): Promise<MultipartUploadResult> {
  const { file, metadata, onProgress } = options;

  // 1. Initiate the multipart upload
  const initRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!initRes.ok) {
    const data = await readJsonObject(initRes);
    throw new Error(getJsonString(data, "error") ?? "Failed to start upload");
  }

  const initData = await readJsonObject(initRes);
  const id = getJsonString(initData, "id");
  const uploadId = getJsonString(initData, "uploadId");
  const storageKey = getJsonString(initData, "storageKey");
  const filename = getJsonString(initData, "filename");
  const originalName = getJsonString(initData, "originalName");
  if (!id || !uploadId || !storageKey || !filename || !originalName) {
    throw new Error("Failed to start upload");
  }

  try {
    // 2. Upload poster if present (small file, single request)
    let posterKey: string | undefined;
    if (metadata.poster) {
      const posterForm = new FormData();
      posterForm.append("poster", metadata.poster, "poster.webp");

      const posterRes = await fetch(`/api/upload/multipart/${id}/poster`, {
        method: "PUT",
        body: posterForm,
      });

      if (!posterRes.ok) {
        throw new Error("Failed to upload poster");
      }

      const posterData = await readJsonObject(posterRes);
      posterKey = getJsonString(posterData, "posterKey");
      if (!posterKey) {
        throw new Error("Failed to upload poster");
      }
    }

    // 3. Slice file into chunks and upload each part
    const totalSize = file.size;
    const totalParts = Math.ceil(totalSize / CHUNK_SIZE);
    const parts: { partNumber: number; etag: string }[] = [];
    let uploadedBytes = 0;

    for (let i = 0; i < totalParts; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;

      const partRes = await fetch(
        `/api/upload/multipart/${id}/part?partNumber=${partNumber}&storageKey=${encodeURIComponent(storageKey)}&uploadId=${encodeURIComponent(uploadId)}`,
        {
          method: "PUT",
          body: chunk,
        },
      );

      if (!partRes.ok) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      const partData = await readJsonObject(partRes);
      const uploadedPartNumber = getJsonNumber(partData, "partNumber");
      const etag = getJsonString(partData, "etag");
      if (!uploadedPartNumber || !etag) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }
      parts.push({ partNumber: uploadedPartNumber, etag });

      uploadedBytes += end - start;
      onProgress?.(uploadedBytes / totalSize);
    }

    // 4. Complete the multipart upload — send all metadata for DB record
    const completeRes = await fetch(`/api/upload/multipart/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storageKey,
        uploadId,
        parts,
        filename,
        originalName,
        contentType: file.type,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        blurhash: metadata.blurhash,
        waveform: metadata.waveform,
        posterKey,
      }),
    });

    if (!completeRes.ok) {
      const data = await readJsonObject(completeRes);
      throw new Error(
        getJsonString(data, "error") ?? "Failed to complete upload",
      );
    }

    const completeData = await readJsonObject(completeRes);
    const resultId = getJsonString(completeData, "id");
    const resultFilename = getJsonString(completeData, "filename");
    const resultUrl = getJsonString(completeData, "url");
    const resultMimeType = getJsonString(completeData, "mimeType");
    const resultSize = getJsonNumber(completeData, "size");
    if (
      !resultId ||
      !resultFilename ||
      !resultUrl ||
      !resultMimeType ||
      resultSize === undefined
    ) {
      throw new Error("Failed to complete upload");
    }

    return {
      id: resultId,
      filename: resultFilename,
      url: resultUrl,
      mimeType: resultMimeType,
      size: resultSize,
    };
  } catch (err) {
    // Abort on any failure — fire-and-forget cleanup
    fetch(`/api/upload/multipart/${id}/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey, uploadId }),
    }).catch(() => {});
    throw err;
  }
}
