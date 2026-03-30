/**
 * Compose Bridge
 *
 * Handles server communication between the Lit compose dialog and the server.
 * Manages file uploads, deferred submit flow, and toast notifications.
 */

import type { ComposeSubmitDetail } from "./components/compose-types.js";
import type { ComposeAttachment } from "./components/compose-types.js";
import type { ComposeSubmitAttachment } from "./components/compose-types.js";
import type { JantComposeDialog } from "./components/jant-compose-dialog.js";
import type { JantComposeEditor } from "./components/jant-compose-editor.js";
import type { PostAttachmentInput } from "../types.js";
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
  queueToastForNextPage,
} from "./toast.js";
import { openReplyForArticle } from "./compose-launch.js";
import { getJsonString, readJsonObject } from "./json.js";
import { uploadViaSession } from "./upload-session.js";
import { publicPath } from "./runtime-paths.js";
import { setupThreadContexts } from "./thread-context.js";
import { tiptapJsonToMarkdown } from "../lib/tiptap-to-markdown.js";
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
 * Upload a single file: process locally, then send it through the upload
 * session API so the backend can choose relay vs direct transport.
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

    // Text attachments keep summary/chars in the media record.
    let summary: string | undefined;
    let chars: number | undefined;
    const category = getMediaCategory(file.type);
    if (category === "text" && file.type !== "text/x-tiptap+json") {
      try {
        const textContent = await toUpload.text();
        const trimmed = textContent.replace(/\s+/g, " ").trim();
        chars = textContent.length;
        summary =
          trimmed.length <= 100 ? trimmed : trimmed.slice(0, 100) + "\u2026";
      } catch {
        // Ignore — summary is optional
      }
    } else if (file.type === "text/x-tiptap+json") {
      try {
        chars = extractTiptapAttachmentChars(await toUpload.text());
      } catch {
        // Char count is best-effort
      }
    }

    const result = await uploadViaSession(
      toUpload,
      {
        width,
        height,
        blurhash,
        waveform,
        poster,
        summary,
        chars,
      },
      (progress) => {
        editor?.updateAttachmentProgress(clientId, progress);
      },
    );

    editor?.updateAttachmentStatus(clientId, "done", result.id, null);
    return result.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    editor?.updateAttachmentStatus(clientId, "error", null, message);
    showToast(message, "error");
    return null;
  }
}

function extractTiptapAttachmentChars(raw: string): number | undefined {
  const envelope = JSON.parse(raw) as {
    json?: { content?: unknown[] };
  };
  if (!envelope.json) {
    return undefined;
  }

  let text = "";
  const walk = (node: Record<string, unknown>) => {
    if (typeof node.text === "string") {
      text += node.text;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (child && typeof child === "object") {
          walk(child as Record<string, unknown>);
        }
      }
    }
  };

  walk(envelope.json as Record<string, unknown>);
  return text.length;
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
  void openReplyForArticle(article);
});

// ── Submit handler ──────────────────────────────────────────────────

/** Build the JSON body for both create and update requests */
function buildPostBody(
  detail: ComposeSubmitDetail,
  attachments: PostAttachmentInput[],
) {
  const isQuote = detail.format === "quote";
  const isLink = detail.format === "link";
  const isEdit = !!detail.editPostId;
  const optionalTextValue = (value: string) => value || undefined;
  const nullableTextValue = (value: string) => value || null;

  return {
    format: detail.format,
    title: !isQuote
      ? isEdit
        ? nullableTextValue(detail.title)
        : optionalTextValue(detail.title)
      : undefined,
    body: isEdit
      ? nullableTextValue(detail.body)
      : optionalTextValue(detail.body),
    url: isLink
      ? isEdit
        ? nullableTextValue(detail.url)
        : optionalTextValue(detail.url)
      : isEdit
        ? null
        : undefined,
    sourceName: isQuote
      ? isEdit
        ? nullableTextValue(detail.quoteAuthor)
        : optionalTextValue(detail.quoteAuthor)
      : undefined,
    sourceUrl: isQuote
      ? isEdit
        ? nullableTextValue(detail.url)
        : optionalTextValue(detail.url)
      : undefined,
    quoteText: isQuote
      ? isEdit
        ? nullableTextValue(detail.quoteText)
        : optionalTextValue(detail.quoteText)
      : isEdit
        ? null
        : undefined,
    slug: detail.slug || undefined,
    status: detail.status,
    publishedAt: detail.status === "published" ? detail.publishedAt : undefined,
    visibility: detail.visibility || undefined,
    rating: isEdit
      ? detail.rating > 0
        ? detail.rating
        : null
      : detail.rating || undefined,
    collectionIds: detail.collectionIds,
    attachments: attachments.length > 0 ? attachments : undefined,
    replyToId: detail.replyToId || undefined,
  };
}

