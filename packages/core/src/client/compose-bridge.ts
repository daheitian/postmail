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
import { AudioProcessor } from "./audio-processor.js";
import { ImageProcessor } from "./image-processor.js";
import { VideoProcessor } from "./video-processor.js";
import {
  extractMediaMetadata,
  extractAudioWaveform,
} from "./media-metadata.js";
import {
  showToast,
  showPersistentToast,
  replaceWithAutoClose,
} from "./toast.js";
import { getJsonString, readJsonObject } from "./json.js";
import { MULTIPART_THRESHOLD, uploadMultipart } from "./multipart-upload.js";
import { publicPath } from "./runtime-paths.js";
import { setupThreadContexts } from "./thread-context.js";
import { getMediaCategory } from "../lib/upload.js";

function getComposeEditorFromEventTarget(
  target: globalThis.EventTarget | null,
): JantComposeEditor | null {
  return target instanceof globalThis.Element
    ? (target.closest("jant-compose-editor") as JantComposeEditor | null)
    : null;
}

function getComposeDialogFromEventTarget(
  target: globalThis.EventTarget | null,
): JantComposeDialog | null {
  return target instanceof globalThis.Element
    ? (target.closest("jant-compose-dialog") as JantComposeDialog | null)
    : null;
}

type ReplyRefreshKind = "timeline-item" | "post-card" | "post-view";

interface ReplyRefreshTarget {
  kind: ReplyRefreshKind;
  id: string;
}

function getReplyRefreshTarget(
  article: HTMLElement,
): ReplyRefreshTarget | null {
  const postView = article.closest<HTMLElement>("[data-post-view]");
  const postViewId = postView?.dataset.postViewId;
  if (postViewId) {
    return { kind: "post-view", id: postViewId };
  }

  const page = article.closest<HTMLElement>("[data-page]")?.dataset.page;
  const threadRootId = article.dataset.threadRootId ?? article.dataset.postId;
  if (page === "home" && threadRootId) {
    return { kind: "timeline-item", id: threadRootId };
  }

  const postId = article.dataset.postId;
  if (postId) {
    return { kind: "post-card", id: postId };
  }

  return null;
}

async function fetchPartialHtml(path: string): Promise<string | null> {
  const res = await fetch(path, {
    headers: { Accept: "text/html" },
  });
  if (!res.ok) return null;
  return res.text();
}

async function refreshTimelineThreadView(
  threadRootId: string,
): Promise<boolean> {
  try {
    const timelineItem = document.querySelector<HTMLElement>(
      `[data-timeline-item][data-thread-root-id="${threadRootId}"]`,
    );
    const content = timelineItem?.querySelector<HTMLElement>(
      "[data-timeline-item-content]",
    );
    if (!content) return false;

    const html = await fetchPartialHtml(
      `/_/timeline-item/${encodeURIComponent(threadRootId)}`,
    );
    if (!html) return false;

    content.innerHTML = html;
    setupThreadContexts(content);
    return true;
  } catch {
    return false;
  }
}

async function refreshPostCardView(postId: string): Promise<boolean> {
  try {
    const timelineItem = document
      .querySelector<HTMLElement>(`article[data-post-id="${postId}"]`)
      ?.closest<HTMLElement>("[data-timeline-item]");
    const html = await fetchPartialHtml(
      `/_/post-card/${encodeURIComponent(postId)}`,
    );
    if (!html) return false;

    if (timelineItem) {
      const content = timelineItem.querySelector<HTMLElement>(
        "[data-timeline-item-content]",
      );
      if (!content) return false;
      content.innerHTML = html;
      setupThreadContexts(content);
      return true;
    }

    const article = document.querySelector<HTMLElement>(
      `article[data-post-id="${postId}"]`,
    );
    if (!article) return false;

    article.outerHTML = html;
    const refreshed = document.querySelector<HTMLElement>(
      `article[data-post-id="${postId}"]`,
    );
    if (refreshed) {
      setupThreadContexts(refreshed);
    }
    return true;
  } catch {
    return false;
  }
}

