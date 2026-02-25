/**
 * Media Lightbox
 *
 * Fullscreen overlay carousel for post media galleries.
 * Intercepts clicks on [data-post-media] a[data-lightbox-index] via
 * delegated listener, reads image data from [data-lightbox-group],
 * and displays images in a native <dialog>.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";

interface LightboxImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export class JantMediaLightbox extends LitElement {
  static properties = {
    _images: { state: true },
    _currentIndex: { state: true },
    _open: { state: true },
  };

  declare _images: LightboxImage[];
  declare _currentIndex: number;
  declare _open: boolean;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this._images = [];
    this._currentIndex = 0;
    this._open = false;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#handleDocumentClick);
  }

  open(images: LightboxImage[], index: number) {
    this._images = images;
    this._currentIndex = Math.max(0, Math.min(index, images.length - 1));
    this._open = true;
    this.updateComplete.then(() => {
      this.querySelector<HTMLDialogElement>(".media-lightbox")?.showModal();
    });
  }

  close() {
    this.querySelector<HTMLDialogElement>(".media-lightbox")?.close();
    this._open = false;
  }

  #handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Find the closest anchor with data-lightbox-index inside [data-post-media]
    const anchor = target.closest<HTMLAnchorElement>(
      "[data-post-media] a[data-lightbox-index]",
    );
    if (!anchor) return;

    // Find the lightbox group container
    const group = anchor.closest<HTMLElement>("[data-lightbox-group]");
    if (!group) return;

    e.preventDefault();

    const index = parseInt(anchor.dataset.lightboxIndex ?? "0", 10);
    try {
      const images: LightboxImage[] = JSON.parse(
        group.dataset.lightboxGroup ?? "[]",
      );
      if (images.length > 0) {
        this.open(images, index);
      }
    } catch {
      // JSON parse failed — fall through to default link behavior
    }
  };

  #prev() {
    if (this._images.length <= 1) return;
    this._currentIndex =
      (this._currentIndex - 1 + this._images.length) % this._images.length;
  }

  #next() {
    if (this._images.length <= 1) return;
    this._currentIndex = (this._currentIndex + 1) % this._images.length;
  }

  #handleKeydown = (e: Event) => {
    const ke = e as globalThis.KeyboardEvent;
    if (ke.key === "ArrowLeft") {
      e.preventDefault();
      this.#prev();
    } else if (ke.key === "ArrowRight") {
      e.preventDefault();
      this.#next();
    }
  };

  #handleDialogClick = (e: Event) => {
    // Close on backdrop click (click on the dialog element itself, not its children)
    if (e.target === e.currentTarget) {
      this.close();
    }
  };

  #handleClose = () => {
    this._open = false;
  };

  render() {
    if (!this._open) return nothing;

    const img = this._images[this._currentIndex];
    const multiple = this._images.length > 1;

    return html`
      <dialog
        class="media-lightbox"
        @keydown=${this.#handleKeydown}
        @click=${this.#handleDialogClick}
        @close=${this.#handleClose}
      >
        <div class="media-lightbox-content">
          <button
            type="button"
            class="media-lightbox-close"
            @click=${() => this.close()}
            aria-label="Close"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          ${multiple
            ? html`<div class="media-lightbox-counter">
                ${this._currentIndex + 1} / ${this._images.length}
              </div>`
            : nothing}
          ${img?.mimeType?.startsWith("video/")
            ? html`<video
                class="media-lightbox-video"
                src=${img.url}
                controls
                autoplay
                playsinline
              ></video>`
            : html`<img
                class="media-lightbox-img"
                src=${img?.url ?? ""}
                alt=${img?.alt ?? ""}
              />`}
          ${multiple
            ? html`
                <button
                  type="button"
                  class="media-lightbox-nav media-lightbox-nav-prev"
                  @click=${() => this.#prev()}
                  aria-label="Previous"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="media-lightbox-nav media-lightbox-nav-next"
                  @click=${() => this.#next()}
                  aria-label="Next"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              `
            : nothing}
        </div>
      </dialog>
    `;
  }
}

customElements.define("jant-media-lightbox", JantMediaLightbox);
