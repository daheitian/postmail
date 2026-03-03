/**
 * Text Preview Dialog
 *
 * Displays attached text content (TipTap-authored) in a modal dialog.
 * Intercepts clicks on [data-text-preview-url] buttons, fetches the
 * stored { json, html } envelope from the URL, and renders the HTML
 * in a native <dialog>.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class JantTextPreview extends LitElement {
  static properties = {
    _open: { state: true },
    _html: { state: true },
    _loading: { state: true },
  };

  declare _open: boolean;
  declare _html: string;
  declare _loading: boolean;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this._open = false;
    this._html = "";
    this._loading = false;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#handleDocumentClick);
  }

  #handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>("[data-text-preview-id]");
    if (!btn) return;

    e.preventDefault();
    const mediaId = btn.dataset.textPreviewId;
    if (mediaId) this.#openPreview(mediaId);
  };

  async #openPreview(mediaId: string) {
    this._loading = true;
    this._open = true;

    document.body.style.overflow = "hidden";

    await this.updateComplete;
    this.querySelector<HTMLDialogElement>(".text-preview-dialog")?.showModal();

    try {
      const res = await fetch(`/api/media/${mediaId}/content`);
      if (!res.ok) throw new Error("Fetch failed");

      const raw = await res.text();

      // Try parsing as { json, html } envelope
      try {
        const envelope = JSON.parse(raw) as { html?: string };
        this._html = envelope.html || "";
      } catch {
        // Not JSON — treat as raw HTML or plain text
        this._html = `<pre>${raw.replace(/</g, "&lt;")}</pre>`;
      }
    } catch {
      this._html = "<p>Failed to load content.</p>";
    } finally {
      this._loading = false;
    }
  }

  #close() {
    this.querySelector<HTMLDialogElement>(".text-preview-dialog")?.close();
    document.body.style.overflow = "";
    this._open = false;
    this._html = "";
  }

  #handleKeydown = (e: globalThis.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.#close();
    }
  };

  render() {
    if (!this._open) return nothing;

    return html`
      <dialog
        class="text-preview-dialog"
        @cancel=${(e: Event) => {
          e.preventDefault();
          this.#close();
        }}
        @keydown=${this.#handleKeydown}
        @click=${(e: Event) => {
          // Close on backdrop click
          if ((e.target as HTMLElement).tagName === "DIALOG") {
            this.#close();
          }
        }}
      >
        <div class="text-preview-content">
          <button
            type="button"
            class="text-preview-close"
            @click=${() => this.#close()}
          >
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
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          ${this._loading
            ? html`<div class="text-preview-loading">
                <svg
                  class="animate-spin size-5"
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
            : html`<div class="text-preview-body prose">
                ${unsafeHTML(this._html)}
              </div>`}
        </div>
      </dialog>
    `;
  }
}

customElements.define("jant-text-preview", JantTextPreview);
