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
import type {
  ComposeFormat,
  ComposeLabels,
  ComposeAttachment,
} from "./compose-types.js";
import {
  UPLOAD_ACCEPT,
  getMediaCategory,
  validateUploadFile,
} from "../../lib/upload.js";
import type { MediaCategory } from "../../lib/upload.js";
import { showToast } from "../toast.js";

export class JantComposeEditor extends LitElement {
  static properties = {
    format: { type: String },
    labels: { type: Object },
    uploadMaxFileSize: { type: Number },
    _title: { state: true },
    _body: { state: true },
    _url: { state: true },
    _quoteText: { state: true },
    _quoteAuthor: { state: true },
    _rating: { state: true },
    _showTitle: { state: true },
    _showRating: { state: true },
    _attachedText: { state: true },
    _showAttachedText: { state: true },
    _attachments: { state: true },
    _showAltPanel: { state: true },
    _altPanelIndex: { state: true },
  };

  declare format: ComposeFormat;
  declare labels: ComposeLabels;
  declare uploadMaxFileSize: number;
  declare _title: string;
  declare _body: string;
  declare _url: string;
  declare _quoteText: string;
  declare _quoteAuthor: string;
  declare _rating: number;
  declare _showTitle: boolean;
  declare _showRating: boolean;
  declare _attachedText: string;
  declare _showAttachedText: boolean;
  declare _attachments: ComposeAttachment[];
  declare _showAltPanel: boolean;
  declare _altPanelIndex: number;