function hasAttachedTextChanged(
  attachment: Extract<ComposeSubmitAttachment, { type: "text" }>,
): boolean {
  return (
    JSON.stringify(attachment.bodyJson) !==
    JSON.stringify(attachment.originalBodyJson ?? null)
  );
}

function buildRequestAttachments(
  detail: ComposeSubmitDetail,
  pendingMediaIds: Map<string, string>,
): PostAttachmentInput[] {
  const requestAttachments: PostAttachmentInput[] = [];

  for (const attachment of detail.attachments) {
    if (attachment.type === "media") {
      const mediaId =
        attachment.mediaId ?? pendingMediaIds.get(attachment.clientId);
      if (!mediaId) continue;

      requestAttachments.push({
        type: "media",
        mediaId,
        alt: attachment.alt,
      });
      continue;
    }

    if (attachment.mediaId && !hasAttachedTextChanged(attachment)) {
      requestAttachments.push({
        type: "media",
        mediaId: attachment.mediaId,
      });
      continue;
    }

    requestAttachments.push({
      type: "text",
      contentFormat: "markdown",
      content: tiptapJsonToMarkdown(JSON.stringify(attachment.bodyJson)),
      summary: attachment.summary,
    });
  }

  return requestAttachments;
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
  const publishedMsg = labels?.published ?? "Published!";
  const viewLabel = labels?.view ?? "View";

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
  const queueSuccessToast = (
    msg: string,
    action?: { label: string; href: string },
  ) => {
    queueToastForNextPage(msg, "success", action);
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

    // Build clientId → mediaId map for file attachments completed by this submit
    const mediaClientIdMap = new Map<string, string>();
    for (const att of detail.pendingAttachments) {
      const idx = pendingClientIds.indexOf(att.clientId);
      const mediaId = results[idx];
      if (mediaId) mediaClientIdMap.set(att.clientId, mediaId);
    }
    const requestAttachments = buildRequestAttachments(
      detail,
      mediaClientIdMap,
    );

    const endpoint = isEdit ? `/api/posts/${detail.editPostId}` : "/compose";
    const method = isEdit ? "PUT" : "POST";

    const bodyPayload = buildPostBody(
      {
        ...detail,
        status: draftFallback ? "draft" : detail.status,
      },
      requestAttachments,
    );

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
      queueSuccessToast("Post updated.");
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
        queueSuccessToast(publishedMsg);
        composeEl?.preparePageLeave?.();
        globalThis.location.assign(permalink);
      } else if (detail.replyToId) {
        await refreshComposeCollections();
        const updated = await refreshReplyTarget(detail);
        if (!updated) {
          queueSuccessToast(
            publishedMsg,
            permalink ? { label: viewLabel, href: permalink } : undefined,
          );
          globalThis.location.reload();
          return;
        }
        toastMsg(publishedMsg);
      } else {
        // Reload the page so the timeline picks up the new post via a
        // full assembleTimeline() pass (correct thread previews, filters, etc.)
        queueSuccessToast(
          publishedMsg,
          permalink ? { label: viewLabel, href: permalink } : undefined,
        );
        globalThis.location.reload();
      }
      return;
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
