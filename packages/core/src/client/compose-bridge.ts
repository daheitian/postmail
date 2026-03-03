/**
 * Compose Bridge
 *
 * Handles server communication between the Lit compose dialog and the server.
 * Manages file uploads, deferred submit flow, and toast notifications.
 */

import type { ComposeSubmitDetail } from "./components/compose-types.js";
import type { ComposeAttachment } from "./components/compose-types.js";
import type { JantComposeDialog } from "./components/jant-compose-dialog.js";
import type { JantComposeEditor } from "./components/jant-compose-editor.js";
import { ImageProcessor } from "./image-processor.js";
import { VideoProcessor } from "./video-processor.js";
import { extractMediaMetadata } from "./media-metadata.js";
import {
  showToast,
  showToastWithAction,
  showPersistentToast,
  replaceWithAutoClose,
  replaceWithAutoCloseAction,
} from "./toast.js";
import { MULTIPART_THRESHOLD, uploadMultipart } from "./multipart-upload.js";

// ── Upload manager ──────────────────────────────────────────────────

/** Track in-flight upload promises keyed by clientId */
const uploadPromises = new Map<string, Promise<string | null>>();

/** Track attachments removed while their upload is still in flight */
const removedClientIds = new Set<string>();

/**
 * Upload a single file: process with ImageProcessor, then POST to /api/upload.
 * Returns the mediaId on success, null on failure.
 */
async function uploadFile(
  file: File,
  clientId: string,
  editor: JantComposeEditor | null,
): Promise<string | null> {
  try {
    let toUpload: File;
    let width: number | undefined;
    let height: number | undefined;
    let blurhash: string | undefined;
    let poster: Blob | undefined;

    if (file.type.startsWith("video/")) {
      // Video: transcode with mediabunny (requires WebCodecs)
      if (!VideoProcessor.isSupported()) {
        editor?.updateAttachmentStatus(
          clientId,
          "error",
          null,
          "Your browser doesn't support video processing. Use Chrome or Edge to upload videos.",
        );
        return null;
      }

      editor?.updateAttachmentStatus(clientId, "processing", null, null);
      const result = await VideoProcessor.processToFile(file, (progress) => {
        editor?.updateAttachmentProgress(clientId, progress);
      });
      toUpload = result.file;
      width = result.width;
      height = result.height;
      blurhash = result.blurhash;
      poster = result.poster;
    } else if (file.type.startsWith("image/")) {
      // Image: resize + convert to WebP
      const result = await ImageProcessor.processToFile(file);
      toUpload = result.file;
      width = result.width;
      height = result.height;
    } else {
      toUpload = file;
    }

    // Update status to uploading
    editor?.updateAttachmentStatus(clientId, "uploading", null, null);

    // Extract metadata for non-video files (video metadata comes from VideoProcessor)
    if (!file.type.startsWith("video/")) {
      const meta = await extractMediaMetadata(toUpload);
      width ??= meta.width;
      height ??= meta.height;
      blurhash ??= meta.blurhash;
      poster ??= meta.poster;
    }

    // Large files: use multipart upload to avoid Worker body size limit
    if (toUpload.size >= MULTIPART_THRESHOLD) {
      const result = await uploadMultipart({
        file: toUpload,
        metadata: { width, height, blurhash, poster },
        onProgress: (p) => editor?.updateAttachmentProgress(clientId, p),
      });
      editor?.updateAttachmentStatus(clientId, "done", result.id, null);
      return result.id;
    }

    // Small files: existing single-request upload
    const formData = new FormData();
    formData.append("file", toUpload);
    if (width) formData.append("width", String(width));
    if (height) formData.append("height", String(height));
    if (blurhash) formData.append("blurhash", blurhash);
    if (poster) formData.append("poster", poster, "poster.webp");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      const error = data.error ?? "Upload failed";
      editor?.updateAttachmentStatus(clientId, "error", null, error);
      showToast(error, "error");
      return null;
    }

    const data = await res.json();
    const mediaId = data.id as string;
    editor?.updateAttachmentStatus(clientId, "done", mediaId, null);
    return mediaId;
  } catch {
    editor?.updateAttachmentStatus(clientId, "error", null, "Upload failed");
    showToast("Upload failed", "error");
    return null;
  }
}

