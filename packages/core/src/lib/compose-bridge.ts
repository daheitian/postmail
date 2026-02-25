/**
 * Compose Bridge
 *
 * Handles server communication between the Lit compose dialog and the server.
 * Manages file uploads, deferred submit flow, and toast notifications.
 */

import type { ComposeSubmitDetail } from "../ui/components/compose-types.js";
import type { ComposeAttachment } from "../ui/components/compose-types.js";
import type { JantComposeDialog } from "../ui/components/jant-compose-dialog.js";
import type { JantComposeEditor } from "../ui/components/jant-compose-editor.js";
import { ImageProcessor } from "./image-processor.js";
import { validateUploadFile } from "./upload.js";
import {
  showToast,
  showPersistentToast,
  replaceWithAutoClose,
} from "./toast.js";

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
    // Validate file type and size before uploading
    const validationError = validateUploadFile(file);
    if (validationError) {
      editor?.updateAttachmentStatus(clientId, "error", null, validationError);
      return null;
    }

    // Update status to uploading
    editor?.updateAttachmentStatus(clientId, "uploading", null, null);

    // Process images (resize, convert to WebP); upload non-images as-is
    const toUpload = file.type.startsWith("image/")
      ? await ImageProcessor.processToFile(file)
      : file;

    // Upload to server
    const formData = new FormData();
    formData.append("file", toUpload);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      const error = data.error ?? "Upload failed";
      editor?.updateAttachmentStatus(clientId, "error", null, error);
      return null;
    }

    const data = await res.json();
    const mediaId = data.id as string;
    editor?.updateAttachmentStatus(clientId, "done", mediaId, null);
    return mediaId;
  } catch {
    editor?.updateAttachmentStatus(clientId, "error", null, "Upload failed");
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

document.addEventListener("jant:compose-submit", async (e: Event) => {
  const event = e as CustomEvent<ComposeSubmitDetail>;
  const detail = event.detail;
  const dialog = document.getElementById(
    "compose-dialog",
  ) as HTMLDialogElement | null;
  const composeEl = document.querySelector(
    "jant-compose-dialog",
  ) as JantComposeDialog | null;

  if (!composeEl) return;
  composeEl.loading = true;

  try {
    const res = await fetch("/compose", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
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
          Object.keys(detail.mediaAlts).length > 0
            ? detail.mediaAlts
            : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error ?? "Something went wrong", "error");
      return;
    }

    const data = await res.json();

    if (data.status === "draft") {
      showToast(data.toast ?? "Draft saved.");
    } else if (data.status === "published" && data.cardHtml) {
      const timeline = document.getElementById("timeline-items");
      if (timeline) {
        document.getElementById("empty-timeline")?.remove();
        timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
      }
    }

    dialog?.close();
    // Prevent browser from restoring focus to the trigger button
    (document.activeElement as HTMLElement)?.blur();
    composeEl.reset();
  } catch {
    showToast("Something went wrong", "error");
  } finally {
    composeEl.loading = false;
  }
});

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

  // Show persistent toast
  showPersistentToast("compose-deferred", uploadingMsg);

  try {
    // Wait for all pending uploads to complete
    const pendingClientIds = detail.pendingAttachments.map((a) => a.clientId);
    const pendingPromises = pendingClientIds
      .map((id) => uploadPromises.get(id))
      .filter((p): p is Promise<string | null> => p !== undefined);

    const results = await Promise.all(pendingPromises);

    // Merge newly completed mediaIds with already-done ones
    const newMediaIds = results.filter((id): id is string => id !== null);
    const allMediaIds = [...detail.mediaIds, ...newMediaIds];

    // Merge alt text: for pending attachments that just uploaded,
    // map their clientId → mediaId and include their alt text
    const mediaAlts = { ...detail.mediaAlts };
    for (const att of detail.pendingAttachments) {
      if (att.alt) {
        // Find the mediaId from the upload result by matching clientId position
        const idx = pendingClientIds.indexOf(att.clientId);
        const mediaId = results[idx];
        if (mediaId) {
          mediaAlts[mediaId] = att.alt;
        }
      }
    }

    // POST to /compose
    const res = await fetch("/compose", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        format: detail.format,
        title: detail.title || undefined,
        body: detail.body || undefined,
        url: detail.url || undefined,
        quoteText: detail.quoteText || undefined,
        status: detail.status,
        rating: detail.rating || undefined,
        collectionIds:
          detail.collectionIds.length > 0 ? detail.collectionIds : undefined,
        mediaIds: allMediaIds.length > 0 ? allMediaIds : undefined,
        mediaAlts: Object.keys(mediaAlts).length > 0 ? mediaAlts : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      replaceWithAutoClose(
        "compose-deferred",
        data.error ?? "Something went wrong",
        "error",
      );
      return;
    }

    const data = await res.json();

    if (data.status === "published" && data.cardHtml) {
      const timeline = document.getElementById("timeline-items");
      if (timeline) {
        document.getElementById("empty-timeline")?.remove();
        timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
      }
    }

    replaceWithAutoClose(
      "compose-deferred",
      data.status === "draft" ? (data.toast ?? "Draft saved.") : publishedMsg,
    );
  } catch {
    replaceWithAutoClose("compose-deferred", "Something went wrong", "error");
  }
});
