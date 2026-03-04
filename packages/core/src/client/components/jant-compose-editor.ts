/**
 * Compose Editor
 *
 * Format-specific content editing sub-component for the compose dialog.
 * Handles note/link/quote fields, star rating, attached text panel,
 * file attachments with thumbnail strip, and alt text editing.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import type { Editor, JSONContent } from "@tiptap/core";
import type {
  ComposeFormat,
  ComposeLabels,
  ComposeAttachment,
  AttachedTextItem,
} from "./compose-types.js";
import {
  UPLOAD_ACCEPT,
  getMediaCategory,
  validateUploadFile,
} from "../../lib/upload.js";
import type { MediaCategory } from "../../lib/upload.js";
import { showToast } from "../toast.js";
import { createTiptapEditor } from "../tiptap/create-editor.js";

export class JantComposeEditor extends LitElement {
  static properties = {
    format: { type: String },
    labels: { type: Object },
    uploadMaxFileSize: { type: Number },
    _title: { state: true },
    _bodyJson: { state: true },
    _url: { state: true },
    _quoteText: { state: true },
    _quoteAuthor: { state: true },
    _rating: { state: true },
    _showTitle: { state: true },
    _showRating: { state: true },
    _attachedTexts: { state: true },
    _attachments: { state: true },
    _attachmentOrder: { state: true },
    _showAltPanel: { state: true },
    _altPanelIndex: { state: true },
    _showEmojiPicker: { state: true },
  };

  declare format: ComposeFormat;
  declare labels: ComposeLabels;
  declare uploadMaxFileSize: number;
  declare _title: string;
  declare _bodyJson: JSONContent | null;
  declare _url: string;
  declare _quoteText: string;
  declare _quoteAuthor: string;
  declare _rating: number;
  declare _showTitle: boolean;
  declare _showRating: boolean;
  declare _attachedTexts: AttachedTextItem[];
  declare _attachments: ComposeAttachment[];
  declare _attachmentOrder: string[];
  declare _showAltPanel: boolean;
  declare _altPanelIndex: number;
  declare _showEmojiPicker: boolean;

  private _editor: Editor | null = null;
  private _fileInput: HTMLInputElement | null = null;
  private _lastFocusedField: HTMLTextAreaElement | HTMLInputElement | null =
    null;
  private _emojiPickerEl: HTMLElement | null = null;
  private _emojiContainer: HTMLElement | null = null;
  private _onDocClickBound = this._onDocumentClick.bind(this);
  private _scrollBufferApplied = false;

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.format = "note";
    this.labels = {} as ComposeLabels;
    this.uploadMaxFileSize = 500;
    this._title = "";
    this._bodyJson = null;
    this._url = "";
    this._quoteText = "";
    this._quoteAuthor = "";
    this._rating = 0;
    this._showTitle = false;
    this._showRating = false;
    this._attachedTexts = [];
    this._attachments = [];
    this._attachmentOrder = [];
    this._showAltPanel = false;
    this._altPanelIndex = 0;
    this._showEmojiPicker = false;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("jant:slash-image", this._onSlashImage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._editor?.destroy();
    this._editor = null;
    document.removeEventListener("jant:slash-image", this._onSlashImage);
    document.removeEventListener("click", this._onDocClickBound, true);
    this._emojiContainer?.remove();
  }

  private _onSlashImage = () => {
    // Skip when fullscreen is open — it has its own handler
    if (document.querySelector(".compose-fullscreen-dialog[open]")) return;
    if (!this._editor) return;
    this._triggerSlashImagePicker();
  };

  private _slashImageInput: HTMLInputElement | null = null;

  private _triggerSlashImagePicker() {
    if (!this._slashImageInput) {
      this._slashImageInput = document.createElement("input");
      this._slashImageInput.type = "file";
      this._slashImageInput.accept = "image/*";
      this._slashImageInput.style.display = "none";
      this._slashImageInput.addEventListener("change", () => {
        const file = this._slashImageInput?.files?.[0];
        if (file && this._editor) {
          this._uploadAndInsertImage(file);
        }
        if (this._slashImageInput) this._slashImageInput.value = "";
      });
      document.body.appendChild(this._slashImageInput);
    }
    this._slashImageInput.click();
  }

  private async _uploadAndInsertImage(file: File) {
    if (!this._editor) return;

    const placeholderUrl = URL.createObjectURL(file);
    this._editor.chain().focus().setImage({ src: placeholderUrl }).run();

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const data = (await response.json()) as { url: string };

      const { doc } = this._editor.state;
      let replaced = false;
      doc.descendants((node, pos) => {
        if (
          replaced ||
          node.type.name !== "image" ||
          node.attrs.src !== placeholderUrl
        )
          return;
        this._editor
          ?.chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: data.url });
            return true;
          })
          .run();
        replaced = true;
      });
    } catch {
      const { doc } = this._editor.state;
      doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.src === placeholderUrl) {
          this._editor
            ?.chain()
            .command(({ tr }) => {
              tr.delete(pos, pos + node.nodeSize);
              return true;
            })
            .run();
        }
      });
    } finally {
      URL.revokeObjectURL(placeholderUrl);
    }
  }

  private _isEmptyDoc(json: JSONContent): boolean {
    if (!json.content || json.content.length === 0) return true;
    return json.content.every(
      (node) =>
        node.type === "paragraph" &&
        (!node.content || node.content.length === 0),
    );
  }

  getData() {
    const body =
      this._bodyJson && !this._isEmptyDoc(this._bodyJson)
        ? JSON.stringify(this._bodyJson)
        : "";
    const shared = {
      rating: this._rating,
      attachedTexts: this._attachedTexts,
      attachments: this._attachments,
      attachmentOrder: this._attachmentOrder,
    };

    switch (this.format) {
      case "link":
        return {
          ...shared,
          title: this._title,
          body,
          url: this._url,
          quoteText: "",
          quoteAuthor: "",
        };
      case "quote":
        return {
          ...shared,
          title: "",
          body,
          url: this._url,
          quoteText: this._quoteText,
          quoteAuthor: this._quoteAuthor,
        };
      default:
        return {
          ...shared,
          title: this._showTitle ? this._title : "",
          body,
          url: "",
          quoteText: "",
          quoteAuthor: "",
        };
    }
  }

  reset() {
    this._title = "";
    this._bodyJson = null;
    this._editor?.commands.clearContent();
    this._url = "";
    this._quoteText = "";
    this._quoteAuthor = "";
    this._rating = 0;
    this._showTitle = false;
    this._showRating = false;
    this._attachedTexts = [];
    // Revoke preview URLs before clearing
    for (const a of this._attachments) {
      URL.revokeObjectURL(a.previewUrl);
    }
    this._attachments = [];
    this._attachmentOrder = [];
    this._showAltPanel = false;
    this._altPanelIndex = 0;
    this.closeEmojiPicker();
  }

  updateAttachmentStatus(
    clientId: string,
    status: ComposeAttachment["status"],
    mediaId: string | null,
    error: string | null,
  ) {
    this._attachments = this._attachments.map((a) =>
      a.clientId === clientId ? { ...a, status, mediaId, error } : a,
    );
  }

  updateAttachmentProgress(clientId: string, progress: number) {
    this._attachments = this._attachments.map((a) =>
      a.clientId === clientId ? { ...a, progress } : a,
    );
  }

  focusInput() {
    if (this.format === "link") {
      this.querySelector<HTMLElement>('.compose-input[type="url"]')?.focus();
    } else if (this.format === "quote") {
      this.querySelector<HTMLElement>(".compose-quote-text")?.focus();
    } else {
      this._editor?.commands.focus();
    }
  }

  private _initEditor() {
    const container = this.querySelector<HTMLElement>(".compose-tiptap-body");
    if (!container || this._editor) return;

    this._editor = createTiptapEditor({
      element: container,
      placeholder:
        this.format === "note"
          ? this.labels.bodyPlaceholder
          : this.labels.thoughtsPlaceholder,
      content: this._bodyJson,
      onUpdate: (json) => {
        this._bodyJson = json;
        this._ensureScrollBuffer();
      },
      onFocus: () => {
        this._lastFocusedField = null;
      },
    });

    // Lock editor min-height once so new lines fill existing space
    // instead of growing the dialog line-by-line.
    this._scrollBufferApplied = false;
    const dom = this._editor.view.dom as HTMLElement;
    const last = dom.lastElementChild as HTMLElement | null;
    const contentH = last ? last.offsetTop + last.offsetHeight : 0;
    const buffer = this.format !== "note" ? 60 : 120;
    dom.style.minHeight = `${contentH + buffer}px`;
  }

  /**
   * One-time: adds bottom padding for scroll buffer once the
   * compose-body starts scrolling. Since the dialog is already at
   * max-height by that point, the extra padding doesn't grow it.
   */
  private _ensureScrollBuffer() {
    if (this._scrollBufferApplied) return;
    const dom = this._editor?.view?.dom as HTMLElement | undefined;
    if (!dom) return;
    const body = this.querySelector(".compose-body") as HTMLElement | null;
    if (!body) return;
    if (body.scrollHeight > body.clientHeight + 20) {
      dom.style.paddingBottom = "80px";
      this._scrollBufferApplied = true;
    }
  }

  private _destroyEditor() {
    this._editor?.destroy();
    this._editor = null;
  }

  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);

    // Initialize editor after first render or when format changes
    if (!this._editor) {
      this._initEditor();
    }

    if (changed.has("format") && changed.get("format") !== undefined) {
      // Format changed — recreate editor with appropriate placeholder
      this._destroyEditor();
      // Schedule init after Lit re-renders the new template
      this.updateComplete.then(() => this._initEditor());
    }
  }

  /** Returns Tiptap editor content and title for fullscreen handoff */
  getEditorState() {
    return {
      json: this._editor?.getJSON() ?? this._bodyJson,
      title: this._title,
      showTitle: this._showTitle,
    };
  }

  /** Pre-fill all fields for edit mode */
  populate(data: {
    format: string;
    title?: string;
    bodyJson?: string;
    url?: string;
    quoteText?: string;
    quoteAuthor?: string;
    rating?: number;
    media?: Array<{
      id: string;
      previewUrl: string;
      alt?: string;
      mimeType: string;
      originalName?: string;
      summary?: string;
      chars?: number;
    }>;
    textAttachments?: Array<{
      bodyJson: string;
      bodyHtml?: string;
      summary: string;
      mediaId?: string;
    }>;
  }) {
    if (data.title) this._title = data.title;
    if (data.url) this._url = data.url;
    if (data.quoteText) this._quoteText = data.quoteText;
    if (data.quoteAuthor) this._quoteAuthor = data.quoteAuthor;
    if (data.rating && data.rating > 0) {
      this._rating = data.rating;
      this._showRating = true;
    }
    if (data.title && data.format === "note") {
      this._showTitle = true;
    }

    // Parse body JSON and set editor content
    if (data.bodyJson) {
      try {
        const parsed = JSON.parse(data.bodyJson) as JSONContent;
        this._bodyJson = parsed;
        if (this._editor) {
          this._editor.commands.setContent(parsed);
        }
      } catch {
        // Body is not valid JSON — ignore
      }
    }

    // Convert media attachments to ComposeAttachment[] with status "done"
    if (data.media?.length) {
      const attachments = data.media.map((m) => ({
        clientId: crypto.randomUUID(),
        file: new File([], m.originalName ?? "existing", { type: m.mimeType }),
        previewUrl: m.previewUrl,
        status: "done" as const,
        progress: null,
        mediaId: m.id,
        alt: m.alt ?? "",
        error: null,
        summary: m.summary ?? null,
        chars: m.chars ?? null,
      }));
      this._attachments = attachments;
      this._attachmentOrder = attachments.map((a) => a.clientId);
    }

    // Restore attached texts from server data
    if (data.textAttachments?.length) {
      const texts: AttachedTextItem[] = data.textAttachments.map((t) => {
        let parsed: JSONContent | null = null;
        try {
          parsed = JSON.parse(t.bodyJson) as JSONContent;
        } catch {
          // Invalid JSON — leave as null
        }
        return {
          clientId: crypto.randomUUID(),
          bodyJson: parsed,
          bodyHtml: t.bodyHtml ?? "",
          summary: t.summary,
          mediaId: t.mediaId,
        };
      });
      this._attachedTexts = texts;
      // Add text clientIds to attachment order after media
      this._attachmentOrder = [
        ...this._attachmentOrder,
        ...texts.map((t) => t.clientId),
      ];
    }
  }

  /** Updates editor content and title from fullscreen close */
  setEditorState(json: JSONContent | null, title: string) {
    this._bodyJson = json;
    this._title = title;
    // Show the title field if user typed a title in fullscreen
    if (title && this.format === "note") {
      this._showTitle = true;
    }
    if (this._editor && json) {
      this._editor.commands.setContent(json);
    }
  }

  private static SUMMARY_LENGTH = 100;

  private _computeSummary(text: string): string {
    const plain = text.replace(/\s+/g, " ").trim();
    if (plain.length <= JantComposeEditor.SUMMARY_LENGTH) return plain;
    return plain.slice(0, JantComposeEditor.SUMMARY_LENGTH) + "…";
  }

  private _openAttachedText() {
    const item: AttachedTextItem = {
      clientId: crypto.randomUUID(),
      bodyJson: null,
      bodyHtml: "",
      summary: "",
    };
    this._attachedTexts = [...this._attachedTexts, item];
    this._attachmentOrder = [...this._attachmentOrder, item.clientId];
    const index = this._attachedTexts.length - 1;
    this.dispatchEvent(
      new CustomEvent("jant:attached-panel-open", {
        bubbles: true,
        detail: { index },
      }),
    );
  }

  private _editAttachedText(index: number) {
    this.dispatchEvent(
      new CustomEvent("jant:attached-panel-open", {
        bubbles: true,
        detail: { index },
      }),
    );
  }

  private _removeAttachedText(index: number) {
    const removed = this._attachedTexts[index];
    this._attachedTexts = this._attachedTexts.filter((_, i) => i !== index);
    if (removed) {
      this._attachmentOrder = this._attachmentOrder.filter(
        (id) => id !== removed.clientId,
      );
    }
  }

  updateAttachedText(
    index: number,
    bodyJson: JSONContent | null,
    bodyHtml?: string,
  ) {
    const plainText = this._extractPlainText(bodyJson);
    this._attachedTexts = this._attachedTexts.map((item, i) =>
      i === index
        ? {
            ...item,
            bodyJson,
            bodyHtml: bodyHtml ?? "",
            summary: this._computeSummary(plainText),
          }
        : item,
    );
  }

  closeAttachedPanel(index: number) {
    const item = this._attachedTexts[index];
    if (item && !this._hasAttachedTextContent(item.bodyJson)) {
      this._attachedTexts = this._attachedTexts.filter((_, i) => i !== index);
      this._attachmentOrder = this._attachmentOrder.filter(
        (id) => id !== item.clientId,
      );
    }
  }

  private _hasAttachedTextContent(bodyJson: JSONContent | null): boolean {
    if (!bodyJson) return false;
    return this._extractPlainText(bodyJson).trim().length > 0;
  }

  private _extractPlainText(json: JSONContent | null): string {
    if (!json) return "";
    let text = "";
    const walk = (node: JSONContent) => {
      if (node.text) text += node.text;
      if (node.content) node.content.forEach(walk);
    };
    walk(json);
    return text;
  }

  private _onInput(field: string, e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    (this as Record<string, unknown>)[field] = target.value;
    if (target.tagName === "TEXTAREA") {
      this._autoResize(target as HTMLElement);
    }
  }

  private _autoResize(el: HTMLElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  private _setRating(star: number) {
    this._rating = this._rating === star ? 0 : star;
  }

  private _openFilePicker() {
    if (!this._fileInput) {
      this._fileInput = document.createElement("input");
      this._fileInput.type = "file";
      this._fileInput.accept = UPLOAD_ACCEPT;
      this._fileInput.multiple = true;
      this._fileInput.style.display = "none";
      this._fileInput.addEventListener("change", () =>
        this._handleFilesSelected(),
      );
      this.appendChild(this._fileInput);
    }
    this._fileInput.value = "";
    this._fileInput.click();
  }

  private _handleFilesSelected() {
    if (!this._fileInput?.files?.length) return;

    const newAttachments: ComposeAttachment[] = [];
    const files: { file: File; clientId: string }[] = [];

    for (const file of Array.from(this._fileInput.files)) {
      // Validate before creating attachment preview
      const error = validateUploadFile(file, {
        maxFileSizeMB: this.uploadMaxFileSize,
      });
      if (error) {
        showToast(error, "error");
        continue;
      }

      const clientId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      newAttachments.push({
        clientId,
        file,
        previewUrl,
        status: "pending",
        progress: null,
        mediaId: null,
        alt: "",
        error: null,
        summary: null,
        chars: null,
      });
      files.push({ file, clientId });
    }

    if (newAttachments.length === 0) return;

    this._attachments = [...this._attachments, ...newAttachments];
    this._attachmentOrder = [
      ...this._attachmentOrder,
      ...newAttachments.map((a) => a.clientId),
    ];

    // Extract summaries and char counts for text-category files asynchronously
    for (const att of newAttachments) {
      const category = getMediaCategory(att.file.type);
      if (category === "text") {
        att.file.text().then((content) => {
          const summary = this._computeSummary(content);
          const chars = content.length;
          this._attachments = this._attachments.map((a) =>
            a.clientId === att.clientId ? { ...a, summary, chars } : a,
          );
        });
      }
    }

    this.dispatchEvent(
      new CustomEvent("jant:files-selected", {
        bubbles: true,
        detail: { files },
      }),
    );
  }

  private _removeAttachment(index: number) {
    const attachment = this._attachments[index];
    if (attachment) {
      URL.revokeObjectURL(attachment.previewUrl);
      this.dispatchEvent(
        new CustomEvent("jant:attachment-removed", {
          bubbles: true,
          detail: {
            clientId: attachment.clientId,
            mediaId: attachment.mediaId,
          },
        }),
      );
    }
    if (attachment) {
      this._attachmentOrder = this._attachmentOrder.filter(
        (id) => id !== attachment.clientId,
      );
    }
    this._attachments = this._attachments.filter((_, i) => i !== index);
    // Close alt panel if it was showing the removed item
    if (this._showAltPanel && this._altPanelIndex === index) {
      this._showAltPanel = false;
      this.dispatchEvent(
        new CustomEvent("jant:alt-panel-close", { bubbles: true }),
      );
    } else if (this._showAltPanel && this._altPanelIndex > index) {
      this._altPanelIndex = this._altPanelIndex - 1;
    }
  }

  private _retryAllFailed() {
    const failed = this._attachments.filter((a) => a.status === "error");
    if (failed.length === 0) return;

    // Reset failed attachments to pending
    this._attachments = this._attachments.map((a) =>
      a.status === "error"
        ? { ...a, status: "pending" as const, progress: null, error: null }
        : a,
    );

    // Re-dispatch them through the normal upload flow
    this.dispatchEvent(
      new CustomEvent("jant:files-selected", {
        bubbles: true,
        detail: {
          files: failed.map((a) => ({ file: a.file, clientId: a.clientId })),
        },
      }),
    );
  }

  private _openAltPanel(index: number) {
    this._altPanelIndex = index;
    this._showAltPanel = true;
    this.dispatchEvent(
      new CustomEvent("jant:alt-panel-open", {
        bubbles: true,
        detail: { index },
      }),
    );
  }

  updateAlt(index: number, value: string) {
    this._attachments = this._attachments.map((a, i) =>
      i === index ? { ...a, alt: value } : a,
    );
  }

  // ── Emoji picker ────────────────────────────────────────────────

  private _onFieldFocus(e: Event) {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    this._lastFocusedField = target;
  }

  private _toggleEmojiPicker() {
    if (this._showEmojiPicker) {
      this.closeEmojiPicker();
    } else {
      this._showEmojiPicker = true;
      this._mountEmojiPicker();
      // Defer listener so the current click event doesn't immediately close it
      globalThis.setTimeout(() => {
        document.addEventListener("click", this._onDocClickBound);
      }, 0);
    }
  }

  closeEmojiPicker() {
    if (!this._showEmojiPicker) return;
    this._showEmojiPicker = false;
    this._emojiContainer?.remove();
    document.removeEventListener("click", this._onDocClickBound);
  }

  private _onDocumentClick(e: Event) {
    const target = e.target as globalThis.Node;
    const btn = this.querySelector(".compose-emoji-btn");
    if (btn?.contains(target)) return;
    if (this._emojiContainer?.contains(target)) return;
    this.closeEmojiPicker();
  }

  private async _mountEmojiPicker() {
    // Portal into the <dialog> element (shares top-layer, escapes inner overflow/transform)
    const dialog = this.closest("dialog");
    if (!this._emojiContainer) {
      this._emojiContainer = document.createElement("div");
      this._emojiContainer.className = "compose-emoji-picker";
    }
    (dialog ?? document.body).appendChild(this._emojiContainer);

    // Only create the picker element once
    if (!this._emojiPickerEl) {
      const [{ default: data }, { Picker }] = await Promise.all([
        import("@emoji-mart/data"),
        import("emoji-mart"),
      ]);

      // Check we're still open after the async import
      if (!this._showEmojiPicker) return;

      const picker = new Picker({
        data,
        onEmojiSelect: (emoji: { native: string }) => {
          this._insertEmoji(emoji.native);
          this.closeEmojiPicker();
        },
        theme: "auto",
        previewPosition: "none",
        skinTonePosition: "none",
      });
      this._emojiPickerEl = picker as unknown as HTMLElement;
    }

    this._emojiContainer.innerHTML = "";
    this._emojiContainer.appendChild(this._emojiPickerEl);

    // Position relative to the dialog (whose transform makes fixed = absolute)
    const btn = this.querySelector(".compose-emoji-btn");
    if (btn && dialog) {
      const btnRect = btn.getBoundingClientRect();
      const dlgRect = dialog.getBoundingClientRect();
      const pickerWidth = 352;
      const pickerHeight = 435;

      // Button position relative to the dialog
      const btnRelLeft = btnRect.left - dlgRect.left;
      const btnRelTop = btnRect.top - dlgRect.top;

      let left = btnRelLeft + btnRect.width / 2 - pickerWidth / 2;
      left = Math.max(-dlgRect.left + 8, Math.min(left, dlgRect.width - 8));

      let top = btnRelTop - pickerHeight - 8;
      if (dlgRect.top + top < 8) {
        top = btnRelTop + btnRect.height + 8;
      }

      this._emojiContainer.style.left = `${left}px`;
      this._emojiContainer.style.top = `${top}px`;
    }
  }

  private _insertEmoji(emoji: string) {
    const field = this._lastFocusedField;
    if (!field) {
      // Insert into Tiptap editor
      if (this._editor) {
        this._editor.chain().focus().insertContent(emoji).run();
      }
      return;
    }

    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const before = field.value.slice(0, start);
    const after = field.value.slice(end);
    const newValue = before + emoji + after;

    // Update the Lit state that corresponds to this field
    field.value = newValue;
    field.dispatchEvent(new Event("input", { bubbles: true }));

    // Restore cursor position after the inserted emoji
    const cursorPos = start + emoji.length;
    globalThis.requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(cursorPos, cursorPos);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private _getCategory(a: ComposeAttachment): MediaCategory | null {
    return getMediaCategory(a.file.type);
  }

  private _formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _formatChars(count: number): string {
    if (count < 1000) return `${count} chars`;
    if (count < 1_000_000) {
      return `${parseFloat((count / 1000).toFixed(1))}k chars`;
    }
    return `${parseFloat((count / 1_000_000).toFixed(1))}M chars`;
  }

  private _renderFileIcon(mimeType: string, size: number) {
    const doc = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`;

    let inner: string;
    if (mimeType === "application/pdf") {
      inner = `<text x="12" y="16.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="6" font-weight="700" font-family="system-ui, sans-serif">PDF</text>`;
    } else if (mimeType === "text/markdown") {
      inner = `<text x="12" y="16.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="10" font-weight="700" font-family="system-ui, sans-serif">#</text>`;
    } else if (mimeType === "text/csv") {
      inner = `<line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="10.7" y1="12" x2="10.7" y2="18"/><line x1="13.3" y1="12" x2="13.3" y2="18"/>`;
    } else if (mimeType === "application/zip") {
      inner = `<line x1="12" y1="10" x2="12" y2="11.5"/><line x1="12" y1="13" x2="12" y2="14.5"/><line x1="12" y1="16" x2="12" y2="17.5"/>`;
    } else if (mimeType === "text/x-tiptap+json") {
      inner = `<line x1="16" y1="11" x2="8" y2="11"/><line x1="16" y1="14" x2="8" y2="14"/><line x1="12" y1="17" x2="8" y2="17"/>`;
    } else {
      // Plain text default — 3 text lines
      inner = `<line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>`;
    }

    return html`<svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      ${unsafeSVG(doc + inner)}
    </svg>`;
  }

  // ── Render helpers ────────────────────────────────────────────────

  private _renderNoteFields() {
    return html`
      <div class="compose-field-enter">
        ${this._showTitle
          ? html`
              <div class="compose-note-title-row">
                <input
                  type="text"
                  .value=${this._title}
                  @input=${(e: Event) => this._onInput("_title", e)}
                  @focus=${(e: Event) => this._onFieldFocus(e)}
                  @keydown=${(e: globalThis.KeyboardEvent) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      this._editor?.commands.focus("start");
                    }
                  }}
                  class="compose-input compose-note-title"
                  placeholder=${this.labels.titlePlaceholder}
                />
                <button
                  type="button"
                  class="compose-note-title-dismiss"
                  @click=${() => {
                    this._showTitle = false;
                  }}
                >
                  ✕
                </button>
              </div>
            `
          : nothing}
        <div class="compose-tiptap-body"></div>
      </div>
    `;
  }

  private _renderLinkFields() {
    return html`
      <div class="compose-field-enter">
        <div class="compose-link-url-wrap">
          <span class="text-base opacity-50 shrink-0">🔗</span>
          <input
            type="url"
            .value=${this._url}
            @input=${(e: Event) => this._onInput("_url", e)}
            @focus=${(e: Event) => this._onFieldFocus(e)}
            class="compose-input text-[0.9rem]"
            placeholder=${this.labels.urlPlaceholder}
          />
        </div>
        <input
          type="text"
          .value=${this._title}
          @input=${(e: Event) => this._onInput("_title", e)}
          @focus=${(e: Event) => this._onFieldFocus(e)}
          class="compose-input compose-link-title"
          placeholder=${this.labels.linkTitlePlaceholder}
        />
        <div class="compose-divider"></div>
        <div class="compose-tiptap-body compose-tiptap-thoughts"></div>
      </div>
    `;
  }

  private _renderQuoteFields() {
    return html`
      <div class="compose-field-enter">
        <div class="compose-quote-wrap">
          <span class="compose-quote-mark">"</span>
          <textarea
            .value=${this._quoteText}
            @input=${(e: Event) => this._onInput("_quoteText", e)}
            @focus=${(e: Event) => this._onFieldFocus(e)}
            class="compose-input compose-quote-text"
            placeholder=${this.labels.quotePlaceholder}
            rows="3"
          ></textarea>
        </div>
        <div class="compose-quote-author-row">
          <span class="compose-quote-dash">—</span>
          <input
            type="text"
            .value=${this._quoteAuthor}
            @input=${(e: Event) => this._onInput("_quoteAuthor", e)}
            @focus=${(e: Event) => this._onFieldFocus(e)}
            class="compose-input compose-quote-author"
            placeholder=${this.labels.authorPlaceholder}
          />
        </div>
        <div class="compose-quote-source">
          <input
            type="url"
            .value=${this._url}
            @input=${(e: Event) => this._onInput("_url", e)}
            @focus=${(e: Event) => this._onFieldFocus(e)}
            class="compose-input text-[0.78rem]"
            placeholder=${this.labels.sourcePlaceholder}
          />
        </div>
        <div class="compose-divider"></div>
        <div class="compose-tiptap-body compose-tiptap-thoughts"></div>
      </div>
    `;
  }

  private _renderStarRating() {
    if (!this._showRating) return nothing;
    const stars = [1, 2, 3, 4, 5];
    return html`
      <div class="compose-star-rating">
        ${stars.map(
          (n) => html`
            <button
              type="button"
              class=${classMap({
                "compose-star": true,
                "compose-star-filled": this._rating >= n,
              })}
              @click=${() => this._setRating(n)}
            >
              ★
            </button>
          `,
        )}
        ${this._rating > 0
          ? html`<span class="compose-star-label">${this._rating}/5</span>`
          : nothing}
      </div>
    `;
  }

  private _renderAttachmentPreview(a: ComposeAttachment) {
    const category = this._getCategory(a);

    if (category === "video") {
      return html`
        <div class="compose-attachment-thumb">
          <video
            src=${a.previewUrl}
            class="compose-attachment-img"
            preload="metadata"
            muted
          ></video>
          <div class="compose-attachment-play-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      `;
    }

    if (category === "audio") {
      return html`
        <div class="compose-attachment-file-card">
          <div class="compose-attachment-file-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span class="compose-attachment-file-name">${a.file.name}</span>
        </div>
      `;
    }

    if (category === "document") {
      return html`
        <div class="compose-attachment-file-card">
          <div class="compose-attachment-file-icon">
            ${this._renderFileIcon(a.file.type, 20)}
          </div>
          <span class="compose-attachment-file-name">${a.file.name}</span>
          <span class="compose-attachment-file-size"
            >${this._formatSize(a.file.size)}</span
          >
        </div>
      `;
    }

    if (category === "text") {
      return html`
        <div class="compose-attachment-file-card">
          <div class="compose-attachment-file-icon">
            ${this._renderFileIcon(a.file.type, 20)}
          </div>
          <span class="compose-attachment-file-name">${a.file.name}</span>
          ${a.summary
            ? html`<span class="compose-attachment-text-summary"
                >${a.summary}</span
              >`
            : nothing}
          ${typeof a.chars === "number" && a.chars > 0
            ? html`<span class="compose-attachment-file-size"
                >${this._formatChars(a.chars)}</span
              >`
            : nothing}
        </div>
      `;
    }

    if (category === "archive") {
      return html`
        <div class="compose-attachment-file-card">
          <div class="compose-attachment-file-icon">
            ${this._renderFileIcon(a.file.type, 20)}
          </div>
          <span class="compose-attachment-file-name">${a.file.name}</span>
          <span class="compose-attachment-file-size"
            >${this._formatSize(a.file.size)}</span
          >
        </div>
      `;
    }

    // Default: image
    return html`
      <div class="compose-attachment-thumb">
        <img src=${a.previewUrl} alt="" class="compose-attachment-img" />
      </div>
    `;
  }

  private _renderAttachmentOverlay(a: ComposeAttachment, index: number) {
    return html`
      ${a.status === "error"
        ? html`
            <button
              type="button"
              class="compose-attachment-overlay compose-attachment-retry"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._retryAllFailed();
              }}
            >
              <span class="compose-retry-content">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                  />
                  <path d="M3 3v5h5" />
                  <path
                    d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"
                  />
                  <path d="M16 16h5v5" />
                </svg>
                <span class="compose-retry-label">${this.labels.retryAll}</span>
              </span>
            </button>
          `
        : nothing}
      <button
        type="button"
        class="compose-attachment-remove"
        @click=${() => this._removeAttachment(index)}
      >
        ✕
      </button>
    `;
  }

  private _renderAttachedTextCard(item: AttachedTextItem, index: number) {
    return html`
      <div class="compose-attachment">
        <div
          class="compose-attachment-thumb"
          @click=${() => this._editAttachedText(index)}
        >
          <div class="compose-attachment-text-card">
            <div class="compose-attachment-file-icon">
              ${this._renderFileIcon("text/x-tiptap+json", 20)}
            </div>
            <span class="compose-attachment-text-summary">${item.summary}</span>
            ${item.bodyJson
              ? html`<span class="compose-attachment-file-size"
                  >${this._formatChars(
                    this._extractPlainText(item.bodyJson).length,
                  )}</span
                >`
              : nothing}
          </div>
          <button
            type="button"
            class="compose-attachment-remove"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._removeAttachedText(index);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    `;
  }

  private _renderMediaAttachment(a: ComposeAttachment, i: number) {
    const category = this._getCategory(a);
    const isFileCard =
      category === "audio" ||
      category === "document" ||
      category === "text" ||
      category === "archive";

    return html`
      <div class="compose-attachment">
        ${isFileCard
          ? html`
              <div class="compose-attachment-thumb">
                ${this._renderAttachmentPreview(a)}
                ${this._renderAttachmentOverlay(a, i)}
              </div>
            `
          : html`
              <div class="compose-attachment-thumb">
                ${category === "video"
                  ? html`
                      <video
                        src=${a.previewUrl}
                        class="compose-attachment-img"
                        preload="metadata"
                        muted
                      ></video>
                      <div class="compose-attachment-play-icon">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    `
                  : html`
                      <img
                        src=${a.previewUrl}
                        alt=""
                        class="compose-attachment-img"
                      />
                    `}
                ${this._renderAttachmentOverlay(a, i)}
              </div>
            `}
        <button
          type="button"
          class=${classMap({
            "compose-attachment-alt": true,
            "compose-attachment-alt-set": a.alt.length > 0,
          })}
          @click=${() => this._openAltPanel(i)}
        >
          ${a.alt.length > 0 ? "ALT" : "+ ALT"}
        </button>
      </div>
    `;
  }

  private _renderAttachments() {
    if (this._attachments.length === 0 && this._attachedTexts.length === 0)
      return nothing;

    return html`
      <div class="compose-attachments">
        ${this._attachmentOrder.map((clientId) => {
          const mediaIndex = this._attachments.findIndex(
            (a) => a.clientId === clientId,
          );
          if (mediaIndex !== -1) {
            return this._renderMediaAttachment(
              this._attachments[mediaIndex],
              mediaIndex,
            );
          }
          const textIndex = this._attachedTexts.findIndex(
            (t) => t.clientId === clientId,
          );
          if (textIndex !== -1) {
            return this._renderAttachedTextCard(
              this._attachedTexts[textIndex],
              textIndex,
            );
          }
          return nothing;
        })}
      </div>
    `;
  }

  private _renderToolsRow() {
    const hasAttached = this._attachedTexts.length > 0;
    return html`
      <div class="compose-tools-row">
        <!-- Media / Add -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-add": this._attachments.length > 0,
          })}
          title=${this._attachments.length > 0 ? "" : this.labels.media}
          @click=${() => this._openFilePicker()}
        >
          <svg
            class="icon-fine"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="2" y="3" width="14" height="12" rx="2.5" />
            <circle cx="6.5" cy="7.5" r="1.5" />
            <path d="M2 13l4-4c.6-.6 1.4-.6 2 0l4 4" />
            <path d="M11 11l1.5-1.5c.6-.6 1.4-.6 2 0L16 11" />
          </svg>
          ${this._attachments.length > 0
            ? html`<span class="compose-tool-label"
                >${this.labels.addMore}</span
              >`
            : nothing}
        </button>

        <!-- Attached Text -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-add": hasAttached,
          })}
          title=${hasAttached ? "" : this.labels.attachedText}
          @click=${() => this._openAttachedText()}
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
          >
            <rect x="3" y="2" width="12" height="14" rx="2" />
            <line x1="6" y1="6" x2="12" y2="6" />
            <line x1="6" y1="9" x2="12" y2="9" />
            <line x1="6" y1="12" x2="9.5" y2="12" />
          </svg>
          ${hasAttached
            ? html`<span class="compose-tool-label"
                >${this.labels.addMore}</span
              >`
            : nothing}
        </button>

        <!-- Rate -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-active": this._showRating,
          })}
          title=${this.labels.rate}
          @click=${() => {
            this._showRating = !this._showRating;
          }}
        >
          <svg
            class="icon-fine"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <defs>
              <clipPath id="half-left">
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <polygon
              points="12 2 14.8 9.2 22.5 9.7 16.8 14.8 18.8 22.3 12 18.2 5.2 22.3 7.2 14.8 1.5 9.7 9.2 9.2"
              fill="currentColor"
              opacity="0.45"
              clip-path="url(#half-left)"
            />
            <polygon
              points="12 2 14.8 9.2 22.5 9.7 16.8 14.8 18.8 22.3 12 18.2 5.2 22.3 7.2 14.8 1.5 9.7 9.2 9.2"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- Emoji -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-emoji-btn": true,
            "compose-tool-btn-active": this._showEmojiPicker,
          })}
          title=${this.labels.emoji}
          @click=${() => this._toggleEmojiPicker()}
        >
          <svg
            class="icon-fine"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="9" cy="9" r="7" />
            <path d="M6 10.5c.5 1.2 1.5 2 3 2s2.5-.8 3-2" />
            <circle cx="6.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
            <circle
              cx="11.5"
              cy="7"
              r="0.5"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </button>

        <!-- Title toggle (Note only) -->
        ${this.format === "note"
          ? html`
              <div class="flex items-center gap-0.5">
                <div class="compose-tool-sep"></div>
                <button
                  type="button"
                  class=${classMap({
                    "compose-tool-btn": true,
                    "compose-tool-btn-active": this._showTitle,
                  })}
                  title=${this.labels.title}
                  @click=${() => {
                    const willShow = !this._showTitle;
                    this._showTitle = willShow;
                    if (willShow) {
                      this.updateComplete.then(() => {
                        this.querySelector<HTMLInputElement>(
                          ".compose-note-title",
                        )?.focus();
                      });
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <text
                      x="3.5"
                      y="14"
                      font-family="serif"
                      font-size="14"
                      font-weight="400"
                      fill="currentColor"
                    >
                      T
                    </text>
                  </svg>
                </button>
              </div>
            `
          : nothing}

        <div class="flex-1"></div>

        <!-- Expand to fullscreen -->
        <button
          type="button"
          class="compose-tool-btn"
          @click=${() => this._openFullscreen()}
        >
          <svg
            class="icon-fine"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 2 2 2 2 6" />
            <polyline points="12 16 16 16 16 12" />
            <line x1="2" y1="2" x2="7" y2="7" />
            <line x1="16" y1="16" x2="11" y2="11" />
          </svg>
        </button>
      </div>
    `;
  }

  private _openFullscreen() {
    const state = this.getEditorState();
    this.dispatchEvent(
      new CustomEvent("jant:fullscreen-open", {
        bubbles: true,
        detail: { ...state, labels: this.labels },
      }),
    );
  }

  render() {
    return html`
      <section class="compose-body">
        ${this.format === "note"
          ? this._renderNoteFields()
          : this.format === "link"
            ? this._renderLinkFields()
            : this._renderQuoteFields()}
        ${this._renderStarRating()} ${this._renderAttachments()}
      </section>
      ${this._renderToolsRow()}
    `;
  }
}

customElements.define("jant-compose-editor", JantComposeEditor);
