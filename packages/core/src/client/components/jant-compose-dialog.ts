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
import type {
  ComposeFormat,
  ComposeLabels,
  ComposeCollection,
  ComposeSubmitDetail,
  ComposeAttachment,
} from "./compose-types.js";
import type { JantComposeEditor } from "./jant-compose-editor.js";
import { getMediaCategory } from "../../lib/upload.js";

export class JantComposeDialog extends LitElement {
  static properties = {
    collections: { type: Array },
    labels: { type: Object },
    uploadMaxFileSize: { type: Number, attribute: "upload-max-file-size" },
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
  };

  declare collections: ComposeCollection[];
  declare labels: ComposeLabels;
  declare uploadMaxFileSize: number;
  declare _format: ComposeFormat;
  declare _status: "published" | "draft";
  declare _loading: boolean;
  declare _collectionIds: number[];
  declare _showCollection: boolean;
  declare _showMoreMenu: boolean;
  declare _collectionSearch: string;
  declare _altPanelOpen: boolean;
  declare _altPanelIndex: number;
  declare _attachedPanelOpen: boolean;
  declare _attachedTextIndex: number;
  declare _confirmPanelOpen: boolean;
  declare _editPostId: string | null;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.collections = [];
    this.labels = {} as ComposeLabels;
    this.uploadMaxFileSize = 500;
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
  }

  private get _editor(): JantComposeEditor | null {
    return this.querySelector("jant-compose-editor");
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
    this._editor?.reset();
  }

  async openEdit(sqid: string) {
    this.reset();

    const res = await fetch(`/api/posts/${sqid}`);
    if (!res.ok) return;
    const post = await res.json();

    this._editPostId = sqid;
    this._format = post.format;

    // Pre-fill collection memberships if present
    if (post.collectionIds?.length) {
      this._collectionIds = post.collectionIds;
    }

    // Wait for Lit to render with the new format before populating editor
    await this.updateComplete;

    this._editor?.populate({
      format: post.format,
      title: post.title ?? undefined,
      bodyJson: post.body ?? undefined,
      url: post.url ?? undefined,
      quoteText: post.quoteText ?? undefined,
      quoteAuthor:
        post.format === "quote" ? (post.title ?? undefined) : undefined,
      rating: post.rating ?? undefined,
      media: (post.mediaAttachments ?? []).map(
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
    });

    this.closest("dialog")?.showModal();
    globalThis.requestAnimationFrame(() => this._editor?.focusInput());
  }

  set loading(v: boolean) {
    this._loading = v;
  }

  private _closeDialog() {
    this.closest("dialog")?.close();
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
    if (data.attachedTexts.length > 0) return true;
    if (data.rating > 0) return true;
    if (data.attachments.length > 0) return true;
    if (this._collectionIds.length > 0) return true;

    return false;
  }

  requestClose() {
    if (this._loading) return;
    if (this._confirmPanelOpen) {
      this._confirmPanelOpen = false;
      this.updateComplete.then(() => this._editor?.focusInput());
      return;
    }
    if (this._hasContent()) {
      this._confirmPanelOpen = true;
    } else {
      this._closeDialog();
    }
  }

  private _discardAndClose() {
    this._confirmPanelOpen = false;
    this._closeDialog();
    (document.activeElement as HTMLElement)?.blur();
    this.reset();
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

    return {
      format: this._format,
      title: editorData.title,
      body: editorData.body,
      url: editorData.url,
      quoteText: editorData.quoteText,
      quoteAuthor: editorData.quoteAuthor,
      status,
      rating: editorData.rating,
      collectionIds: [...this._collectionIds],
      mediaIds,
      mediaAlts,
      attachedTexts: editorData.attachedTexts,
      editPostId: this._editPostId ?? undefined,
    };
  }

  private _submit(status: "published" | "draft") {
    if (this._loading) return;
    const editor = this._editor;
    if (!editor) return;

    const detail = this._buildSubmitDetail(status);
    if (!detail) return;

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
    this._closeDialog();
    // Prevent browser from restoring focus to the trigger button
    (document.activeElement as HTMLElement)?.blur();
    this.reset();
  }

  private _toggleCollection(id: number) {
    if (this._collectionIds.includes(id)) {
      this._collectionIds = this._collectionIds.filter((cid) => cid !== id);
    } else {
      this._collectionIds = [...this._collectionIds, id];
    }
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
    // Listen on document — fullscreen element lives on document.body, outside the dialog
    document.addEventListener(
      "jant:fullscreen-close",
      this._handleFullscreenClose as EventListener,
    );

    // Intercept native dialog cancel (ESC) to route through requestClose
    const dialog = this.closest("dialog");
    if (dialog) {
      dialog.addEventListener("cancel", this._handleDialogCancel);
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
    document.removeEventListener(
      "jant:fullscreen-close",
      this._handleFullscreenClose as EventListener,
    );

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
      this.requestClose();
    } else if (ke.key === "Enter" && this._confirmPanelOpen) {
      ke.preventDefault();
      this._confirmPanelOpen = false;
      this._submit("draft");
    } else if ((ke.metaKey || ke.ctrlKey) && ke.key === "Enter") {
      e.preventDefault();
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
      this.querySelector<HTMLTextAreaElement>(
        ".compose-attached-textarea",
      )?.focus();
    });
  };

  private _onAttachedTextInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    this._editor?.updateAttachedText(this._attachedTextIndex, value);
  }

  private _closeAttachedPanel() {
    this._attachedPanelOpen = false;
    this._editor?.closeAttachedPanel(this._attachedTextIndex);
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

        <div class="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            class="compose-dialog-header-btn"
            title=${this.labels.saveDraft}
            ?disabled=${this._loading}
            @click=${() => this._submit("draft")}
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
          </button>

          ${this._renderMoreMenu()}
        </div>
      </header>
    `;
  }

  private _renderMoreMenu() {
    return html`
      <div class="relative">
        ${this._showMoreMenu
          ? html`<div
              class="compose-dropdown-backdrop"
              @click=${() => {
                this._showMoreMenu = false;
              }}
            ></div>`
          : nothing}
        <button
          type="button"
          class="compose-dialog-header-btn"
          @click=${() => {
            this._showMoreMenu = !this._showMoreMenu;
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
              <div class="compose-dropdown compose-dropdown-right">
                <button
                  type="button"
                  class="compose-dropdown-item"
                  @click=${() => {
                    this._submit("draft");
                    this._showMoreMenu = false;
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
    if (!this.collections || this.collections.length === 0) {
      return html`<div class="flex-1"></div>`;
    }

    const search = this._collectionSearch.toLowerCase();
    const filtered = search
      ? this.collections.filter((c) => c.title.toLowerCase().includes(search))
      : this.collections;
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
              ? html`<span class="badge compose-collection-badge"
                  >${selectedCount}</span
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
            data-side="top"
            aria-hidden=${this._showCollection ? "false" : "true"}
          >
            <header>
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
                  this._collectionSearch = (e.target as HTMLInputElement).value;
                }}
              />
            </header>
            <div
              role="listbox"
              aria-multiselectable="true"
              data-empty=${this.labels.noCollections}
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
          </div>
        </div>
      </div>
    `;
  }

  private _renderAttachedPanel() {
    if (!this._attachedPanelOpen) return nothing;
    const editor = this._editor;
    const item = editor?._attachedTexts[this._attachedTextIndex];
    const attachedText = item?.text ?? "";

    return html`
      <div class="compose-attached-panel">
        <div class="compose-alt-header">
          <button
            type="button"
            class="compose-attached-panel-back"
            @click=${() => this._closeAttachedPanel()}
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
          <span class="compose-alt-title">${this.labels.attachedText}</span>
          ${attachedText.length > 0
            ? html`<span
                class="compose-attached-charcount text-xs text-muted-foreground tracking-wide"
                >${attachedText.length.toLocaleString()} chars</span
              >`
            : nothing}
        </div>
        <div class="flex-1 p-4 overflow-hidden flex flex-col">
          <textarea
            .value=${attachedText}
            @input=${(e: Event) => this._onAttachedTextInput(e)}
            class="compose-input compose-attached-textarea"
            placeholder=${this.labels.attachedTextPlaceholder}
          ></textarea>
        </div>
        <div class="compose-alt-footer">
          <span class="text-xs text-muted-foreground"
            >${this.labels.attachedTextHint}</span
          >
          <button
            type="button"
            class="compose-post-btn"
            @click=${() => this._closeAttachedPanel()}
          >
            ${this.labels.done}
          </button>
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

    return html`
      <div class="compose-confirm-panel">
        <div class="compose-confirm-sheet">
          <div class="compose-confirm-header">
            <p class="compose-confirm-title">
              ${this.labels.confirmCloseTitle}
            </p>
            <p class="compose-confirm-subtitle">
              ${this.labels.confirmCloseSubtitle}
            </p>
          </div>
          <button
            type="button"
            class="compose-confirm-action compose-confirm-save"
            @click=${() => {
              this._confirmPanelOpen = false;
              this._submit("draft");
            }}
          >
            ${this.labels.confirmCloseSave}
          </button>
          <button
            type="button"
            class="compose-confirm-action compose-confirm-discard"
            @click=${() => this._discardAndClose()}
          >
            ${this.labels.confirmCloseDiscard}
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

  render() {
    return html`
      <div class="compose-dialog-inner">
        ${this._renderHeader()}
        <jant-compose-editor
          .format=${this._format}
          .labels=${this.labels}
          .uploadMaxFileSize=${this.uploadMaxFileSize}
        ></jant-compose-editor>

        <div class="compose-action-row">
          ${this._renderCollectionSelector()}
          <button
            type="button"
            class="compose-post-btn"
            ?disabled=${this._loading}
            @click=${() => this._submit("published")}
          >
            ${this._loading
              ? html`<svg
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
                </svg>`
              : nothing}
            ${this._editPostId ? this.labels.update : this.labels.post}
          </button>
        </div>
        ${this._renderAttachedPanel()} ${this._renderAltPanel()}
        ${this._renderConfirmPanel()}
      </div>
    `;
  }
}

customElements.define("jant-compose-dialog", JantComposeDialog);
