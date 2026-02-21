/**
 * Compose Dialog
 *
 * Outer shell for the compose dialog: header with format switcher,
 * collection selector, action row, and media picker dialog.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import type {
  ComposeFormat,
  ComposeLabels,
  ComposeCollection,
  ComposeSubmitDetail,
} from "./compose-types.js";
import type { JantComposeEditor } from "./jant-compose-editor.js";

export class JantComposeDialog extends LitElement {
  static properties = {
    collections: { type: Array },
    labels: { type: Object },
    _format: { state: true },
    _status: { state: true },
    _loading: { state: true },
    _collectionIds: { state: true },
    _mediaIds: { state: true },
    _showCollection: { state: true },
    _showMoreMenu: { state: true },
  };

  declare collections: ComposeCollection[];
  declare labels: ComposeLabels;
  declare _format: ComposeFormat;
  declare _status: "published" | "draft";
  declare _loading: boolean;
  declare _collectionIds: number[];
  declare _mediaIds: string[];
  declare _showCollection: boolean;
  declare _showMoreMenu: boolean;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.collections = [];
    this.labels = {} as ComposeLabels;
    this._format = "note";
    this._status = "published";
    this._loading = false;
    this._collectionIds = [];
    this._mediaIds = [];
    this._showCollection = false;
    this._showMoreMenu = false;
  }

  private get _editor(): JantComposeEditor | null {
    return this.querySelector("jant-compose-editor");
  }

  reset() {
    this._format = "note";
    this._status = "published";
    this._loading = false;
    this._collectionIds = [];
    this._mediaIds = [];
    this._showCollection = false;
    this._showMoreMenu = false;
    this._editor?.reset();
  }

  set loading(v: boolean) {
    this._loading = v;
  }

  set mediaIds(v: string[]) {
    this._mediaIds = [...v];
  }

  private _closeDialog() {
    this.closest("dialog")?.close();
  }

  private _submit(status: "published" | "draft") {
    if (this._loading) return;
    const editor = this._editor;
    if (!editor) return;

    const editorData = editor.getData();
    const detail: ComposeSubmitDetail = {
      format: this._format,
      title: editorData.title,
      body: editorData.body,
      url: editorData.url,
      quoteText: editorData.quoteText,
      quoteAuthor: editorData.quoteAuthor,
      status,
      rating: editorData.rating,
      collectionIds: [...this._collectionIds],
      mediaIds: [...this._mediaIds],
      attachedText: editorData.attachedText,
    };

    this.dispatchEvent(
      new CustomEvent("jant:compose-submit", {
        bubbles: true,
        detail,
      }),
    );
  }

  private _toggleCollection(id: number) {
    if (this._collectionIds.includes(id)) {
      this._collectionIds = this._collectionIds.filter((cid) => cid !== id);
    } else {
      this._collectionIds = [...this._collectionIds, id];
    }
  }

  private _openMediaPicker() {
    const picker = this.querySelector<HTMLDialogElement>(
      "#compose-media-picker",
    );
    picker?.showModal();
    this.dispatchEvent(
      new CustomEvent("jant:load-media-picker", { bubbles: true }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "jant:open-media-picker",
      this._handleOpenMediaPicker,
    );
    this.addEventListener("keydown", this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "jant:open-media-picker",
      this._handleOpenMediaPicker,
    );
    this.removeEventListener("keydown", this._handleKeydown);
  }

  private _handleOpenMediaPicker = () => {
    this._openMediaPicker();
  };

  private _handleKeydown = (e: Event) => {
    const ke = e as globalThis.KeyboardEvent;
    if ((ke.metaKey || ke.ctrlKey) && ke.key === "Enter") {
      e.preventDefault();
      this._submit("published");
    }
  };

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
          @click=${() => this._closeDialog()}
        >
          ${this.labels.cancel}
        </button>

        <div class="compose-dialog-header-center">
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
                    this._closeDialog();
                    this._showMoreMenu = false;
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

    return html`
      <div class="relative flex-1 min-w-0">
        ${this._showCollection
          ? html`<div
              class="compose-dropdown-backdrop"
              @click=${() => {
                this._showCollection = false;
              }}
            ></div>`
          : nothing}
        <button
          type="button"
          class=${classMap({
            "compose-collection-trigger": true,
            "compose-collection-trigger-active": this._collectionIds.length > 0,
          })}
          @click=${() => {
            this._showCollection = !this._showCollection;
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
            class="shrink-0"
          >
            <rect x="3" y="5" width="12" height="10" rx="2" />
            <path d="M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
          </svg>
          <span class="compose-collection-label"
            >${this.labels.collection}</span
          >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 -ml-0.5"
          >
            <path d="M3 4l2 2 2-2" />
          </svg>
        </button>

        ${this._showCollection
          ? html`
              <div class="compose-dropdown compose-dropdown-above">
                ${this.collections.map(
                  (col) => html`
                    <button
                      type="button"
                      class=${classMap({
                        "compose-dropdown-item": true,
                        "compose-dropdown-item-active":
                          this._collectionIds.includes(col.id),
                      })}
                      @click=${() => this._toggleCollection(col.id)}
                    >
                      <input
                        type="checkbox"
                        class="checkbox pointer-events-none"
                        .checked=${this._collectionIds.includes(col.id)}
                      />
                      ${col.icon ? `${col.icon} ${col.title}` : col.title}
                      ${this._collectionIds.includes(col.id)
                        ? html`<span class="compose-dropdown-check">✓</span>`
                        : nothing}
                    </button>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderMediaPicker() {
    return html`
      <dialog
        id="compose-media-picker"
        class="compose-media-picker"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget)
            (e.target as HTMLDialogElement).close();
        }}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">${this.labels.selectMedia}</h2>
          <button
            type="button"
            class="btn-outline text-sm"
            @click=${(e: Event) =>
              (e.target as HTMLElement).closest("dialog")?.close()}
          >
            ${this.labels.done}
          </button>
        </div>
        <div
          id="compose-media-grid"
          class="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto"
        >
          <p class="text-muted-foreground text-sm col-span-4">
            ${this.labels.loading}
          </p>
        </div>
      </dialog>
    `;
  }

  render() {
    return html`
      <div class="compose-dialog-inner">
        ${this._renderHeader()}
        <jant-compose-editor
          .format=${this._format}
          .labels=${this.labels}
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
            ${this.labels.post}
          </button>
        </div>

        ${this._renderMediaPicker()}
      </div>
    `;
  }
}

customElements.define("jant-compose-dialog", JantComposeDialog);
