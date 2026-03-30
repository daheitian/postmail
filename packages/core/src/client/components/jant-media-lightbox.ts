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
  posterUrl?: string;
}

const LIGHTBOX_MOBILE_BREAKPOINT = 640;
const LIGHTBOX_MOBILE_STAGE_PADDING_X = 8;
const LIGHTBOX_DESKTOP_STAGE_PADDING_X = 72;
const LIGHTBOX_STAGE_PADDING_Y = 16;
const LIGHTBOX_DESKTOP_READING_WIDTH = 704;
const LIGHTBOX_SCROLL_RATIO_THRESHOLD = 0.9;
const LIGHTBOX_SCROLL_WIDTH_THRESHOLD = 0.85;

function getPositiveDimension(value?: number): number | undefined {
  if (!Number.isFinite(value) || !value || value <= 0) return undefined;
  return value;
}

function getViewportSize(): { width: number; height: number } {
  const width =
    globalThis.innerWidth || document.documentElement.clientWidth || 0;
  const height =
    globalThis.innerHeight || document.documentElement.clientHeight || 0;

  return { width, height };
}

export function shouldUseScrollableLightboxImage(
  image: Pick<LightboxImage, "width" | "height" | "mimeType"> | undefined,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  // Switch to a fixed reading width only when contain-mode would make a
  // portrait image materially narrower than the intended viewing width.
  if (
    !image ||
    image.mimeType?.startsWith("video/") ||
    !getPositiveDimension(image.width) ||
    !getPositiveDimension(image.height) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return false;
  }

  const imageWidth = getPositiveDimension(image.width);
  const imageHeight = getPositiveDimension(image.height);
  if (!imageWidth || !imageHeight) return false;

  const isMobile = viewportWidth <= LIGHTBOX_MOBILE_BREAKPOINT;
  const stagePaddingX = isMobile
    ? LIGHTBOX_MOBILE_STAGE_PADDING_X
    : LIGHTBOX_DESKTOP_STAGE_PADDING_X;
  const stageWidth = Math.max(0, viewportWidth - stagePaddingX * 2);
  const stageHeight = Math.max(
    0,
    viewportHeight - LIGHTBOX_STAGE_PADDING_Y * 2,
  );

  if (stageWidth <= 0 || stageHeight <= 0) return false;

  const aspectRatio = imageWidth / imageHeight;
  const containWidth = Math.min(stageWidth, stageHeight * aspectRatio);
  const targetWidth = isMobile
    ? stageWidth
    : Math.min(stageWidth, LIGHTBOX_DESKTOP_READING_WIDTH);

  return (
    aspectRatio < LIGHTBOX_SCROLL_RATIO_THRESHOLD &&
    containWidth < targetWidth * LIGHTBOX_SCROLL_WIDTH_THRESHOLD
  );
}

export class JantMediaLightbox extends LitElement {
  static properties = {
    _images: { state: true },
    _currentIndex: { state: true },
    _open: { state: true },
    _viewportWidth: { state: true },
    _viewportHeight: { state: true },
  };

  declare _images: LightboxImage[];
  declare _currentIndex: number;
  declare _open: boolean;
  declare _viewportWidth: number;
  declare _viewportHeight: number;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    const viewport = getViewportSize();
    this._images = [];
    this._currentIndex = 0;
    this._open = false;
    this._viewportWidth = viewport.width;
    this._viewportHeight = viewport.height;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#handleDocumentClick);
    window.addEventListener("resize", this.#handleViewportChange);
    this.#syncViewport();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#handleDocumentClick);
    window.removeEventListener("resize", this.#handleViewportChange);
  }

  open(images: LightboxImage[], index: number) {
    this.#syncViewport();
    this._images = images;
    this._currentIndex = Math.max(0, Math.min(index, images.length - 1));
    this._open = true;
    this.updateComplete.then(() => {
      const dialog = this.querySelector<HTMLDialogElement>(".media-lightbox");
      dialog?.showModal();
      // Focus the content wrapper instead of letting the browser auto-focus
      // the close button, which would show a focus ring on arrow-key nav.
      this.querySelector<HTMLElement>(".media-lightbox-content")?.focus();
    });
  }

  close() {
    this.querySelector<HTMLDialogElement>(".media-lightbox")?.close();
    this._open = false;
  }

  #handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Find the closest anchor with data-lightbox-index inside [data-post-media]
    // Media gallery lightbox (existing)
    const anchor = target.closest<HTMLAnchorElement>(
      "[data-post-media] a[data-lightbox-index]",
    );
    if (anchor) {
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
      return;
    }

    // Inline body images — collect all <img> within the same [data-post-body]
    const img = target.closest<HTMLImageElement>("[data-post-body] img");
    if (img) {
      e.preventDefault();
      const container = img.closest<HTMLElement>("[data-post-body]");
      if (!container) return;
      const allImages = Array.from(
        container.querySelectorAll<HTMLImageElement>("img"),
      );
      const images: LightboxImage[] = allImages.map((i) => ({
        url: i.src,
        alt: i.alt || "",
        width: getPositiveDimension(
          i.naturalWidth || Number(i.getAttribute("width")),
        ),
        height: getPositiveDimension(
          i.naturalHeight || Number(i.getAttribute("height")),
        ),
      }));
      const index = allImages.indexOf(img);
      if (images.length > 0) this.open(images, Math.max(0, index));
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
    const target = e.target as HTMLElement;
    // Close on backdrop click (dialog itself or the content wrapper, not media/buttons)
    if (
      target === e.currentTarget ||
      target.classList.contains("media-lightbox-content") ||
      target.classList.contains("media-lightbox-stage")
    ) {
      this.close();
    }
  };

  #handleClose = () => {
    this._open = false;
  };

  #handleViewportChange = () => {
    this.#syncViewport();
  };

  #syncViewport() {
    const viewport = getViewportSize();
    if (
      viewport.width === this._viewportWidth &&
      viewport.height === this._viewportHeight
    ) {
      return;
    }

    this._viewportWidth = viewport.width;
    this._viewportHeight = viewport.height;
  }

  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);

    if (!this._open) return;
    if (!changed.has("_currentIndex") && !changed.has("_open")) return;

    const stage = this.querySelector<HTMLElement>(".media-lightbox-stage");
    if (!stage) return;
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  }

  render() {
    if (!this._open) return nothing;

    const img = this._images[this._currentIndex];
    const multiple = this._images.length > 1;
    const isScrollableImage = shouldUseScrollableLightboxImage(
      img,
      this._viewportWidth,
      this._viewportHeight,
    );

    return html`
      <dialog
        class="media-lightbox"
        @keydown=${this.#handleKeydown}
        @click=${this.#handleDialogClick}
        @close=${this.#handleClose}
      >
        <div class="media-lightbox-content" tabindex="-1">
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
          <div
            class=${`media-lightbox-stage${isScrollableImage ? " media-lightbox-stage-scroll" : ""}`}
          >
            ${img?.mimeType?.startsWith("video/")
              ? html`<video
                  class="media-lightbox-video"
                  src=${img.url}
                  poster=${img.posterUrl ?? ""}
                  controls
                  autoplay
                  playsinline
                ></video>`
              : html`<img
                  class=${`media-lightbox-img${isScrollableImage ? " media-lightbox-img-scroll" : ""}`}
                  src=${img?.url ?? ""}
                  alt=${img?.alt ?? ""}
                />`}
          </div>
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