function getEditor(): JantComposeEditor | null {
  return document.querySelector("jant-compose-editor");
}

// ── Attachment removal handler ───────────────────────────────────────

document.addEventListener("jant:attachment-removed", (e: Event) => {
  const { clientId, mediaId } = (
    e as CustomEvent<{ clientId: string; mediaId: string | null }>
  ).detail;

  if (mediaId) {
    // Upload already finished — fire-and-forget delete
    fetch(`/api/upload/${mediaId}`, { method: "DELETE" }).catch(() => {});
  } else {
    // Upload still in flight — mark for cleanup after it finishes
    removedClientIds.add(clientId);
  }
});

// ── File selection handler ──────────────────────────────────────────

document.addEventListener("jant:files-selected", (e: Event) => {
  const event = e as CustomEvent<{
    files: { file: File; clientId: string }[];
  }>;
  const editor = getEditor();

  for (const { file, clientId } of event.detail.files) {
    const promise = uploadFile(file, clientId, editor).then((mediaId) => {
      // If the attachment was removed while uploading, delete it immediately
      if (removedClientIds.has(clientId)) {
        removedClientIds.delete(clientId);
        if (mediaId) {
          fetch(`/api/upload/${mediaId}`, { method: "DELETE" }).catch(() => {});
        }
        return null;
      }
      return mediaId;
    });
    uploadPromises.set(clientId, promise);
    promise.finally(() => uploadPromises.delete(clientId));
  }
});

// ── Submit handler ──────────────────────────────────────────────────

/** Build the JSON body for both create and update requests */
function buildPostBody(detail: ComposeSubmitDetail) {
  return {
    format: detail.format,
    title: detail.title || undefined,
    body: detail.body || undefined,
    url: detail.url || undefined,
    quoteText: detail.quoteText || undefined,
    status: detail.status,
    rating: detail.rating || undefined,
    collectionIds:
      detail.collectionIds.length > 0 ? detail.collectionIds : undefined,
    mediaIds: detail.mediaIds.length > 0 ? detail.mediaIds : undefined,
    mediaAlts:
      Object.keys(detail.mediaAlts).length > 0 ? detail.mediaAlts : undefined,
  };
}

/**
 * Upload text attachments as files to /api/upload.
 * Returns a map of clientId → mediaId for newly uploaded items.
 */
async function uploadTextAttachments(
  attachedTexts: ComposeSubmitDetail["attachedTexts"],
): Promise<Map<string, string>> {
  const clientIdToMediaId = new Map<string, string>();

  for (const item of attachedTexts) {
    // Always re-upload text attachments with content (content may have been edited)
    if (item.bodyJson === null) {
      // No content — keep existing mediaId if present
      if (item.mediaId) {
        clientIdToMediaId.set(item.clientId, item.mediaId);
      }
      continue;
    }

    const envelope = { json: item.bodyJson, html: item.bodyHtml ?? "" };
    const blob = new Blob([JSON.stringify(envelope)], {
      type: "text/x-tiptap+json",
    });
    const formData = new FormData();
    formData.append("file", blob, "attached-text.json");
    formData.append("summary", item.summary);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        clientIdToMediaId.set(item.clientId, data.id as string);
      }
    } catch {
      // Upload failed — skip this item
    }
  }

  return clientIdToMediaId;
}

// ── Deferred submit handler ─────────────────────────────────────────

interface DeferredDetail extends ComposeSubmitDetail {
  pendingAttachments: ComposeAttachment[];
}