async function refreshPostPageView(postId: string): Promise<boolean> {
  try {
    const container = document.querySelector<HTMLElement>(
      `[data-post-view][data-post-view-id="${postId}"]`,
    );
    if (!container) return false;

    const html = await fetchPartialHtml(
      `/_/post-view/${encodeURIComponent(postId)}`,
    );
    if (!html) return false;

    container.outerHTML = html;
    const refreshed = document.querySelector<HTMLElement>(
      `[data-post-view][data-post-view-id="${postId}"]`,
    );
    if (refreshed) {
      setupThreadContexts(refreshed);
    }
    return true;
  } catch {
    return false;
  }
}

async function refreshReplyTarget(
  detail: ComposeSubmitDetail,
): Promise<boolean> {
  if (!detail.replyRefreshKind || !detail.replyRefreshId) {
    return false;
  }

  if (detail.replyRefreshKind === "timeline-item") {
    return refreshTimelineThreadView(
      detail.replyThreadRootId ?? detail.replyRefreshId,
    );
  }

  if (detail.replyRefreshKind === "post-view") {
    return refreshPostPageView(detail.replyRefreshId);
  }

  return refreshPostCardView(detail.replyRefreshId);
}

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
    let waveform: string | undefined;
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
    } else if (file.type.startsWith("audio/")) {
      // Audio: transcode to AAC (.m4a) (requires WebCodecs)
      if (!AudioProcessor.isSupported()) {
        editor?.updateAttachmentStatus(
          clientId,
          "error",
          null,
          "Your browser doesn't support audio processing. Use Chrome or Edge to upload audio.",
        );
        return null;
      }

      // Extract waveform from the original file before AudioProcessor runs
      try {
        waveform = await extractAudioWaveform(file);
      } catch {
        // Waveform extraction is best-effort
      }

      editor?.updateAttachmentStatus(clientId, "processing", null, null);
      const result = await AudioProcessor.processToFile(file, (progress) => {
        editor?.updateAttachmentProgress(clientId, progress);
      });
      toUpload = result.file;
    } else if (
      file.type.startsWith("image/") ||
      /\.heic$/i.test(file.name) ||
      /\.heif$/i.test(file.name)
    ) {
      // Image: convert HEIC/HEIF if needed, then resize + convert to WebP
      let imageFile = file;
      try {
        const { isHeic, heicTo } = await import("heic-to");
        if (await isHeic(file)) {
          editor?.updateAttachmentStatus(clientId, "processing", null, null);
          const blob = await heicTo({
            blob: file,
            type: "image/jpeg",
            quality: 0.92,
          });
          imageFile = new File([blob], file.name.replace(/\.heic$/i, ".jpg"), {
            type: "image/jpeg",
          });
          editor?.updateAttachmentPreview(clientId, imageFile);
        }
        const result = await ImageProcessor.processToFile(imageFile);
        toUpload = result.file;
        width = result.width;
        height = result.height;
      } catch {
        editor?.removeAttachment(clientId);
        showToast("Image format not supported.", "error");
        return null;
      }
    } else {
      toUpload = file;
    }

    // Update status to uploading
    editor?.updateAttachmentStatus(clientId, "uploading", null, null);

    // Extract metadata for non-video files (video metadata comes from VideoProcessor)
    // Audio waveform is already extracted above (before AudioProcessor runs).
    if (!file.type.startsWith("video/")) {
      const meta = await extractMediaMetadata(toUpload);
      width ??= meta.width;
      height ??= meta.height;
      blurhash ??= meta.blurhash;
      waveform ??= meta.waveform;
      poster ??= meta.poster;
    }

    // Large files: use multipart upload to avoid Worker body size limit
    if (toUpload.size >= MULTIPART_THRESHOLD) {
      const result = await uploadMultipart({
        file: toUpload,
        metadata: { width, height, blurhash, waveform, poster },
        onProgress: (p) => editor?.updateAttachmentProgress(clientId, p),
      });
      editor?.updateAttachmentStatus(clientId, "done", result.id, null);
      return result.id;
    }

    // For text-category files, read content and include summary
    let summary: string | undefined;
    const category = getMediaCategory(file.type);
    if (category === "text" && file.type !== "text/x-tiptap+json") {
      try {
        const textContent = await file.text();
        const trimmed = textContent.replace(/\s+/g, " ").trim();
        summary =
          trimmed.length <= 100 ? trimmed : trimmed.slice(0, 100) + "\u2026";
      } catch {
        // Ignore — summary is optional
      }
    }

    // Small files: existing single-request upload
    const formData = new FormData();
    formData.append("file", toUpload);
    if (width) formData.append("width", String(width));
    if (height) formData.append("height", String(height));
    if (blurhash) formData.append("blurhash", blurhash);
    if (waveform) formData.append("waveform", waveform);
    if (poster) formData.append("poster", poster, "poster.webp");
    if (summary) formData.append("summary", summary);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await readJsonObject(res);
      const error = getJsonString(data, "error") ?? "Upload failed";
      editor?.updateAttachmentStatus(clientId, "error", null, error);
      showToast(error, "error");
      return null;
    }

    const data = await readJsonObject(res);
    const mediaId = getJsonString(data, "id");
    if (!mediaId) {
      editor?.updateAttachmentStatus(clientId, "error", null, "Upload failed");
      showToast("Upload failed", "error");
      return null;
    }
    editor?.updateAttachmentStatus(clientId, "done", mediaId, null);
    return mediaId;
  } catch {
    editor?.updateAttachmentStatus(clientId, "error", null, "Upload failed");
    showToast("Upload failed", "error");
    return null;
  }
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
  const editor = getComposeEditorFromEventTarget(event.target);

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

