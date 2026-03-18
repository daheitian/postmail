/**
 * Compose Dialog
 *
 * Outer shell for the compose dialog: header with format switcher,
 * collection selector, action row, and attachment upload coordination.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { Editor, JSONContent } from "@tiptap/core";
import type {
  ComposeFormat,
  ComposeVisibility,
  ComposeLabels,
  ComposeCollection,
  ComposeSubmitDetail,
  ComposeAttachment,
  DraftItem,
  LocalDraft,
} from "./compose-types.js";
import type { CollectionSubmitDetail } from "./collection-types.js";
import { showConfirmDialog } from "../confirm.js";
import { showToast } from "../toast.js";
import { publicPath } from "../runtime-paths.js";
import type { JantComposeEditor } from "./jant-compose-editor.js";
import { getMediaCategory } from "../../lib/upload.js";
import { getSlugValidationIssue } from "../../lib/slug-format.js";
import { createTiptapEditor } from "../tiptap/create-editor.js";
import { renderCollectionIcon } from "../../lib/icons.js";

interface ReplyToData {
  contentHtml: string;
  dateText: string;
}

interface ComposeStateSnapshot {
  format: ComposeFormat;
  collectionIds: string[];
  slug: string;
  visibility: ComposeVisibility;
  featured: boolean;
  title: string;
  bodyJson: JSONContent | null;
  url: string;
  quoteText: string;
  quoteAuthor: string;
  rating: number;
  showTitle: boolean;
  showRating: boolean;
  attachments: Array<{
    clientId: string;
    mediaId: string | null;
    previewUrl: string;
    mimeType: string;
    alt: string;
    status: ComposeAttachment["status"];
    summary: string | null;
    chars: number | null;
  }>;
  attachedTexts: Array<{
    clientId: string;
    mediaId: string | null;
    bodyJson: JSONContent | null;
    bodyHtml: string;
    summary: string;
  }>;
  attachmentOrder: string[];
}

export class JantComposeDialog extends LitElement {
  static properties = {
    collections: { type: Array },
    labels: { type: Object },
    uploadMaxFileSize: { type: Number, attribute: "upload-max-file-size" },
    pageMode: { type: Boolean, attribute: "page-mode" },
    closeHref: { type: String, attribute: "close-href" },
    autoRestoreDraft: { type: Boolean, attribute: "auto-restore-draft" },
    _format: { state: true },
    _status: { state: true },
    _loading: { state: true },
    _collectionIds: { state: true },
    _showCollection: { state: true },
    _showMoreMenu: { state: true },
    _collectionSearch: { state: true },
    _altPanelOpen: { state: true },
    _altPanelIndex: { state: true },
    _attachedPanelOpen: { state: true },
    _attachedTextIndex: { state: true },
    _confirmPanelOpen: { state: true },
    _editPostId: { state: true },
    _draftSourceId: { state: true },
    _draftsPanelOpen: { state: true },
    _drafts: { state: true },
    _draftsLoading: { state: true },
    _draftsError: { state: true },
    _draftMenuOpenId: { state: true },
    _addCollectionPanelOpen: { state: true },
    _replyToId: { state: true },
    _replyToData: { state: true },
    _replyExpanded: { state: true },
    _slug: { state: true },
    _visibility: { state: true },
    _featured: { state: true },
    _showPublishPanel: { state: true },
    _moreSlugExpanded: { state: true },
    _visibilityLocked: { state: true },
  };

  declare collections: ComposeCollection[];
  declare labels: ComposeLabels;
  declare uploadMaxFileSize: number;
  declare pageMode: boolean;
  declare closeHref: string;
  declare autoRestoreDraft: boolean;
  declare _format: ComposeFormat;
  declare _status: "published" | "draft";
  declare _loading: boolean;
  declare _collectionIds: string[];
  declare _showCollection: boolean;
  declare _showMoreMenu: boolean;
  declare _collectionSearch: string;
  declare _altPanelOpen: boolean;
  declare _altPanelIndex: number;
  declare _attachedPanelOpen: boolean;
  declare _attachedTextIndex: number;
  declare _confirmPanelOpen: boolean;
  declare _editPostId: string | null;
  declare _draftSourceId: string | null;
  declare _draftsPanelOpen: boolean;
  declare _drafts: DraftItem[];
  declare _draftsLoading: boolean;
  declare _draftsError: string | null;
  declare _draftMenuOpenId: string | null;
  declare _addCollectionPanelOpen: boolean;
  declare _replyToId: string | null;
  declare _replyToData: ReplyToData | null;
  declare _replyExpanded: boolean;
  declare _slug: string;
  declare _visibility: ComposeVisibility;
  declare _featured: boolean;
  declare _showPublishPanel: boolean;
  declare _moreSlugExpanded: boolean;
  declare _visibilityLocked: boolean;

  private _attachedEditor: Editor | null = null;
  private _attachedTextSnapshot: JSONContent | null = null;
  private _confirmForDrafts = false;
  private _draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private _draftRestored = false;
  private _initialSnapshot: string | null = null;
  private _pageFocusApplied = false;
  private _pageLeaveRequested = false;
  private _replyThreadRootId: string | null = null;
  private _replyRefreshKind:
    | "timeline-item"
    | "post-card"
    | "post-view"
    | null = null;
  private _replyRefreshId: string | null = null;
  private _suppressBeforeUnload = false;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.collections = [];
    this.labels = {} as ComposeLabels;
    this.uploadMaxFileSize = 500;
    this.pageMode = false;
    this.closeHref = "/";
    this.autoRestoreDraft = false;
    this._format = "note";
    this._status = "published";
    this._loading = false;
    this._collectionIds = [];
    this._showCollection = false;
    this._showMoreMenu = false;
    this._collectionSearch = "";
    this._altPanelOpen = false;
    this._altPanelIndex = 0;
    this._attachedPanelOpen = false;
    this._attachedTextIndex = 0;
    this._confirmPanelOpen = false;
    this._editPostId = null;
    this._draftSourceId = null;
    this._draftsPanelOpen = false;
    this._drafts = [];
    this._draftsLoading = false;
    this._draftsError = null;
    this._draftMenuOpenId = null;
    this._addCollectionPanelOpen = false;
    this._replyToId = null;
    this._replyToData = null;
    this._replyExpanded = false;
    this._replyThreadRootId = null;
    this._replyRefreshKind = null;
    this._replyRefreshId = null;
    this._slug = "";
    this._visibility = "public";
    this._featured = false;
    this._showPublishPanel = false;
    this._moreSlugExpanded = false;
    this._visibilityLocked = false;
  }

  private get _editor(): JantComposeEditor | null {
    return this.querySelector("jant-compose-editor");
  }

  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (this._initialSnapshot === null && this._editor) {
      this._captureInitialSnapshot();
    }
    if (
      changed.has("_addCollectionPanelOpen") &&
      this._addCollectionPanelOpen
    ) {
      this.updateComplete.then(() => {
        const titleInput = this.querySelector<HTMLInputElement>(
          "[data-collection-quick-dialog] [data-collection-title-input]",
        );
        titleInput?.focus();
        titleInput?.select();
      });
    }
    if (
      changed.has("_format") ||
      changed.has("_collectionIds") ||
      changed.has("_slug") ||
      changed.has("_visibility") ||
      changed.has("_featured")
    ) {
      // Schedule draft auto-save for new-post mode only
      if (!this._editPostId && !this._draftSourceId) {
        this._scheduleDraftSave();
      }
    }
  }

  reset() {
    this._format = "note";
    this._status = "published";
    this._loading = false;
    this._collectionIds = [];
    this._showCollection = false;
    this._showMoreMenu = false;
    this._collectionSearch = "";
    this._altPanelOpen = false;
    this._altPanelIndex = 0;
    this._attachedPanelOpen = false;
    this._attachedTextIndex = 0;
    this._confirmPanelOpen = false;
    this._editPostId = null;
    this._draftSourceId = null;
    this._draftsPanelOpen = false;
    this._drafts = [];
    this._draftsLoading = false;
    this._draftsError = null;
    this._draftMenuOpenId = null;
    this._addCollectionPanelOpen = false;
    this._replyToId = null;
    this._replyToData = null;
    this._replyExpanded = false;
    this._replyThreadRootId = null;
    this._replyRefreshKind = null;
    this._replyRefreshId = null;
    this._slug = "";
    this._visibility = "public";
    this._featured = false;
    this._showPublishPanel = false;
    this._moreSlugExpanded = false;
    this._visibilityLocked = false;
    this._confirmForDrafts = false;
    this._initialSnapshot = null;
    this._pageFocusApplied = false;
    this._pageLeaveRequested = false;
    this._suppressBeforeUnload = false;
    this._destroyAttachedEditor();
    this._editor?.reset();
    this._captureInitialSnapshot();
  }

  async openEdit(id: string) {
    this.reset();

    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) return;
    const post = await res.json();

    this._editPostId = id;
    this._format = post.format;
    this._slug = post.slug ?? "";
    this._visibility = post.visibility ?? "public";
    this._featured = false;
    this._visibilityLocked = Boolean(post.replyToId);

    // Pre-fill collection memberships if present
    if (post.collectionIds?.length) {
      this._collectionIds = post.collectionIds;
    }

    // Wait for Lit to render with the new format before populating editor
    await this.updateComplete;

    // Separate text media items from other media attachments
    const allMedia = post.mediaAttachments ?? [];
    const nonTextMedia = allMedia.filter(
      (m: { mimeType: string }) => !m.mimeType.startsWith("text/"),
    );
    const textMedia = allMedia.filter(
      (m: { mimeType: string }) => m.mimeType === "text/x-tiptap+json",
    );

    // Fetch text content for TipTap text media items (stored as { json, html } envelope)
    const textAttachments = await Promise.all(
      textMedia.map(
        async (m: { id: string; url: string; summary?: string }) => {
          try {
            const textRes = await fetch(`/api/media/${m.id}/content`);
            if (textRes.ok) {
              const raw = await textRes.text();
              const envelope = JSON.parse(raw) as {
                json?: unknown;
                html?: string;
              };
              return {
                bodyJson: JSON.stringify(envelope.json ?? {}),
                bodyHtml: envelope.html ?? "",
                summary: m.summary ?? "",
                mediaId: m.id,
              };
            }
          } catch {
            // Fetch failed — skip
          }
          return {
            bodyJson: "{}",
            bodyHtml: "",
            summary: m.summary ?? "",
            mediaId: m.id,
          };
        },
      ),
    );

    this._editor?.populate({
      format: post.format,
      title: post.title ?? undefined,
      bodyJson: post.body ?? undefined,
      url: post.url ?? undefined,
      quoteText: post.quoteText ?? undefined,
      quoteAuthor:
        post.format === "quote" ? (post.title ?? undefined) : undefined,
      rating: post.rating ?? undefined,
      media: nonTextMedia.map(
        (m: {
          id: string;
          previewUrl: string;
          alt?: string;
          mimeType: string;
        }) => ({
          id: m.id,
          previewUrl: m.previewUrl,
          alt: m.alt,
          mimeType: m.mimeType,
        }),
      ),
      textAttachments,
      attachmentOrder: allMedia.map((m: { id: string }) => m.id),
    });

    this.closest("dialog")?.showModal();
    globalThis.requestAnimationFrame(() => {
      this._editor?.focusInput();
      this._captureInitialSnapshot();
    });
  }

  /**
   * Open compose dialog in reply mode.
   *
   * @param id - UUID of the post being replied to
   * @param replyData - Pre-captured content from the DOM (avoids API fetch)
   * @param threadRootId - UUID of the thread root (used for in-place timeline refresh)
   * @param refreshTarget - Current view to patch after publishing the reply
   */
  async openReply(
    id: string,
    replyData?: ReplyToData,
    threadRootId?: string,
    refreshTarget?: {
      kind: "timeline-item" | "post-card" | "post-view";
      id: string;
    },
  ) {
    this.reset();
    this._replyToId = id;
    this._replyThreadRootId = threadRootId ?? id;
    this._replyRefreshKind = refreshTarget?.kind ?? null;
    this._replyRefreshId = refreshTarget?.id ?? null;
    this._replyToData = replyData ?? null;
    this._format = "note";

    this.closest("dialog")?.showModal();
    await this.updateComplete;
    this._editor?.focusInput();
    this._captureInitialSnapshot();
  }

  /**
   * Fetch parent post from API to populate reply context preview.
   * Falls back gracefully if the parent is unavailable (deleted, etc.).
   */
  private async _fetchReplyContext(replyToId: string) {
    try {
      const res = await fetch(`/api/posts/${replyToId}`);
      if (!res.ok) return;
      const post = await res.json();
      this._replyThreadRootId = (post.replyToId as string | null)
        ? (post.threadId as string)
        : (post.id as string);
      const dateText = post.publishedAt
        ? new Date(post.publishedAt * 1000).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "";
      this._replyToData = {
        contentHtml: (post.bodyHtml as string) ?? "",
        dateText,
      };
    } catch {
      // Parent unavailable — reply mode still works, just no preview
    }
  }

  set loading(v: boolean) {
    this._loading = v;
  }

  private _closeDialog() {
    const dialog = this.closest("dialog");
    if (dialog) {
      dialog.close();
      return;
    }

    if (this.pageMode) {
      this._suppressBeforeUnload = true;
      globalThis.location.assign(this.closeHref || publicPath("/"));
    }
  }

  requestCloseAndLeave() {
    this._pageLeaveRequested = true;
    this.requestClose();
  }

  consumePageLeaveRequest(): boolean {
    const shouldLeave = this._pageLeaveRequested;
    this._pageLeaveRequested = false;
    return shouldLeave;
  }

  preparePageLeave() {
    this._suppressBeforeUnload = true;
  }

  private _hasContent(): boolean {
    const editor = this._editor;
    if (!editor) return false;

    const data = editor.getData();
    if (data.body) return true;
    if (data.title.trim()) return true;
    if (data.url.trim()) return true;
    if (data.quoteText.trim()) return true;
    if (data.quoteAuthor.trim()) return true;
    if (data.attachedTexts.some((t) => t.bodyJson !== null)) return true;
    if (data.rating > 0) return true;
    if (data.attachments.length > 0) return true;
    // Collection selection alone isn't content — it's metadata that
    // only matters when paired with actual post content above.

    return false;
  }

  private _buildSnapshot(): ComposeStateSnapshot | null {
    const editor = this._editor;
    if (!editor) return null;

    return {
      format: this._format,
      collectionIds: [...this._collectionIds],
      slug: this._slug,
      visibility: this._visibility,
      featured: this._featured,
      title: editor._title,
      bodyJson: editor._bodyJson,
      url: editor._url,
      quoteText: editor._quoteText,
      quoteAuthor: editor._quoteAuthor,
      rating: editor._rating,
      showTitle: editor._showTitle,
      showRating: editor._showRating,
      attachments: editor._attachments.map((attachment) => ({
        clientId: attachment.clientId,
        mediaId: attachment.mediaId,
        previewUrl: attachment.previewUrl,
        mimeType: attachment.file.type,
        alt: attachment.alt,
        status: attachment.status,
        summary: attachment.summary,
        chars: attachment.chars,
      })),
      attachedTexts: editor._attachedTexts.map((item) => ({
        clientId: item.clientId,
        mediaId: item.mediaId ?? null,
        bodyJson: item.bodyJson,
        bodyHtml: item.bodyHtml,
        summary: item.summary,
      })),
      attachmentOrder: [...editor._attachmentOrder],
    };
  }

  private _serializeSnapshot(
    snapshot: ComposeStateSnapshot | null,
  ): string | null {
    if (!snapshot) return null;
    return JSON.stringify(snapshot);
  }

  private _captureInitialSnapshot() {
    this._initialSnapshot = this._serializeSnapshot(this._buildSnapshot());
  }

  private _hasUnsavedChanges(): boolean {
    const currentSnapshot = this._serializeSnapshot(this._buildSnapshot());
    if (currentSnapshot === null) return false;
    if (this._initialSnapshot === null) return this._hasContent();
    return currentSnapshot !== this._initialSnapshot;
  }

  requestClose() {
    if (this._loading) return;

    // Dismiss any open dropdowns first
    if (this._showCollection) {
      this._showCollection = false;
      this._collectionSearch = "";
    }
    if (this._showMoreMenu) {
      this._showMoreMenu = false;
      this._moreSlugExpanded = false;
    }
    if (this._showPublishPanel) {
      this._showPublishPanel = false;
    }

    if (this._confirmPanelOpen) {
      this._confirmPanelOpen = false;
      this._confirmForDrafts = false;
      this._pageLeaveRequested = false;
      this.updateComplete.then(() => this._editor?.focusInput());
      return;
    }

    // In edit mode, only prompt if actual changes were made
    if (this._editPostId) {
      if (this._hasUnsavedChanges()) {
        this._confirmForDrafts = false;
        this._confirmPanelOpen = true;
      } else {
        this._closeDialog();
        this.reset();
      }
      return;
    }

    if (this._hasContent()) {
      this._confirmForDrafts = false;
      this._confirmPanelOpen = true;
    } else {
      this._closeDialog();
      this.reset();
    }
  }

  private _discardAndClose() {
    if (this._draftSourceId) {
      const id = this._draftSourceId;
      fetch(`/api/posts/${id}`, { method: "DELETE" }).catch(() => {});
      showToast(this.labels.draftDeleted);
    }
    this._clearDraftFromStorage();
    this._confirmPanelOpen = false;
    this._closeDialog();
    (document.activeElement as HTMLElement)?.blur();
    this.reset();
  }

  private _handleConfirmSave() {
    if (this._confirmForDrafts) {
      this._dispatchSubmit("draft");
      this._confirmPanelOpen = false;
      this.reset();
      this._openDraftsPanel();
    } else if (this._editPostId) {
      // Editing a published post — publish the update directly
      this._confirmPanelOpen = false;
      this._submit("published");
    } else {
      this._confirmPanelOpen = false;
      this._submit("draft");
    }
  }

  private _handleConfirmDiscard() {
    if (this._confirmForDrafts) {
      if (this._draftSourceId) {
        const id = this._draftSourceId;
        fetch(`/api/posts/${id}`, { method: "DELETE" }).catch(() => {});
        showToast(this.labels.draftDeleted);
      }
      this._confirmPanelOpen = false;
      this.reset();
      this._openDraftsPanel();
    } else {
      this._discardAndClose();
    }
  }

  private _buildSubmitDetail(
    status: "published" | "draft",
  ): ComposeSubmitDetail | null {
    const editor = this._editor;
    if (!editor) return null;

    const editorData = editor.getData();
    const attachments = editorData.attachments ?? [];

    // Collect mediaIds from completed uploads
    const mediaIds = attachments
      .filter((a) => a.status === "done" && a.mediaId)
      .map((a) => a.mediaId as string);

    // Collect alt text keyed by mediaId
    const mediaAlts: Record<string, string> = {};
    for (const a of attachments) {
      if (a.mediaId && a.alt) {
        mediaAlts[a.mediaId] = a.alt;
      }
    }

    // Capture clientId → mediaId for all done attachments now,
    // because the editor will be reset before the deferred handler runs
    const mediaClientMap: Record<string, string> = {};
    for (const a of attachments) {
      if (a.mediaId) {
        mediaClientMap[a.clientId] = a.mediaId;
      }
    }

    return {
      format: this._format,
      title: editorData.title,
      body: editorData.body,
      url: editorData.url,
      quoteText: editorData.quoteText,
      quoteAuthor: editorData.quoteAuthor,
      slug: this._slug.trim() || undefined,
      status,
      visibility: this._visibilityLocked ? undefined : this._visibility,
      rating: editorData.rating,
      collectionIds: [...this._collectionIds],
      mediaIds,
      mediaAlts,
      attachedTexts: editorData.attachedTexts,
      attachmentOrder: editorData.attachmentOrder ?? [],
      mediaClientMap,
      editPostId: this._editPostId ?? this._draftSourceId ?? undefined,
      replyToId: this._replyToId ?? undefined,
      replyThreadRootId: this._replyThreadRootId ?? undefined,
      replyRefreshKind: this._replyRefreshKind ?? undefined,
      replyRefreshId: this._replyRefreshId ?? undefined,
    };
  }

  private _dispatchSubmit(status: "published" | "draft"): boolean {
    if (this._loading) return false;
    const editor = this._editor;
    if (!editor) return false;
    if (this._getSlugValidationMessage()) {
      this._revealSlugField();
      return false;
    }

    const detail = this._buildSubmitDetail(status);
    if (!detail) return false;

    const attachments = editor._attachments ?? [];
    const pendingAttachments = attachments.filter(
      (a) =>
        a.status === "pending" ||
        a.status === "processing" ||
        a.status === "uploading",
    );

    this.dispatchEvent(
      new CustomEvent("jant:compose-submit-deferred", {
        bubbles: true,
        detail: { ...detail, pendingAttachments },
      }),
    );
    return true;
  }

  private _submit(status: "published" | "draft") {
    this._showPublishPanel = false;
    this._clearDraftFromStorage();
    if (!this._dispatchSubmit(status)) return;
    if (this.pageMode) {
      this._loading = true;
      return;
    }
    this._closeDialog();
    // Prevent browser from restoring focus to the trigger button
    (document.activeElement as HTMLElement)?.blur();
    this.reset();
  }

  private _toggleCollection(id: string) {
    if (this._collectionIds.includes(id)) {
      this._collectionIds = this._collectionIds.filter((cid) => cid !== id);
    } else {
      this._collectionIds = [...this._collectionIds, id];
    }
  }

  private _selectedCollectionLabel(collections: ComposeCollection[]): string {
    const ids = this._collectionIds;
    const first = collections.find((c) => c.id === ids[0]);
    if (!first) return "";
    if (ids.length === 1) return first.title;
    return this.labels.collectionCountLabel
      .replace("%name%", first.title)
      .replace("%count%", String(ids.length - 1));
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._handleKeydown);
    this.addEventListener("jant:alt-panel-open", this._handleAltPanelOpen);
    this.addEventListener("jant:alt-panel-close", this._handleAltPanelClose);
    this.addEventListener(
      "jant:attached-panel-open",
      this._handleAttachedPanelOpen,
    );
    this.addEventListener(
      "jant:compose-content-changed",
      this._onContentChanged,
    );
    // Listen on document — fullscreen element lives on document.body, outside the dialog
    document.addEventListener(
      "jant:fullscreen-close",
      this._handleFullscreenClose as EventListener,
    );

    // Flush pending draft save before page unload (covers refresh/close mid-debounce)
    window.addEventListener("beforeunload", this._onBeforeUnload);

    // Intercept native dialog cancel (ESC) to route through requestClose
    const dialog = this.closest("dialog");
    if (dialog) {
      dialog.addEventListener("cancel", this._handleDialogCancel);
    }

    if (this.pageMode) {
      this.updateComplete.then(() => this._focusPageEditorOnMount());
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeydown);
    this.removeEventListener("jant:alt-panel-open", this._handleAltPanelOpen);
    this.removeEventListener("jant:alt-panel-close", this._handleAltPanelClose);
    this.removeEventListener(
      "jant:attached-panel-open",
      this._handleAttachedPanelOpen,
    );
    this.removeEventListener(
      "jant:compose-content-changed",
      this._onContentChanged,
    );
    document.removeEventListener(
      "jant:fullscreen-close",
      this._handleFullscreenClose as EventListener,
    );
    window.removeEventListener("beforeunload", this._onBeforeUnload);
    this._destroyAttachedEditor();
    this._cancelDraftSaveTimer();

    const dialog = this.closest("dialog");
    if (dialog) {
      dialog.removeEventListener("cancel", this._handleDialogCancel);
    }
  }

  private _handleDialogCancel = (e: Event) => {
    e.preventDefault();
    this.requestClose();
  };

  private _handleKeydown = (e: Event) => {
    const ke = e as globalThis.KeyboardEvent;
    if (ke.key === "Escape") {
      ke.preventDefault();
      ke.stopPropagation();
      if (this._showCollection) {
        this._showCollection = false;
        this._collectionSearch = "";
      } else if (this._showMoreMenu) {
        this._showMoreMenu = false;
        this._moreSlugExpanded = false;
      } else if (this._showPublishPanel) {
        this._showPublishPanel = false;
      } else if (this._addCollectionPanelOpen) {
        this._closeAddCollectionPanel();
      } else if (this._draftMenuOpenId) {
        this._draftMenuOpenId = null;
      } else if (this._draftsPanelOpen) {
        this._closeDraftsPanel();
      } else if (this._attachedPanelOpen) {
        this._cancelAttachedPanel();
      } else {
        this.requestClose();
      }
    } else if (ke.key === "Enter" && this._confirmPanelOpen) {
      ke.preventDefault();
      this._handleConfirmSave();
    } else if ((ke.metaKey || ke.ctrlKey) && ke.key === "Enter") {
      e.preventDefault();
      if (!this._canPublish()) return;
      this._submit("published");
    }
  };

  private _handleAltPanelOpen = (e: Event) => {
    const detail = (e as CustomEvent<{ index: number }>).detail;
    this._altPanelIndex = detail.index;
    this._altPanelOpen = true;
    this.updateComplete.then(() => {
      this.querySelector<HTMLInputElement>(".compose-alt-input")?.focus();
    });
  };

  private _handleAltPanelClose = () => {
    this._altPanelOpen = false;
  };

  private _getAltAttachment(): ComposeAttachment | null {
    return this._editor?._attachments[this._altPanelIndex] ?? null;
  }

  private _onAltInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this._editor?.updateAlt(this._altPanelIndex, value);
  }

  private _closeAltPanel() {
    this._altPanelOpen = false;
  }

  private _handleFullscreenClose = (
    e: CustomEvent<{ json: unknown; title: string }>,
  ) => {
    const editor = this._editor;
    if (editor) {
      editor.setEditorState(
        e.detail.json as import("@tiptap/core").JSONContent,
        e.detail.title,
      );
    }
  };

  private _handleAttachedPanelOpen = (e: Event) => {
    const detail = (e as CustomEvent<{ index: number }>).detail;
    this._attachedTextIndex = detail.index;
    this._attachedPanelOpen = true;
    this.updateComplete.then(() => {
      const container = this.querySelector<HTMLElement>(
        ".compose-attached-tiptap",
      );
      if (!container) return;
      const item = this._editor?._attachedTexts[this._attachedTextIndex];
      const content = item?.bodyJson ?? null;
      this._attachedTextSnapshot = content
        ? JSON.parse(JSON.stringify(content))
        : null;
      this._attachedEditor = createTiptapEditor({
        element: container,
        placeholder: this.labels.attachedTextPlaceholder,
        content,
        toolbarMode: "compose",
      });
      this._attachedEditor.commands.focus();
    });
  };

  private _isAttachedTextDirty(): boolean {
    if (!this._attachedEditor) return false;
    return (
      JSON.stringify(this._attachedEditor.getJSON()) !==
      JSON.stringify(this._attachedTextSnapshot)
    );
  }

  private _destroyAttachedEditor() {
    if (this._attachedEditor) {
      this._attachedEditor.destroy();
      this._attachedEditor = null;
    }
    this._attachedTextSnapshot = null;
  }

  private _doneAttachedPanel() {
    if (this._attachedEditor) {
      const json = this._attachedEditor.getJSON();
      const html = this._attachedEditor.getHTML();
      this._editor?.updateAttachedText(this._attachedTextIndex, json, html);
    }
    this._destroyAttachedEditor();
    this._attachedPanelOpen = false;
    this._editor?.closeAttachedPanel(this._attachedTextIndex);
  }

  private async _cancelAttachedPanel() {
    if (this._isAttachedTextDirty()) {
      const confirmed = await showConfirmDialog({
        message: this.labels.discardChangesConfirm,
        confirmLabel: this.labels.discard,
        cancelLabel: this.labels.cancel,
        tone: "danger",
      });
      if (!confirmed) return;
      this._destroyAttachedEditor();
      this._attachedPanelOpen = false;
      return;
    }
    // Revert to snapshot — don't save current editor content
    this._destroyAttachedEditor();
    this._attachedPanelOpen = false;
  }

  // ── Drafts panel ─────────────────────────────────────────────────

  private _handleDraftButtonClick() {
    if (this._loading) return;
    if (this._hasContent()) {
      this._confirmForDrafts = true;
      this._confirmPanelOpen = true;
    } else {
      this._openDraftsPanel();
    }
  }

  private async _openDraftsPanel() {
    this._draftsPanelOpen = true;
    this._draftsLoading = true;
    this._draftsError = null;
    this._draftMenuOpenId = null;

    try {
      const res = await fetch("/api/posts?status=draft&limit=50");
      if (!res.ok) throw new Error("Failed to load drafts");
      const json = await res.json();
      const posts = json.posts ?? json;
      this._drafts = (posts as Record<string, unknown>[]).map(
        (p): DraftItem => ({
          id: p.id as string,
          format: p.format as ComposeFormat,
          title: (p.title as string) ?? null,
          bodyText: (p.bodyText as string) ?? null,
          bodyHtml: (p.bodyHtml as string) ?? null,
          url: (p.url as string) ?? null,
          quoteText: (p.quoteText as string) ?? null,
          replyToId: (p.replyToId as string) ?? null,
          updatedAt: p.updatedAt as number,
          mediaAttachments: (
            (p.mediaAttachments as DraftItem["mediaAttachments"]) ?? []
          ).map((m) => ({
            id: m.id,
            previewUrl: m.previewUrl,
            alt: m.alt,
            mimeType: m.mimeType,
          })),
        }),
      );
    } catch {
      this._draftsError = "Could not load drafts. Try again.";
      this._drafts = [];
    } finally {
      this._draftsLoading = false;
    }
  }

  private _closeDraftsPanel() {
    this._draftsPanelOpen = false;
    this._draftMenuOpenId = null;
    this.updateComplete.then(() => this._editor?.focusInput());
  }

  private async _loadDraft(id: string) {
    this._draftsPanelOpen = false;
    this._draftMenuOpenId = null;
    this.reset();

    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) return;
    const post = await res.json();

    this._draftSourceId = id;
    this._format = post.format;
    this._slug = post.slug ?? "";
    this._visibility = post.visibility ?? "public";
    this._featured = false;
    this._visibilityLocked = Boolean(post.replyToId);

    if (post.collectionIds?.length) {
      this._collectionIds = post.collectionIds;
    }

    // Restore reply context if this draft was a reply
    if (post.replyToId) {
      this._replyToId = post.replyToId;
      await this._fetchReplyContext(post.replyToId);
    }

    await this.updateComplete;

    // Separate text media items from other media attachments
    const allMedia = post.mediaAttachments ?? [];
    const nonTextMedia = allMedia.filter(
      (m: { mimeType: string }) => !m.mimeType.startsWith("text/"),
    );
    const textMedia = allMedia.filter(
      (m: { mimeType: string }) => m.mimeType === "text/x-tiptap+json",
    );

    // Fetch text content for TipTap text media items (stored as { json, html } envelope)
    const textAttachments = await Promise.all(
      textMedia.map(
        async (m: { id: string; url: string; summary?: string }) => {
          try {
            const textRes = await fetch(`/api/media/${m.id}/content`);
            if (textRes.ok) {
              const raw = await textRes.text();
              const envelope = JSON.parse(raw) as {
                json?: unknown;
                html?: string;
              };
              return {
                bodyJson: JSON.stringify(envelope.json ?? {}),
                bodyHtml: envelope.html ?? "",
                summary: m.summary ?? "",
                mediaId: m.id,
              };
            }
          } catch {
            // Fetch failed — skip
          }
          return {
            bodyJson: "{}",
            bodyHtml: "",
            summary: m.summary ?? "",
            mediaId: m.id,
          };
        },
      ),
    );

    this._editor?.populate({
      format: post.format,
      title: post.title ?? undefined,
      bodyJson: post.body ?? undefined,
      url: post.url ?? undefined,
      quoteText: post.quoteText ?? undefined,
      quoteAuthor:
        post.format === "quote" ? (post.title ?? undefined) : undefined,
      rating: post.rating ?? undefined,
      media: nonTextMedia.map(
        (m: {
          id: string;
          previewUrl: string;
          alt?: string;
          mimeType: string;
        }) => ({
          id: m.id,
          previewUrl: m.previewUrl,
          alt: m.alt,
          mimeType: m.mimeType,
        }),
      ),
      textAttachments,
      attachmentOrder: allMedia.map((m: { id: string }) => m.id),
    });

    globalThis.requestAnimationFrame(() => {
      this._editor?.focusInput();
      this._captureInitialSnapshot();
    });
  }

  private async _deleteDraft(id: string) {
    this._draftMenuOpenId = null;
    this._drafts = this._drafts.filter((d) => d.id !== id);

    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(this.labels.draftDeleted);
    } catch {
      showToast("Failed to delete draft. Try again.", "error");
      this._openDraftsPanel();
    }
  }

  private _formatDraftDate(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  private _getDraftPreview(draft: DraftItem): string | null {
    if (draft.bodyText) return draft.bodyText;
    if (draft.title) return draft.title;
    if (draft.quoteText) return draft.quoteText;
    if (draft.url) return draft.url;
    return null;
  }

  // ── Local draft auto-save (globalThis.localStorage) ──────────────────────────

  private static _DRAFT_KEY = "jant:compose-draft";
  private static _DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  private _onContentChanged = () => {
    this.requestUpdate();
    // Schedule localStorage auto-save for new-post mode only
    if (!this._editPostId && !this._draftSourceId) {
      this._scheduleDraftSave();
    }
  };

  private _cancelDraftSaveTimer() {
    if (this._draftSaveTimer !== null) {
      clearTimeout(this._draftSaveTimer);
      this._draftSaveTimer = null;
    }
  }

  private _scheduleDraftSave() {
    this._cancelDraftSaveTimer();
    this._draftSaveTimer = setTimeout(() => this._saveDraftToStorage(), 1000);
  }

  /** Flush pending draft save and warn on unsaved changes before page unload */
  private _onBeforeUnload = (e: globalThis.BeforeUnloadEvent) => {
    if (this._suppressBeforeUnload) return;

    // Flush any pending debounced draft save
    if (this._draftSaveTimer !== null) {
      this._cancelDraftSaveTimer();
      this._saveDraftToStorage();
    }
    // Warn if compose has unsaved modifications in either dialog or page mode.
    const dialog = this.closest("dialog");
    const shouldWarn =
      this._hasUnsavedChanges() && (this.pageMode || dialog?.open === true);
    if (shouldWarn) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  private _saveDraftToStorage() {
    const editor = this._editor;
    if (!editor) return;

    const data = editor.getData();
    const hasContent =
      !!data.body ||
      !!data.title.trim() ||
      !!data.url.trim() ||
      !!data.quoteText.trim() ||
      !!data.quoteAuthor.trim() ||
      data.rating > 0 ||
      data.attachedTexts.some((t) => t.bodyJson !== null);

    if (!hasContent) {
      globalThis.localStorage.removeItem(JantComposeDialog._DRAFT_KEY);
      return;
    }

    const draft: LocalDraft = {
      format: this._format,
      title: data.title,
      bodyJson: editor._bodyJson,
      url: data.url,
      quoteText: data.quoteText,
      quoteAuthor: data.quoteAuthor,
      slug: this._slug,
      visibility: this._visibility,
      featured: this._featured,
      rating: data.rating,
      showTitle: editor._showTitle,
      showRating: editor._showRating,
      collectionIds: [...this._collectionIds],
      replyToId: this._replyToId,
      attachedTexts: data.attachedTexts.map((t) => ({
        clientId: t.clientId,
        bodyJson: t.bodyJson,
        bodyHtml: t.bodyHtml,
        summary: t.summary,
      })),
      attachmentOrder: [...(data.attachmentOrder ?? [])],
      savedAt: Date.now(),
    };

    try {
      globalThis.localStorage.setItem(
        JantComposeDialog._DRAFT_KEY,
        JSON.stringify(draft),
      );
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }

  private _clearDraftFromStorage() {
    this._cancelDraftSaveTimer();
    globalThis.localStorage.removeItem(JantComposeDialog._DRAFT_KEY);
  }

  async restoreLocalDraft() {
    // Don't restore if already in edit or draft-load mode
    if (this._editPostId || this._draftSourceId) return;
    // Don't restore if the editor already has content (e.g. reopened dialog)
    if (this._hasContent()) return;

    let raw: string | null;
    try {
      raw = globalThis.localStorage.getItem(JantComposeDialog._DRAFT_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let draft: LocalDraft;
    try {
      draft = JSON.parse(raw) as LocalDraft;
    } catch {
      globalThis.localStorage.removeItem(JantComposeDialog._DRAFT_KEY);
      return;
    }

    // Discard stale drafts
    if (Date.now() - draft.savedAt > JantComposeDialog._DRAFT_MAX_AGE) {
      globalThis.localStorage.removeItem(JantComposeDialog._DRAFT_KEY);
      return;
    }

    this._format = draft.format;
    this._collectionIds = [...(draft.collectionIds ?? [])];
    this._slug = draft.slug ?? "";
    this._visibility = draft.visibility ?? "public";
    this._featured = false;

    // Restore reply context if this draft was a reply
    if (draft.replyToId) {
      this._replyToId = draft.replyToId;
      await this._fetchReplyContext(draft.replyToId);
    }

    await this.updateComplete;

    const textAttachments = draft.attachedTexts
      ?.filter((t) => t.bodyJson !== null)
      .map((t) => ({
        clientId: t.clientId,
        bodyJson: JSON.stringify(t.bodyJson),
        bodyHtml: t.bodyHtml,
        summary: t.summary,
      }));

    this._editor?.populate({
      format: draft.format,
      title: draft.title || undefined,
      bodyJson: draft.bodyJson ? JSON.stringify(draft.bodyJson) : undefined,
      url: draft.url || undefined,
      quoteText: draft.quoteText || undefined,
      quoteAuthor: draft.quoteAuthor || undefined,
      rating: draft.rating || undefined,
      showTitle: draft.showTitle,
      showRating: draft.showRating,
      textAttachments: textAttachments?.length ? textAttachments : undefined,
      attachmentOrder: draft.attachmentOrder,
    });

    this._draftRestored = true;
    showToast(this.labels.draftRestored);
    globalThis.requestAnimationFrame(() => {
      this._captureInitialSnapshot();
    });
  }

  private async _focusPageEditorOnMount() {
    if (this._pageFocusApplied) return;

    if (this.autoRestoreDraft) {
      await this.restoreLocalDraft();
    }

    await this.updateComplete;
    globalThis.requestAnimationFrame(() => {
      this._editor?.focusInput();
      this._pageFocusApplied = true;
    });
  }

  private _renderDraftsPanel() {
    if (!this._draftsPanelOpen) return nothing;

    return html`
      <div class="compose-drafts-panel">
        <div class="compose-alt-header">
          <button
            type="button"
            class="compose-attached-panel-back"
            @click=${() => this._closeDraftsPanel()}
          >
            <svg
              class="icon-fine"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 3L6 8l5 5" />
            </svg>
          </button>
          <span class="compose-alt-title">${this.labels.drafts}</span>
        </div>
        ${this._draftsLoading
          ? html`<div class="compose-drafts-loading">
              <svg
                class="animate-spin size-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>`
          : this._draftsError
            ? html`<div class="compose-drafts-empty">${this._draftsError}</div>`
            : this._drafts.length === 0
              ? html`<div class="compose-drafts-empty">
                  ${this.labels.draftsEmpty}
                </div>`
              : html`<div class="compose-drafts-list">
                  ${this._drafts.map(
                    (draft, i) => html`
                      ${i > 0
                        ? html`<div class="compose-drafts-divider"></div>`
                        : nothing}
                      ${this._renderDraftItem(draft)}
                    `,
                  )}
                </div>`}
      </div>
    `;
  }

  private _renderDraftItem(draft: DraftItem) {
    const preview = this._getDraftPreview(draft);

    return html`
      <div class="compose-draft-item" @click=${() => this._loadDraft(draft.id)}>
        <div class="compose-draft-content">
          ${preview
            ? html`<div class="compose-draft-preview">${preview}</div>`
            : html`<div
                class="compose-draft-preview compose-draft-preview-empty"
              >
                Empty draft
              </div>`}
          <div class="compose-draft-meta">
            ${this._formatDraftDate(draft.updatedAt)}
          </div>
        </div>
        <div class="relative">
          ${this._draftMenuOpenId === draft.id
            ? html`<div
                class="compose-dropdown-backdrop"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._draftMenuOpenId = null;
                }}
              ></div>`
            : nothing}
          <button
            type="button"
            class="compose-draft-more"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._draftMenuOpenId =
                this._draftMenuOpenId === draft.id ? null : draft.id;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="8" r="1.2" />
              <circle cx="8" cy="8" r="1.2" />
              <circle cx="12" cy="8" r="1.2" />
            </svg>
          </button>
          ${this._draftMenuOpenId === draft.id
            ? html`
                <div class="compose-dropdown compose-dropdown-right">
                  <button
                    type="button"
                    class="compose-dropdown-item compose-dropdown-item-danger"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._deleteDraft(draft.id);
                    }}
                  >
                    ${this.labels.deleteDraft}
                  </button>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  // ── Reply context rendering ──────────────────────────────────────

  private _renderReplyContext() {
    if (!this._replyToId || !this._replyToData) return nothing;

    const { contentHtml, dateText } = this._replyToData;
    const isExpanded = this._replyExpanded;

    return html`
      <div class="compose-reply-row">
        <div class="compose-thread-dot"></div>
        <div
          class=${classMap({
            "compose-reply-context": true,
            expanded: isExpanded,
          })}
        >
          <div class="compose-reply-context-body">
            ${unsafeHTML(contentHtml)}
          </div>
          ${!isExpanded
            ? html`<div class="compose-reply-fade"></div>`
            : nothing}
        </div>
      </div>
      <div class="compose-reply-meta">
        ${dateText ? html`<span>${dateText}</span><span>·</span>` : nothing}
        <button
          type="button"
          class="compose-reply-toggle"
          @click=${() => {
            this._replyExpanded = !this._replyExpanded;
          }}
        >
          ${isExpanded ? this.labels.showLess : this.labels.showMore}
        </button>
      </div>
    `;
  }

  // ── Render helpers ────────────────────────────────────────────────

  private _renderHeader() {
    const formats: ComposeFormat[] = ["note", "link", "quote"];
    const formatLabels: Record<ComposeFormat, string> = {
      note: this.labels.note,
      link: this.labels.link,
      quote: this.labels.quote,
    };

    return html`
      <header class="compose-dialog-header">
        <button
          type="button"
          class="compose-dialog-cancel"
          @click=${() => this.requestClose()}
        >
          ${this.labels.cancel}
        </button>

        <div class="compose-dialog-header-center">
          ${this._editPostId
            ? html`<span class="compose-dialog-title"
                >${this.labels.editPost}</span
              >`
            : html`
                <div class="compose-segmented">
                  <div
                    class=${classMap({
                      "compose-format-pill": true,
                      "compose-format-pill-link": this._format === "link",
                      "compose-format-pill-quote": this._format === "quote",
                    })}
                  ></div>
                  ${formats.map(
                    (f) => html`
                      <button
                        type="button"
                        class=${classMap({
                          "compose-segmented-item": true,
                          "compose-segmented-item-active": this._format === f,
                        })}
                        @click=${() => {
                          this._format = f;
                          this._showPublishPanel = false;
                          globalThis.requestAnimationFrame(() =>
                            this._editor?.focusInput(),
                          );
                        }}
                      >
                        ${formatLabels[f]}
                      </button>
                    `,
                  )}
                </div>
              `}
        </div>

        <div class="flex items-center gap-1 shrink-0">
          ${this._editPostId
            ? nothing
            : html`<button
                type="button"
                class="compose-dialog-header-btn"
                title=${this.labels.saveDraft}
                ?disabled=${this._loading}
                @click=${() => this._handleDraftButtonClick()}
              >
                <svg
                  class="icon-fine"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 2.5L15.5 4 7 12.5l-3 .5.5-3L14 2.5z" />
                  <path d="M4 15h10" />
                </svg>
              </button>`}
          ${this._renderMoreMenu()}
        </div>
      </header>
    `;
  }

  private _renderMoreMenu() {
    const slugError = this._getSlugValidationMessage();

    return html`
      <div class="relative">
        ${this._showMoreMenu
          ? html`<div
              class="compose-dropdown-backdrop"
              @click=${() => {
                this._showMoreMenu = false;
                this._moreSlugExpanded = false;
              }}
            ></div>`
          : nothing}
        <button
          type="button"
          class="compose-dialog-header-btn"
          @click=${() => {
            this._showCollection = false;
            this._collectionSearch = "";
            this._showPublishPanel = false;
            if (this._showMoreMenu) {
              this._moreSlugExpanded = false;
              this._showMoreMenu = false;
              return;
            }
            this._showMoreMenu = true;
            this._moreSlugExpanded = Boolean(this._slug.trim());
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <circle cx="4.5" cy="9" r="1.3" />
            <circle cx="9" cy="9" r="1.3" />
            <circle cx="13.5" cy="9" r="1.3" />
          </svg>
        </button>
        ${this._showMoreMenu
          ? html`
              <div
                class="compose-dropdown compose-dropdown-right compose-more-menu"
              >
                <button
                  type="button"
                  class="compose-dropdown-item compose-dropdown-item-toggle"
                  aria-expanded=${this._moreSlugExpanded ? "true" : "false"}
                  @click=${() => this._toggleMoreSlugField()}
                >
                  <span>${this.labels.publishSlugLabel}</span>
                  <svg
                    class="compose-dropdown-toggle-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                ${this._moreSlugExpanded
                  ? html`
                      <div class="compose-dropdown-field">
                        <div class="compose-dropdown-input-wrap">
                          <span class="compose-dropdown-input-prefix">/</span>
                          <input
                            type="text"
                            class="compose-input compose-more-slug-input"
                            .value=${this._slug}
                            placeholder=${this.labels.publishSlugPlaceholder}
                            aria-invalid=${slugError ? "true" : "false"}
                            spellcheck="false"
                            autocapitalize="off"
                            autocomplete="off"
                            @input=${(e: Event) => this._onSlugInput(e)}
                          />
                        </div>
                        ${slugError
                          ? html`<p
                              class="text-xs text-destructive mt-1"
                              data-compose-slug-error
                            >
                              ${slugError}
                            </p>`
                          : nothing}
                      </div>
                    `
                  : nothing}
                <div class="compose-dropdown-divider"></div>
                <button
                  type="button"
                  class="compose-dropdown-item"
                  ?disabled=${this._loading || Boolean(slugError)}
                  @click=${() => {
                    this._submit("draft");
                    this._showMoreMenu = false;
                    this._moreSlugExpanded = false;
                  }}
                >
                  ${this.labels.saveAsDraft}
                </button>
                <div class="compose-dropdown-divider"></div>
                <button
                  type="button"
                  class="compose-dropdown-item compose-dropdown-item-danger"
                  @click=${() => {
                    this._showMoreMenu = false;
                    this._moreSlugExpanded = false;
                    this._discardAndClose();
                  }}
                >
                  ${this.labels.discard}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderCollectionSelector() {
    const collections = this.collections ?? [];
    const search = this._collectionSearch.toLowerCase();
    const filtered = search
      ? collections.filter((c) => c.title.toLowerCase().includes(search))
      : collections;
    const selectedCount = this._collectionIds.length;

    return html`
      <div class="flex-1 min-w-0">
        ${this._showCollection
          ? html`<div
              class="compose-dropdown-backdrop"
              @click=${() => {
                this._showCollection = false;
                this._collectionSearch = "";
              }}
            ></div>`
          : nothing}
        <div class="select compose-collection-select" data-select-initialized>
          <button
            type="button"
            class="compose-collection-trigger"
            @click=${() => {
              this._showMoreMenu = false;
              this._moreSlugExpanded = false;
              this._showPublishPanel = false;
              this._showCollection = !this._showCollection;
              if (!this._showCollection) {
                this._collectionSearch = "";
              }
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0 icon-fine"
            >
              <rect x="3" y="5" width="12" height="10" rx="2" />
              <path d="M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
            </svg>
            ${selectedCount > 0
              ? html`<span class="compose-collection-label"
                  >${this._selectedCollectionLabel(collections)}</span
                >`
              : html`<span>${this.labels.collection}</span>`}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0 opacity-50 icon-fine"
            >
              <path d="M3 4l2 2 2-2" />
            </svg>
          </button>
          <div
            data-popover
            data-side="bottom"
            aria-hidden=${this._showCollection ? "false" : "true"}
          >
            ${collections.length > 0
              ? html`<header>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    role="combobox"
                    placeholder=${this.labels.searchCollections}
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck="false"
                    .value=${this._collectionSearch}
                    @input=${(e: Event) => {
                      this._collectionSearch = (
                        e.target as HTMLInputElement
                      ).value;
                    }}
                  />
                </header>`
              : nothing}
            <div
              role="listbox"
              aria-multiselectable="true"
              data-empty=${filtered.length === 0
                ? search
                  ? this.labels.noCollections
                  : this.labels.emptyCollections
                : nothing}
            >
              ${filtered.map(
                (col) => html`
                  <div
                    role="option"
                    data-value=${col.id}
                    aria-selected=${this._collectionIds.includes(col.id)
                      ? "true"
                      : nothing}
                    @click=${() => this._toggleCollection(col.id)}
                  >
                    ${col.iconHtml
                      ? html`<span
                          class="inline-flex items-center justify-center w-4 h-4 shrink-0"
                          >${unsafeHTML(col.iconHtml)}</span
                        >`
                      : nothing}
                    ${col.title}
                  </div>
                `,
              )}
            </div>
            <div
              class="compose-collection-add-action"
              @click=${() => {
                this._showCollection = false;
                this._collectionSearch = "";
                this._addCollectionPanelOpen = true;
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3v10M3 8h10" />
              </svg>
              ${this.labels.addCollection}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Add Collection dialog ───────────────────────────────────────

  private _closeAddCollectionPanel() {
    this._addCollectionPanelOpen = false;
    this.updateComplete.then(() => {
      this.querySelector<HTMLElement>(".compose-collection-trigger")?.focus();
    });
  }

  private async _handleAddCollectionSubmit(e: Event) {
    const event = e as CustomEvent<CollectionSubmitDetail>;
    event.stopPropagation();

    const detail = event.detail;
    if (!detail) return;

    const formEl = this.querySelector("jant-collection-form") as
      | (HTMLElement & { loading: boolean })
      | null;
    if (formEl) formEl.loading = true;

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail.data),
      });
      const created = (await res.json().catch(() => null)) as {
        id: string;
        title: string;
        icon?: string | null;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(
          created?.error || "Couldn't create collection. Try again.",
        );
      }
      if (!created?.id || !created.title) {
        throw new Error("Couldn't create collection. Try again.");
      }
      const newCollection: ComposeCollection = {
        id: created.id,
        title: created.title,
        iconHtml: renderCollectionIcon(created.icon ?? null, { size: 16 }),
      };

      this.collections = [...this.collections, newCollection];
      this._collectionIds = [...this._collectionIds, created.id];
      this._closeAddCollectionPanel();
      showToast(this.labels.collectionFormLabels.createdLabel);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Couldn't create collection. Try again.",
        "error",
      );
    } finally {
      if (formEl) formEl.loading = false;
    }
  }

  private _submitAddCollectionForm() {
    const form = this.querySelector<HTMLFormElement>(
      "[data-collection-quick-dialog] form",
    );
    if (form) form.requestSubmit();
  }

  private _renderAddCollectionPanel() {
    if (!this._addCollectionPanelOpen) return nothing;

    const initial = {
      title: "",
      slug: "",
      description: "",
      sortOrder: "newest",
      icon: "",
    };

    return html`
      <div
        class="collection-quick-dialog-backdrop"
        @click=${() => this._closeAddCollectionPanel()}
      ></div>
      <div
        class="collection-quick-dialog"
        data-collection-quick-dialog
        role="dialog"
        aria-modal="true"
        aria-label=${this.labels.addCollection}
        @click=${(event: Event) => event.stopPropagation()}
      >
        <div class="collection-quick-dialog-header">
          <button
            type="button"
            class="collection-quick-dialog-cancel"
            @click=${() => this._closeAddCollectionPanel()}
          >
            ${this.labels.collectionFormLabels.cancelLabel}
          </button>
          <h2 class="collection-quick-dialog-title">
            ${this.labels.addCollection}
          </h2>
        </div>
        <div class="collection-quick-dialog-body">
          <jant-collection-form
            variant="quick"
            .labels=${this.labels.collectionFormLabels}
            .initial=${initial}
            action=${publicPath("/api/collections")}
            cancel-href="javascript:void(0)"
            @jant:collection-submit=${(e: Event) =>
              this._handleAddCollectionSubmit(e)}
          ></jant-collection-form>
          <p class="collection-quick-dialog-note">
            ${this.labels.collectionFormLabels.quickHint}
          </p>
        </div>
        <div class="collection-quick-dialog-footer">
          <button
            type="button"
            class="compose-post-btn collection-quick-dialog-submit"
            @click=${() => this._submitAddCollectionForm()}
          >
            ${this.labels.collectionFormLabels.quickSubmitLabel}
          </button>
        </div>
      </div>
    `;
  }

  private _renderAttachedPanel() {
    if (!this._attachedPanelOpen) return nothing;

    return html`
      <div class="compose-attached-panel">
        <div class="compose-alt-header">
          <button
            type="button"
            class="compose-attached-cancel"
            @click=${() => this._cancelAttachedPanel()}
          >
            ${this.labels.cancel}
          </button>
          <span class="compose-alt-title">${this.labels.attachedText}</span>
          <button
            type="button"
            class="compose-post-btn ml-auto"
            @click=${() => this._doneAttachedPanel()}
          >
            ${this.labels.done}
          </button>
        </div>
        <div class="flex-1 p-4 overflow-hidden flex flex-col">
          <div class="compose-attached-tiptap compose-tiptap-body"></div>
        </div>
      </div>
    `;
  }

  private _renderAltPanel() {
    if (!this._altPanelOpen) return nothing;
    const attachment = this._getAltAttachment();
    if (!attachment) return nothing;

    const category = getMediaCategory(attachment.file.type);

    return html`
      <div class="compose-alt-panel">
        <div class="compose-alt-header">
          <button
            type="button"
            class="compose-attached-panel-back"
            @click=${() => this._closeAltPanel()}
          >
            <svg
              class="icon-fine"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 3L6 8l5 5" />
            </svg>
          </button>
          <span class="compose-alt-title">${this.labels.addAltTitle}</span>
        </div>
        <div class="compose-alt-preview">
          ${category === "image"
            ? html`<img
                src=${attachment.previewUrl}
                alt=""
                class="compose-alt-preview-img"
              />`
            : category === "video"
              ? html`<video
                  src=${attachment.previewUrl}
                  class="compose-alt-preview-img"
                  preload="metadata"
                  muted
                ></video>`
              : html`<span class="text-sm text-muted-foreground"
                  >${attachment.file.name}</span
                >`}
        </div>
        <div class="compose-alt-input-row">
          <input
            type="text"
            .value=${attachment.alt}
            @input=${(e: Event) => this._onAltInput(e)}
            class="compose-input compose-alt-input"
            placeholder=${this.labels.altPlaceholder}
          />
        </div>
        <div class="compose-alt-footer">
          <span class="text-xs text-muted-foreground"
            >${this.labels.altHint}</span
          >
          <button
            type="button"
            class="compose-post-btn"
            @click=${() => this._closeAltPanel()}
          >
            ${this.labels.done}
          </button>
        </div>
      </div>
    `;
  }

  private _renderConfirmPanel() {
    if (!this._confirmPanelOpen) return nothing;

    const isEdit = !!this._editPostId;
    const title = isEdit
      ? this.labels.confirmEditTitle
      : this.labels.confirmCloseTitle;
    const subtitle = isEdit
      ? this.labels.confirmEditSubtitle
      : this.labels.confirmCloseSubtitle;
    const saveLabel = isEdit
      ? this.labels.confirmEditPublish
      : this.labels.confirmCloseSave;
    const discardLabel = isEdit
      ? this.labels.confirmEditDiscard
      : this.labels.confirmCloseDiscard;

    return html`
      <div class="compose-confirm-panel">
        <div class="compose-confirm-sheet">
          <div class="compose-confirm-header">
            <p class="compose-confirm-title">${title}</p>
            <p class="compose-confirm-subtitle">${subtitle}</p>
          </div>
          <button
            type="button"
            class="compose-confirm-action compose-confirm-save"
            @click=${() => this._handleConfirmSave()}
          >
            ${saveLabel}
          </button>
          <button
            type="button"
            class="compose-confirm-action compose-confirm-discard"
            @click=${() => this._handleConfirmDiscard()}
          >
            ${discardLabel}
          </button>
          <button
            type="button"
            class="compose-confirm-action compose-confirm-cancel"
            @click=${() => this.requestClose()}
          >
            ${this.labels.confirmCloseCancel}
          </button>
        </div>
      </div>
    `;
  }

  private _getSubmitLabel(): string {
    if (this._editPostId) return this.labels.update;
    if (this._replyToId) return this.labels.reply;
    if (this._visibility === "private") return this.labels.postPrivately;
    if (this._visibility === "unlisted") return this.labels.postUnlisted;
    return this.labels.post;
  }

  private _getSlugValidationMessage(): string | null {
    const issue = getSlugValidationIssue(this._slug);
    if (issue === "invalid") return this.labels.publishSlugInvalid;
    if (issue === "reserved") return this.labels.publishSlugReserved;
    return null;
  }

  private _revealSlugField() {
    this._showCollection = false;
    this._collectionSearch = "";
    this._showPublishPanel = false;
    this._showMoreMenu = true;
    this._moreSlugExpanded = true;
    this._confirmPanelOpen = false;
    this.updateComplete.then(() => {
      this.querySelector<HTMLInputElement>(".compose-more-slug-input")?.focus();
    });
  }

  private _canPublish(): boolean {
    if (this._loading) return false;
    const editor = this._editor;
    if (!editor) return false;
    if (this._getSlugValidationMessage()) return false;

    const data = editor.getData();
    if (this._format === "link") {
      return data.url.trim().length > 0;
    }
    if (this._format === "quote") {
      return data.quoteText.trim().length > 0;
    }
    return this._hasContent();
  }

  private _togglePublishPanel() {
    this._showCollection = false;
    this._collectionSearch = "";
    this._showMoreMenu = false;
    this._moreSlugExpanded = false;
    this._showPublishPanel = !this._showPublishPanel;
  }

  private _setVisibility(visibility: ComposeVisibility) {
    if (this._visibilityLocked) return;
    this._visibility = visibility;
    this._showPublishPanel = false;
  }

  private _toggleMoreSlugField() {
    this._moreSlugExpanded = !this._moreSlugExpanded;
    if (!this._moreSlugExpanded) return;

    this.updateComplete.then(() => {
      this.querySelector<HTMLInputElement>(".compose-more-slug-input")?.focus();
    });
  }

  private _onSlugInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this._slug = value.toLowerCase();
  }

  private _renderPublishVisibilityOption(
    visibility: ComposeVisibility,
    label: string,
  ) {
    const selected = this._visibility === visibility;

    return html`
      <button
        type="button"
        class=${classMap({
          "compose-publish-option": true,
          "compose-publish-option-selected": selected,
        })}
        role="radio"
        aria-checked=${selected ? "true" : "false"}
        ?disabled=${this._visibilityLocked}
        @click=${() => this._setVisibility(visibility)}
      >
        <span class="compose-publish-row-label">${label}</span>
        ${selected
          ? html`<svg
              class="compose-publish-row-check"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>`
          : nothing}
      </button>
    `;
  }

  private _renderPublishPanel() {
    if (!this._showPublishPanel || this._visibilityLocked) return nothing;

    return html`
      <div
        class="compose-publish-panel"
        role="menu"
        aria-label=${this.labels.publishVisibilityLabel}
      >
        <div class="compose-publish-list" role="radiogroup">
          ${this._renderPublishVisibilityOption(
            "public",
            this.labels.publishVisibilityPublic,
          )}
          ${this._renderPublishVisibilityOption(
            "unlisted",
            this.labels.publishVisibilityUnlisted,
          )}
          ${this._renderPublishVisibilityOption(
            "private",
            this.labels.publishVisibilityPrivate,
          )}
        </div>
      </div>
    `;
  }

  private _renderPublishButton() {
    const spinner = html`<svg
      class="animate-spin size-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="status"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>`;
    const canPublish = this._canPublish();

    if (this._replyToId || this._visibilityLocked) {
      return html`
        <button
          type="button"
          class=${classMap({
            "btn-sm-outline": true,
            "compose-publish-single": true,
            "compose-publish-single-loading": this._loading,
          })}
          ?disabled=${!canPublish}
          @click=${() => this._submit("published")}
        >
          ${this._loading ? spinner : nothing} ${this._getSubmitLabel()}
        </button>
      `;
    }

    return html`
      <div class="compose-publish-group">
        ${this._showPublishPanel
          ? html`<div
              class="compose-dropdown-backdrop"
              @click=${() => {
                this._showPublishPanel = false;
              }}
            ></div>`
          : nothing}
        <div role="group" class="button-group compose-publish-buttons">
          <button
            type="button"
            class=${classMap({
              "btn-sm-outline": true,
              "compose-publish-main": true,
              "compose-publish-main-loading": this._loading,
            })}
            ?disabled=${!canPublish}
            @click=${() => this._submit("published")}
          >
            ${this._loading ? spinner : nothing} ${this._getSubmitLabel()}
          </button>
          <button
            type="button"
            class=${classMap({
              "btn-sm-icon-outline": true,
              "compose-publish-toggle": true,
              "compose-publish-toggle-loading": this._loading,
            })}
            ?disabled=${this._loading}
            aria-haspopup="menu"
            aria-expanded=${this._showPublishPanel ? "true" : "false"}
            @click=${() => this._togglePublishPanel()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        ${this._renderPublishPanel()}
      </div>
    `;
  }

  render() {
    const isReply = !!(this._replyToId && this._replyToData);
    const editor = html`<jant-compose-editor
      .format=${this._format}
      .labels=${this.labels}
      .uploadMaxFileSize=${this.uploadMaxFileSize}
    ></jant-compose-editor>`;

    return html`
      <div
        class=${classMap({
          "compose-dialog-inner": true,
          "compose-dialog-inner-page": this.pageMode,
        })}
      >
        ${this._renderHeader()}
        ${isReply
          ? html`
              <div class="compose-thread-layout">
                ${this._renderReplyContext()}
                <div class="compose-editor-row">
                  <div class="compose-thread-dot"></div>
                  ${editor}
                </div>
              </div>
            `
          : editor}

        <div class="compose-action-row">
          ${this._renderCollectionSelector()} ${this._renderPublishButton()}
        </div>
        ${this._renderAttachedPanel()} ${this._renderAltPanel()}
        ${this._renderDraftsPanel()} ${this._renderConfirmPanel()}
      </div>
      ${this._renderAddCollectionPanel()}
    `;
  }
}

customElements.define("jant-compose-dialog", JantComposeDialog);
