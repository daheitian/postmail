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
import {
  showToast,
  showToastWithAction,
  showPersistentToast,
  replaceWithAutoClose,
  replaceWithAutoCloseAction,
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
    const isEdit = !!detail.editPostId;
    const endpoint = isEdit ? `/api/posts/${detail.editPostId}` : "/compose";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildPostBody(detail)),
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error ?? "Something went wrong", "error");
      return;
    }

    if (isEdit) {
      showToast("Post updated.");
      dialog?.close();
      (document.activeElement as HTMLElement)?.blur();
      composeEl.reset();
      globalThis.location.reload();
      return;
    }

    const data = await res.json();
    const labels = composeEl.labels;

    if (data.status === "draft") {
      showToast(data.toast ?? "Draft saved.");
    } else if (data.status === "published") {
      // Only insert into timeline on the latest page
      if (data.cardHtml) {
        const timeline = document.querySelector<HTMLElement>(
          '[data-page="home"] #timeline-items',
        );
        if (timeline) {
          document.getElementById("empty-timeline")?.remove();
          timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
        }
      }

      const publishedMsg = labels?.published ?? "Published!";
      const viewLabel = labels?.view ?? "View";
      showToastWithAction(publishedMsg, {
        label: viewLabel,
        href: data.permalink,
      });
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
      replaceWithAutoClose(
        "compose-deferred",
        data.error ?? "Something went wrong",
        "error",
      );
      return;
    }

    if (isEdit) {
      replaceWithAutoClose("compose-deferred", "Post updated.");
      globalThis.location.reload();
      return;
    }

    const data = await res.json();

    if (data.status === "published") {
      // Only insert into timeline on the latest page
      if (data.cardHtml) {
        const timeline = document.querySelector<HTMLElement>(
          '[data-page="home"] #timeline-items',
        );
        if (timeline) {
          document.getElementById("empty-timeline")?.remove();
          timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
        }
      }

      const viewLabel = labels?.view ?? "View";
      replaceWithAutoCloseAction("compose-deferred", publishedMsg, {
        label: viewLabel,
        href: data.permalink,
      });
    } else {
      replaceWithAutoClose("compose-deferred", data.toast ?? "Draft saved.");
    }
  } catch {
    replaceWithAutoClose("compose-deferred", "Something went wrong", "error");
  }
});