document.addEventListener("jant:compose-submit-deferred", async (e: Event) => {
  const event = e as CustomEvent<DeferredDetail>;
  const detail = event.detail;
  const composeEl = document.querySelector(
    "jant-compose-dialog",
  ) as JantComposeDialog | null;

  // Get labels for toast messages
  const labels = composeEl?.labels;
  const uploadingMsg = labels?.uploading ?? "Uploading...";
  const publishedMsg = labels?.published ?? "Published!";
  const hasPending = detail.pendingAttachments.length > 0;

  // Show persistent toast only when uploads are still in flight
  if (hasPending) {
    showPersistentToast("compose-deferred", uploadingMsg);
  }

  /** Show result toast — replaces persistent toast if one exists, otherwise shows a new one */
  const toastMsg = (msg: string, type: "success" | "error" = "success") => {
    if (hasPending) {
      replaceWithAutoClose("compose-deferred", msg, type);
    } else {
      showToast(msg, type);
    }
  };
  const toastAction = (
    msg: string,
    action: { label: string; href: string },
  ) => {
    if (hasPending) {
      replaceWithAutoCloseAction("compose-deferred", msg, action);
    } else {
      showToastWithAction(msg, action);
    }
  };

  try {
    // Wait for all pending uploads to complete
    const pendingClientIds = detail.pendingAttachments.map((a) => a.clientId);
    const pendingPromises = pendingClientIds
      .map((id) => uploadPromises.get(id))
      .filter((p): p is Promise<string | null> => p !== undefined);

    const results = await Promise.all(pendingPromises);

    // If any pending upload failed, abort the post
    const failedCount = results.filter((id) => id === null).length;
    if (failedCount > 0) {
      toastMsg("Upload failed. Post not created.", "error");
      return;
    }

    // Merge newly completed mediaIds with already-done ones
    const newMediaIds = results.filter((id): id is string => id !== null);

    // Build clientId → mediaId map for file attachments
    const mediaClientIdMap = new Map<string, string>();
    for (const att of detail.pendingAttachments) {
      const idx = pendingClientIds.indexOf(att.clientId);
      const mediaId = results[idx];
      if (mediaId) mediaClientIdMap.set(att.clientId, mediaId);
    }
    // Upload text attachments as files
    const textMediaMap = await uploadTextAttachments(detail.attachedTexts);

    // Merge alt text: for pending attachments that just uploaded,
    // map their clientId → mediaId and include their alt text
    const mediaAlts = { ...detail.mediaAlts };
    for (const att of detail.pendingAttachments) {
      if (att.alt) {
        const mediaId = mediaClientIdMap.get(att.clientId);
        if (mediaId) {
          mediaAlts[mediaId] = att.alt;
        }
      }
    }

    // Build clientId → mediaId for all file attachments.
    // Uses mediaClientMap captured at submit time (editor may be reset by now).
    const fileClientIdMap = new Map<string, string>(mediaClientIdMap);
    for (const [cid, mid] of Object.entries(detail.mediaClientMap ?? {})) {
      fileClientIdMap.set(cid, mid);
    }

    // Build final ordered list from attachmentOrder
    let allMediaIds: string[];
    if (detail.attachmentOrder && detail.attachmentOrder.length > 0) {
      allMediaIds = detail.attachmentOrder
        .map((clientId) => {
          // Check file attachments
          const fileId = fileClientIdMap.get(clientId);
          if (fileId) return fileId;
          // Check text attachments
          const textId = textMediaMap.get(clientId);
          if (textId) return textId;
          return null;
        })
        .filter((id): id is string => id !== null);
    } else {
      // Fallback: combine in order
      allMediaIds = [
        ...detail.mediaIds,
        ...newMediaIds,
        ...Array.from(textMediaMap.values()),
      ];
    }

    const isEdit = !!detail.editPostId;
    const endpoint = isEdit ? `/api/posts/${detail.editPostId}` : "/compose";
    const method = isEdit ? "PUT" : "POST";

    const bodyPayload = buildPostBody({
      ...detail,
      mediaIds: allMediaIds,
      mediaAlts,
    });

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const data = await res.json();
      toastMsg(data.error ?? "Something went wrong", "error");
      return;
    }

    if (isEdit) {
      toastMsg("Post updated.");
      globalThis.location.reload();
      return;
    }

    const data = await res.json();

    if (data.status === "published") {
      // Only insert into timeline on the first page of the latest feed
      if (data.cardHtml) {
        const timeline = document.querySelector<HTMLElement>(
          '[data-page="home"] #timeline-items',
        );
        const pageParam = new URLSearchParams(globalThis.location.search).get(
          "page",
        );
        const isFirstPage = !pageParam || pageParam === "1";
        if (timeline && isFirstPage) {
          document.getElementById("empty-timeline")?.remove();
          timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
        }
      }

      const viewLabel = labels?.view ?? "View";
      toastAction(publishedMsg, {
        label: viewLabel,
        href: data.permalink,
      });
    } else {
      toastMsg(data.toast ?? "Draft saved.");
    }
  } catch {
    toastMsg("Something went wrong", "error");
  }
});