  private _fileInput: HTMLInputElement | null = null;

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.format = "note";
    this.labels = {} as ComposeLabels;
    this.uploadMaxFileSize = 500;
    this._title = "";
    this._body = "";
    this._url = "";
    this._quoteText = "";
    this._quoteAuthor = "";
    this._rating = 0;
    this._showTitle = false;
    this._showRating = false;
    this._attachedText = "";
    this._showAttachedText = false;
    this._attachments = [];
    this._showAltPanel = false;
    this._altPanelIndex = 0;
  }

  getData() {
    const shared = {
      rating: this._rating,
      attachedText: this._attachedText,
      attachments: this._attachments,
    };

    switch (this.format) {
      case "link":
        return {
          ...shared,
          title: this._title,
          body: this._body,
          url: this._url,
          quoteText: "",
          quoteAuthor: "",
        };
      case "quote":
        return {
          ...shared,
          title: "",
          body: this._body,
          url: this._url,
          quoteText: this._quoteText,
          quoteAuthor: this._quoteAuthor,
        };
      default:
        return {
          ...shared,
          title: this._title,
          body: this._body,
          url: "",
          quoteText: "",
          quoteAuthor: "",
        };
    }
  }

  reset() {
    this._title = "";
    this._body = "";
    this._url = "";
    this._quoteText = "";
    this._quoteAuthor = "";
    this._rating = 0;
    this._showTitle = false;
    this._showRating = false;
    this._attachedText = "";
    this._showAttachedText = false;
    // Revoke preview URLs before clearing
    for (const a of this._attachments) {
      URL.revokeObjectURL(a.previewUrl);
    }
    this._attachments = [];
    this._showAltPanel = false;
    this._altPanelIndex = 0;
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

  focusInput() {
    const selector =
      this.format === "link"
        ? '.compose-input[type="url"]'
        : this.format === "quote"
          ? ".compose-quote-text"
          : ".compose-body-input";
    this.querySelector<HTMLElement>(selector)?.focus();
  }

  private _openAttachedText() {
    this._showAttachedText = true;
    this.updateComplete.then(() => {
      this.querySelector<HTMLTextAreaElement>(
        ".compose-attached-textarea",
      )?.focus();
    });
  }

  private _onInput(field: string, e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    (this as Record<string, unknown>)[field] = target.value;
    if (
      target.tagName === "TEXTAREA" &&
      !target.classList.contains("compose-attached-textarea")
    ) {
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
        mediaId: null,
        alt: "",
        error: null,
      });
      files.push({ file, clientId });
    }

    if (newAttachments.length === 0) return;

    this._attachments = [...this._attachments, ...newAttachments];

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
    this._attachments = this._attachments.filter((_, i) => i !== index);
    // Close alt panel if it was showing the removed item
    if (this._showAltPanel && this._altPanelIndex === index) {
      this._showAltPanel = false;
    } else if (this._showAltPanel && this._altPanelIndex > index) {
      this._altPanelIndex = this._altPanelIndex - 1;
    }
  }

  private _openAltPanel(index: number) {
    this._altPanelIndex = index;
    this._showAltPanel = true;
    this.updateComplete.then(() => {
      this.querySelector<HTMLTextAreaElement>(".compose-alt-textarea")?.focus();
    });
  }

  private _closeAltPanel() {
    this._showAltPanel = false;
  }

  private _onAltInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    this._attachments = this._attachments.map((a, i) =>
      i === this._altPanelIndex ? { ...a, alt: value } : a,
    );
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
        <textarea
          .value=${this._body}
          @input=${(e: Event) => this._onInput("_body", e)}
          class="compose-input compose-body-input"
          placeholder=${this.labels.bodyPlaceholder}
          rows="4"
        ></textarea>
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
            class="compose-input text-[0.9rem]"
            placeholder=${this.labels.urlPlaceholder}
          />
        </div>
        <input
          type="text"
          .value=${this._title}
          @input=${(e: Event) => this._onInput("_title", e)}
          class="compose-input compose-link-title"
          placeholder=${this.labels.linkTitlePlaceholder}
        />
        <div class="compose-divider"></div>
        <textarea
          .value=${this._body}
          @input=${(e: Event) => this._onInput("_body", e)}
          class="compose-input compose-thoughts"
          placeholder=${this.labels.thoughtsPlaceholder}
          rows="3"
        ></textarea>
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
            class="compose-input compose-quote-author"
            placeholder=${this.labels.authorPlaceholder}
          />
        </div>
        <div class="compose-quote-source">
          <input
            type="url"
            .value=${this._url}
            @input=${(e: Event) => this._onInput("_url", e)}
            class="compose-input text-[0.78rem]"
            placeholder=${this.labels.sourcePlaceholder}
          />
        </div>
        <div class="compose-divider"></div>
        <textarea
          .value=${this._body}
          @input=${(e: Event) => this._onInput("_body", e)}
          class="compose-input compose-thoughts"
          placeholder=${this.labels.thoughtsPlaceholder}
          rows="2"
        ></textarea>
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

  private _renderAttachedBadge() {
    if (this._attachedText.trim().length === 0 || this._showAttachedText)
      return nothing;
    return html`
      <div
        class="compose-attached-badge"
        @click=${() => this._openAttachedText()}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
          class="text-muted-foreground icon-fine"
        >
          <rect x="3" y="2" width="12" height="14" rx="2" />
          <line x1="6" y1="6" x2="12" y2="6" />
          <line x1="6" y1="9" x2="12" y2="9" />
          <line x1="6" y1="12" x2="9.5" y2="12" />
        </svg>
        <span class="text-xs font-medium">${this.labels.attachedText}</span>
        <span class="text-xs text-muted-foreground"
          >· ${this._attachedText.length.toLocaleString()} chars</span
        >
        <div class="flex-1"></div>
        <button
          type="button"
          class="compose-attached-badge-dismiss"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._attachedText = "";
          }}
        >
          ✕
        </button>
      </div>
    `;
  }

  private _renderAttachedPanel() {
    if (!this._showAttachedText) return nothing;
    return html`
      <div class="compose-attached-panel">
        <div
          class="flex items-center gap-2.5 px-3 py-2.5 border-b border-border"
        >
          <button
            type="button"
            class="compose-attached-panel-back"
            @click=${() => {
              this._showAttachedText = false;
            }}
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
          <span class="text-sm font-medium tracking-tight"
            >${this.labels.attachedText}</span
          >
          <div class="flex-1"></div>
          ${this._attachedText.length > 0
            ? html`<span class="text-xs text-muted-foreground tracking-wide"
                >${this._attachedText.length.toLocaleString()} chars</span
              >`
            : nothing}
        </div>
        <div class="flex-1 p-4 overflow-hidden flex flex-col">
          <textarea
            .value=${this._attachedText}
            @input=${(e: Event) => this._onInput("_attachedText", e)}
            class="compose-input compose-attached-textarea"
            placeholder=${this.labels.attachedTextPlaceholder}
          ></textarea>
        </div>
        <div
          class="flex items-center justify-between px-3 py-2 border-t border-border"
        >
          <span class="text-xs text-muted-foreground"
            >${this.labels.attachedTextHint}</span
          >
          <button
            type="button"
            class="compose-post-btn"
            @click=${() => {
              this._showAttachedText = false;
            }}
          >
            ${this.labels.done}
          </button>
        </div>
      </div>
    `;
  }

  private _renderAltPanel() {
    if (!this._showAltPanel) return nothing;
    const attachment = this._attachments[this._altPanelIndex];
    if (!attachment) return nothing;

    return html`
      <div class="compose-alt-panel">
        <div
          class="flex items-center gap-2.5 px-3 py-2.5 border-b border-border"
        >
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
          <span class="text-sm font-medium tracking-tight"
            >${this.labels.addAltTitle}</span
          >
        </div>
        <div class="compose-alt-preview">
          ${this._getCategory(attachment) === "image"
            ? html`<img
                src=${attachment.previewUrl}
                alt=""
                class="compose-alt-preview-img"
              />`
            : this._getCategory(attachment) === "video"
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
        <div class="flex-1 p-4 overflow-hidden flex flex-col">
          <textarea
            .value=${attachment.alt}
            @input=${(e: Event) => this._onAltInput(e)}
            class="compose-input compose-alt-textarea"
            placeholder=${this.labels.altPlaceholder}
            rows="3"
          ></textarea>
        </div>
        <div
          class="flex items-center justify-between px-3 py-2 border-t border-border"
        >
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
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
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
      ${a.status === "pending" || a.status === "uploading"
        ? html`
            <div class="compose-attachment-overlay">
              <svg
                class="animate-spin size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                style="stroke-width: 2.5"
                stroke-linecap="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          `
        : nothing}
      ${a.status === "error"
        ? html`
            <div class="compose-attachment-overlay compose-attachment-error">
              <svg
                class="icon-fine"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <circle cx="8" cy="8" r="6" />
                <path d="M10 6L6 10M6 6l4 4" />
              </svg>
            </div>
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

  private _renderAttachments() {
    if (this._attachments.length === 0) return nothing;

    return html`
      <div class="compose-attachments">
        ${this._attachments.map((a, i) => {
          const category = this._getCategory(a);
          const isFileCard = category === "audio" || category === "document";

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
        })}
      </div>
    `;
  }

  private _renderToolsRow() {
    const hasAttached = this._attachedText.trim().length > 0;
    return html`
      <div class="compose-tools-row">
        <!-- Media / Add -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-active": this._attachments.length > 0,
          })}
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
          <span class="compose-tool-tip"
            >${this._attachments.length > 0
              ? this.labels.addMore
              : this.labels.media}</span
          >
        </button>

        <!-- Attached Text -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-active": hasAttached,
          })}
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
          <span class="compose-tool-tip">${this.labels.attachedText}</span>
        </button>

        <!-- Score -->
        <button
          type="button"
          class=${classMap({
            "compose-tool-btn": true,
            "compose-tool-btn-active": this._showRating,
          })}
          @click=${() => {
            this._showRating = !this._showRating;
          }}
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
            <rect x="3" y="12" width="2.8" height="3" rx="0.7" />
            <rect x="7.6" y="8.5" width="2.8" height="6.5" rx="0.7" />
            <rect x="12.2" y="5" width="2.8" height="10" rx="0.7" />
          </svg>
          <span class="compose-tool-tip">${this.labels.score}</span>
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
                  @click=${() => {
                    this._showTitle = !this._showTitle;
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
                  <span class="compose-tool-tip">${this.labels.title}</span>
                </button>
              </div>
            `
          : nothing}

        <div class="flex-1"></div>
      </div>
    `;
  }

  render() {
    return html`
      ${this._renderAttachedPanel()} ${this._renderAltPanel()}
      <section class="compose-body">
        ${this.format === "note"
          ? this._renderNoteFields()
          : this.format === "link"
            ? this._renderLinkFields()
            : this._renderQuoteFields()}
        ${this._renderStarRating()} ${this._renderAttachedBadge()}
        ${this._renderAttachments()}
      </section>
      ${this._renderToolsRow()}
    `;
  }
}

customElements.define("jant-compose-editor", JantComposeEditor);
