/**
 * Audio Card Player
 *
 * A 3:4 gallery card that plays audio on click. Audio is not loaded
 * until the user explicitly presses play (`preload="none"`).
 *
 * Reads `data-src`, `data-type`, `data-name`, and `data-size` from
 * the host element. Server-rendered card inner content acts as the
 * SSR fallback before Lit upgrades.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";

export class JantAudioCard extends LitElement {
  static properties = {
    _playing: { state: true },
    _progress: { state: true },
    _currentTime: { state: true },
    _duration: { state: true },
  };

  declare _playing: boolean;
  declare _progress: number;
  declare _currentTime: number;
  declare _duration: number;

  #audio: HTMLAudioElement | null = null;
  #rafId = 0;

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._playing = false;
    this._progress = 0;
    this._currentTime = 0;
    this._duration = 0;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#cleanup();
  }

  #cleanup() {
    cancelAnimationFrame(this.#rafId);
    if (this.#audio) {
      this.#audio.pause();
      this.#audio.removeEventListener("ended", this.#onEnded);
      this.#audio.removeEventListener("loadedmetadata", this.#onLoadedMetadata);
      this.#audio = null;
    }
  }

  #ensureAudio(): HTMLAudioElement {
    if (this.#audio) return this.#audio;

    const src = this.dataset.src;
    const type = this.dataset.type;
    if (!src) throw new Error("jant-audio-card: missing data-src");

    const audio = new Audio();
    audio.preload = "none";

    if (type) {
      const source = document.createElement("source");
      source.src = src;
      source.type = type;
      audio.appendChild(source);
    } else {
      audio.src = src;
    }

    audio.addEventListener("ended", this.#onEnded);
    audio.addEventListener("loadedmetadata", this.#onLoadedMetadata);
    this.#audio = audio;
    return audio;
  }

  #onEnded = () => {
    this._playing = false;
    this._progress = 0;
    this._currentTime = 0;
    cancelAnimationFrame(this.#rafId);
  };

  #onLoadedMetadata = () => {
    if (this.#audio) {
      this._duration = this.#audio.duration;
    }
  };

  #updateProgress = () => {
    if (!this.#audio || this.#audio.paused) return;
    const { currentTime, duration } = this.#audio;
    if (duration > 0) {
      this._progress = currentTime / duration;
      this._currentTime = currentTime;
      this._duration = duration;
    }
    this.#rafId = requestAnimationFrame(this.#updateProgress);
  };

  async #toggle(e: Event) {
    e.preventDefault();
    e.stopPropagation();

    const audio = this.#ensureAudio();

    if (this._playing) {
      audio.pause();
      this._playing = false;
      cancelAnimationFrame(this.#rafId);
    } else {
      await audio.play();
      this._playing = true;
      this.#rafId = requestAnimationFrame(this.#updateProgress);
    }
  }

  #seek(e: MouseEvent) {
    if (!this.#audio || !this._duration) return;
    e.preventDefault();
    e.stopPropagation();

    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    this.#audio.currentTime = ratio * this._duration;
    this._progress = ratio;
    this._currentTime = this.#audio.currentTime;
  }

  #formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  render() {
    const playIcon = html`<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>`;
    const pauseIcon = html`<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>`;

    const name = this.dataset.name || "Audio";
    const size = this.dataset.size || "";

    return html`
      <button
        type="button"
        class="media-audio-card-btn"
        @click=${(e: Event) => this.#toggle(e)}
        aria-label=${this._playing ? "Pause" : "Play"}
      >
        <div class="media-gallery-card-inner">
          <div class="media-gallery-card-icon">
            <svg
              width="24"
              height="24"
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
          <span class="media-gallery-card-summary">${name}</span>
          ${size
            ? html`<span class="media-gallery-card-meta">${size}</span>`
            : nothing}
        </div>

        <div
          class="media-audio-play-overlay ${classMap({
            "is-playing": this._playing,
          })}"
        >
          ${this._playing ? pauseIcon : playIcon}
        </div>

        ${this._playing || this._progress > 0
          ? html` <div class="media-audio-progress-wrap">
              <div
                class="media-audio-progress-bar"
                @click=${(e: MouseEvent) => this.#seek(e)}
              >
                <div
                  class="media-audio-progress-fill"
                  style="width: ${(this._progress * 100).toFixed(1)}%"
                ></div>
              </div>
              ${this._duration > 0
                ? html`<span class="media-audio-time">
                    ${this.#formatTime(this._currentTime)} /
                    ${this.#formatTime(this._duration)}
                  </span>`
                : nothing}
            </div>`
          : nothing}
      </button>
    `;
  }
}

customElements.define("jant-audio-card", JantAudioCard);