// ── Reply trigger handler ───────────────────────────────────────────

document.addEventListener("click", (e: MouseEvent) => {
  const trigger = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-reply-trigger]",
  );
  if (!trigger) return;

  const article = trigger.closest<HTMLElement>("article[data-post]");
  if (!article) return;

  const postId = article.dataset.postId;
  const threadRootId = article.dataset.threadRootId ?? postId;
  const refreshTarget = getReplyRefreshTarget(article);
  if (!postId) return;

  // Capture rendered content from the DOM — reuses server-rendered cards
  // (NoteCard, LinkCard, QuoteCard) with all formats, media, and attachments
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelector("[data-post-meta]")?.remove();
  clone.querySelector(".post-status-badges")?.remove();
  const contentHtml = clone.innerHTML;

  const timeEl = article.querySelector<HTMLElement>("time.dt-published");
  const dateText = timeEl?.textContent?.trim() ?? "";

  const dialog = document.querySelector(
    "jant-compose-dialog",
  ) as JantComposeDialog | null;
  dialog?.openReply(
    postId,
    { contentHtml, dateText },
    threadRootId,
    refreshTarget ?? undefined,
  );
});

// ── Submit handler ──────────────────────────────────────────────────

/** Build the JSON body for both create and update requests */
function buildPostBody(detail: ComposeSubmitDetail) {
  const isQuote = detail.format === "quote";
  const isLink = detail.format === "link";

  return {
    format: detail.format,
    title: !isQuote ? detail.title || undefined : undefined,
    body: detail.body || undefined,
    url: isLink ? detail.url || undefined : undefined,
    sourceName: isQuote ? detail.quoteAuthor || undefined : undefined,
    sourceUrl: isQuote ? detail.url || undefined : undefined,
    quoteText: detail.quoteText || undefined,
    slug: detail.slug || undefined,
    status: detail.status,
    visibility: detail.visibility || undefined,
    rating: detail.rating || undefined,
    collectionIds: detail.collectionIds,
    mediaIds: detail.mediaIds.length > 0 ? detail.mediaIds : undefined,
    mediaAlts:
      Object.keys(detail.mediaAlts).length > 0 ? detail.mediaAlts : undefined,
    replyToId: detail.replyToId || undefined,
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
        const data = await readJsonObject(res);
        const mediaId = getJsonString(data, "id");
        if (mediaId) {
          clientIdToMediaId.set(item.clientId, mediaId);
        }
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
  const composeEl =
    getComposeDialogFromEventTarget(event.target) ??
    (document.querySelector("jant-compose-dialog") as JantComposeDialog | null);
  const isPageMode = !!composeEl?.pageMode;

  // Get labels for toast messages
  const labels = composeEl?.labels;
  const uploadingMsg = labels?.uploading ?? "Uploading...";
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
  const resetPageCompose = () => {
    if (!isPageMode || !composeEl) return;
    composeEl.reset();
    composeEl.updateComplete.then(() => {
      composeEl
        .querySelector<JantComposeEditor>("jant-compose-editor")
        ?.focusInput();
    });
  };
  const clearPageLoading = () => {
    if (!isPageMode || !composeEl) return;
    composeEl.loading = false;
  };
  const refreshComposeCollections = async () => {
    await composeEl?.refreshCollections();
  };
  const leavePageAfterConfirmSave = () => {
    if (!isPageMode || !composeEl) return false;
    if (!composeEl.consumePageLeaveRequest()) return false;
    composeEl.preparePageLeave();
    globalThis.location.assign(composeEl.closeHref || publicPath("/"));
    return true;
  };
  const isEdit = !!detail.editPostId;
  let draftFallback: "upload" | "server" | null = null;

  try {
    // Wait for all pending uploads to complete
    const pendingClientIds = detail.pendingAttachments.map((a) => a.clientId);
    const pendingPromises = pendingClientIds
      .map((id) => uploadPromises.get(id))
      .filter((p): p is Promise<string | null> => p !== undefined);

    const results = await Promise.all(pendingPromises);

    // If any pending upload failed:
    // - For new publishes: filter out failed uploads and save as draft
    // - Otherwise: abort
    const failedCount = results.filter((id) => id === null).length;
    if (failedCount > 0) {
      if (detail.status === "published" && !isEdit) {
        draftFallback = "upload";
      } else {
        clearPageLoading();
        toastMsg("Upload failed. Post not created.", "error");
        return;
      }
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

    const endpoint = isEdit ? `/api/posts/${detail.editPostId}` : "/compose";
    const method = isEdit ? "PUT" : "POST";

    const bodyPayload = buildPostBody({
      ...detail,
      status: draftFallback ? "draft" : detail.status,
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
      // Server error on a new publish: retry as draft
      if (detail.status === "published" && !isEdit && !draftFallback) {
        const retryPayload = { ...bodyPayload, status: "draft" };
        const retryRes = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(retryPayload),
        });

        if (retryRes.ok) {
          draftFallback = "server";
          const retryData = await readJsonObject(retryRes);
          const fallbackMsg =
            labels?.publishFailedDraft ?? "Couldn't publish. Saved as draft.";
          await refreshComposeCollections();
          if (!leavePageAfterConfirmSave()) {
            resetPageCompose();
          }
          toastMsg(fallbackMsg);
          const retryToast = getJsonString(retryData, "toast");
          if (retryToast) toastMsg(retryToast);
          return;
        }
      }

      const data = await readJsonObject(res);
      clearPageLoading();
      toastMsg(getJsonString(data, "error") ?? "Something went wrong", "error");
      return;
    }

    if (isEdit) {
      toastMsg("Post updated.");
      if (isPageMode) {
        globalThis.location.assign(globalThis.location.pathname);
      } else {
        globalThis.location.reload();
      }
      return;
    }

    // Upload fallback: show specific message instead of normal flow
    if (draftFallback === "upload") {
      const fallbackMsg =
        labels?.uploadFailedDraft ?? "Some uploads failed. Saved as draft.";
      await refreshComposeCollections();
      resetPageCompose();
      toastMsg(fallbackMsg);
      return;
    }

    const data = await readJsonObject(res);
    const status = getJsonString(data, "status");
    const permalink = getJsonString(data, "permalink");
    const toast = getJsonString(data, "toast");

    if (status === "published") {
      if (isPageMode && permalink) {
        composeEl?.preparePageLeave?.();
        globalThis.location.assign(permalink);
      } else if (detail.replyToId) {
        await refreshComposeCollections();
        const updated = await refreshReplyTarget(detail);
        if (!updated) {
          globalThis.location.reload();
        }
      } else {
        // Reload the page so the timeline picks up the new post via a
        // full assembleTimeline() pass (correct thread previews, filters, etc.)
        globalThis.location.reload();
      }
    } else {
      await refreshComposeCollections();
      if (!leavePageAfterConfirmSave()) {
        resetPageCompose();
      }
      toastMsg(toast ?? "Draft saved.");
    }
  } catch {
    clearPageLoading();
    toastMsg("Something went wrong", "error");
  }
});
