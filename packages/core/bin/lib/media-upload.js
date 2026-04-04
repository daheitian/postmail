import { basename, extname } from "node:path";
import { readFile } from "node:fs/promises";
import {
  requestJson,
  requestRaw,
  resolveRequestUrl,
} from "./http-api.js";

const MIME_TYPES = {
  ".avif": "image/avif",
  ".csv": "text/csv",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".md": "text/markdown",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function inferContentType(filePath, explicitContentType) {
  const trimmed = explicitContentType?.trim();
  if (trimmed) {
    return trimmed;
  }

  const ext = extname(filePath).toLowerCase();
  const inferred = MIME_TYPES[ext];
  if (inferred) {
    return inferred;
  }

  throw new Error(
    `Couldn't infer a content type for ${filePath}. Pass --content-type explicitly.`,
  );
}

function buildCompletePayload(metadata, parts) {
  return {
    ...(metadata.width === undefined ? {} : { width: metadata.width }),
    ...(metadata.height === undefined ? {} : { height: metadata.height }),
    ...(metadata.durationSeconds === undefined
      ? {}
      : { durationSeconds: metadata.durationSeconds }),
    ...(metadata.blurhash === undefined ? {} : { blurhash: metadata.blurhash }),
    ...(metadata.waveform === undefined ? {} : { waveform: metadata.waveform }),
    ...(metadata.summary === undefined ? {} : { summary: metadata.summary }),
    ...(metadata.chars === undefined ? {} : { chars: metadata.chars }),
    ...(parts ? { parts } : {}),
  };
}

async function uploadTransportBytes({
  fileBytes,
  siteUrl,
  token,
  transport,
}) {
  switch (transport.kind) {
    case "relay": {
      await requestRaw({
        body: fileBytes,
        method: "PUT",
        token,
        url: resolveRequestUrl(siteUrl, transport.url),
      });
      return undefined;
    }
    case "put": {
      await requestRaw({
        body: fileBytes,
        headers: transport.headers,
        method: transport.method,
        url: transport.url,
      });
      return undefined;
    }
    case "multipartRelay": {
      const parts = [];

      for (
        let offset = 0, partNumber = 1;
        offset < fileBytes.byteLength;
        offset += transport.partSize, partNumber += 1
      ) {
        const partUrl = new URL(resolveRequestUrl(siteUrl, transport.url));
        partUrl.searchParams.set("partNumber", String(partNumber));
        const chunk = fileBytes.subarray(offset, offset + transport.partSize);
        const { json } = await requestRaw({
          body: chunk,
          method: "PUT",
          token,
          url: partUrl.toString(),
        });

        parts.push(json);
      }

      return parts;
    }
    default:
      throw new Error(`Unsupported upload transport: ${transport.kind}`);
  }
}

export async function uploadMediaFile({
  alt,
  blurhash,
  chars,
  contentType,
  durationSeconds,
  filePath,
  height,
  posterPath,
  siteUrl,
  summary,
  token,
  waveform,
  width,
}) {
  const fileBytes = await readFile(filePath);
  const resolvedContentType = inferContentType(filePath, contentType);
  const filename = basename(filePath);
  const init = await requestJson({
    siteUrl,
    path: "/api/uploads/init",
    method: "POST",
    token,
    body: {
      filename,
      contentType: resolvedContentType,
      size: fileBytes.byteLength,
    },
  });

  if (
    !init ||
    typeof init !== "object" ||
    !("id" in init) ||
    !("transport" in init) ||
    !init.transport ||
    typeof init.transport !== "object" ||
    !("kind" in init.transport)
  ) {
    throw new Error("Upload init returned an unexpected response.");
  }

  const parts = await uploadTransportBytes({
    fileBytes,
    siteUrl,
    token,
    transport: init.transport,
  });

  if (posterPath?.trim()) {
    const posterBytes = await readFile(posterPath);
    await requestRaw({
      body: posterBytes,
      method: "PUT",
      token,
      url: resolveRequestUrl(siteUrl, `/api/uploads/${init.id}/poster`),
    });
  }

  const complete = await requestJson({
    siteUrl,
    path: `/api/uploads/${init.id}/complete`,
    method: "POST",
    token,
    body: buildCompletePayload(
      {
        alt,
        blurhash,
        chars,
        durationSeconds,
        height,
        summary,
        waveform,
        width,
      },
      Array.isArray(parts) ? parts : undefined,
    ),
  });

  if (!complete || typeof complete !== "object" || !("id" in complete)) {
    throw new Error("Upload complete returned an unexpected response.");
  }

  if (alt !== undefined) {
    return requestJson({
      siteUrl,
      path: `/api/upload/${complete.id}`,
      method: "PATCH",
      token,
      body: {
        alt,
      },
    });
  }

  return requestJson({
    siteUrl,
    path: `/api/upload/${complete.id}`,
    token,
  });
}
