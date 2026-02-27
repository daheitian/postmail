/**
 * Post Menu
 *
 * Global singleton dropdown that appears on any post's [...] trigger button.
 * Reads post metadata from `data-*` attributes on the closest `article[data-post]`.
 * Uses BaseCoat dropdown-menu component structure for styling.
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import { showToast } from "../toast.js";

interface PostMenuData {
  sqid: string;
  permalink: string;
  pinned: boolean;
  visibility: string;
}

interface CollectionItem {
  id: number;
  title: string;
  slug: string;
}

export class JantPostMenu extends LitElement {
  static properties = {
    _open: { state: true },
    _data: { state: true },
    _x: { state: true },
    _y: { state: true },
    _openAbove: { state: true },
    _collectionsExpanded: { state: true },
    _collections: { state: true },
    _collectionsLoading: { state: true },
  };

  declare _open: boolean;
  declare _data: PostMenuData | null;
  declare _x: number;
  declare _y: number;
  declare _openAbove: boolean;
  declare _collectionsExpanded: boolean;
  declare _collections: CollectionItem[] | null;
  declare _collectionsLoading: boolean;
  declare _triggerEl: HTMLElement | null;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this._open = false;
    this._data = null;
    this._x = 0;
    this._y = 0;
    this._openAbove = true;
    this._collectionsExpanded = false;
    this._collections = null;
    this._collectionsLoading = false;
    this._triggerEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#handleDocumentClick);
    document.addEventListener("keydown", this.#handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#handleDocumentClick);
    document.removeEventListener("keydown", this.#handleKeydown);
  }

  #handleKeydown = (e: Event) => {
    const ke = e as globalThis.KeyboardEvent;
    if (ke.key === "Escape" && this._open) {
      this.#close();
    }
  };

  #handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Clicking a trigger button
    const trigger = target.closest<HTMLButtonElement>(
      "[data-post-menu-trigger]",
    );
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      const article = trigger.closest<HTMLElement>("article[data-post]");
      if (!article) return;

      const sqid = article.dataset.postId;
      if (!sqid) return;

      // Toggle: close if same post, open if different
      if (this._open && this._data?.sqid === sqid) {
        this.#close();
        return;
      }

      this._data = {
        sqid,
        permalink: article.dataset.postPermalink ?? "",
        pinned: article.hasAttribute("data-post-pinned"),
        visibility: article.dataset.postVisibility ?? "listed",
      };

      // Position relative to trigger
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 280; // estimate
      this._openAbove = spaceBelow < menuHeight;

      this._x = rect.right;
      this._y = this._openAbove ? rect.top : rect.bottom;
      this._triggerEl = trigger;
      trigger.setAttribute("aria-expanded", "true");
      this._collectionsExpanded = false;
      this._open = true;
      return;
    }

    // Clicking inside the dropdown — don't close
    if (this._open) {
      const menu = (e.target as HTMLElement).closest?.("[role='menu']");
      if (menu) return;
    }

    // Clicking outside — close
    if (this._open) {
      this.#close();
    }
  };

  #close() {
    this._triggerEl?.setAttribute("aria-expanded", "false");
    this._triggerEl = null;
    this._open = false;
    this._collectionsExpanded = false;
  }

  // --- Actions ---

  async #edit() {
    if (!this._data) return;
    const sqid = this._data.sqid;
    this.#close();

    const dialog = document.getElementById(
      "compose-dialog",
    ) as HTMLDialogElement | null;
    const composeEl = dialog?.querySelector("jant-compose-dialog") as
      | import("./jant-compose-dialog.js").JantComposeDialog
      | null;
    if (composeEl) {
      await composeEl.openEdit(sqid);
    }
  }

  async #toggleFeature() {
    if (!this._data) return;
    const newVisibility =
      this._data.visibility === "featured" ? "listed" : "featured";

    try {
      const res = await fetch(`/api/posts/${this._data.sqid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (!res.ok) throw new Error();

      // Update article's data attribute
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.sqid}"]`,
      );
      if (article) article.dataset.postVisibility = newVisibility;
      this._data = { ...this._data, visibility: newVisibility };

      showToast(
        newVisibility === "featured" ? "Post featured." : "Post unfeatured.",
      );
    } catch {
      showToast("Could not update post. Try again.", "error");
    }
    this.#close();
  }

  async #togglePin() {
    if (!this._data) return;
    const newPinned = !this._data.pinned;

    try {
      const res = await fetch(`/api/posts/${this._data.sqid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned }),
      });
      if (!res.ok) throw new Error();

      // Update article's data attribute
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.sqid}"]`,
      );
      if (article) {
        if (newPinned) {
          article.setAttribute("data-post-pinned", "");
        } else {
          article.removeAttribute("data-post-pinned");
        }
      }
      this._data = { ...this._data, pinned: newPinned };

      showToast(newPinned ? "Post pinned." : "Post unpinned.");
    } catch {
      showToast("Could not update post. Try again.", "error");
    }
    this.#close();
  }

  async #delete() {
    if (!this._data) return;
    if (!window.confirm("Delete this post permanently? This can't be undone."))
      return;

    try {
      const res = await fetch(`/api/posts/${this._data.sqid}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      // Remove article from DOM
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.sqid}"]`,
      );
      // Remove the feed item wrapper if it exists, otherwise the article itself
      const feedItem = article?.closest(".feed-item");
      (feedItem ?? article)?.remove();

      showToast("Post deleted.");
    } catch {
      showToast("Could not delete post. Try again.", "error");
    }
    this.#close();
  }

  async #copyLink() {
    if (!this._data) return;
    try {
      await globalThis.navigator.clipboard.writeText(
        window.location.origin + this._data.permalink,
      );
      showToast("Link copied.");
    } catch {
      showToast("Could not copy link.", "error");
    }
    this.#close();
  }

  async #toggleCollections() {
    this._collectionsExpanded = !this._collectionsExpanded;
    if (this._collectionsExpanded && !this._collections) {
      this._collectionsLoading = true;
      try {
        const res = await fetch("/api/collections");
        if (!res.ok) throw new Error();
        const data = await res.json();
        this._collections = data.collections ?? [];
      } catch {
        this._collections = [];
        showToast("Could not load collections.", "error");
      }
      this._collectionsLoading = false;
    }
  }

  async #addToCollection(collectionId: number) {
    if (!this._data) return;
    try {
      const res = await fetch(`/api/collections/${collectionId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: this._data.sqid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 409 || body?.error?.includes("already")) {
          showToast("Post is already in this collection.");
          return;
        }
        throw new Error();
      }
      showToast("Added to collection.");
    } catch {
      showToast("Could not add to collection. Try again.", "error");
    }
  }

  // --- Icons (inline SVG) ---

  #iconEdit() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>`;
  }

  #iconCollection() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>`;
  }

  // Lucide: heart (feature) / heart-off (unfeature)
  #iconHeart() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      />
    </svg>`;
  }

  #iconHeartOff() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <path
        d="M16.5 16.5 12 21l-7-7c-1.5-1.45-3-3.2-3-5.5a5.5 5.5 0 0 1 2.14-4.35"
      />
      <path
        d="M8.76 3.1c1.15.22 2.13.78 3.24 1.9 1.5-1.5 2.74-2 4.5-2A5.5 5.5 0 0 1 22 8.5c0 2.12-1.3 3.78-2.67 5.17"
      />
    </svg>`;
  }

  // Lucide: pin / pin-off
  #iconPin() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="12" x2="12" y1="17" y2="22" />
      <path
        d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"
      />
    </svg>`;
  }

  #iconPinOff() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12" />
      <path d="M15 9.34V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0-1.4.6" />
    </svg>`;
  }

  #iconTrash() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>`;
  }

  #iconLink() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>`;
  }

  #iconChevron() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>`;
  }

  // --- Render ---

  #renderCollections() {
    if (!this._collectionsExpanded) return nothing;

    return html`
      <div role="group" class="post-menu-collections">
        ${this._collectionsLoading
          ? html`<div role="menuitem" aria-disabled="true">Loading...</div>`
          : this._collections && this._collections.length > 0
            ? this._collections.map(
                (c) => html`
                  <div
                    role="menuitem"
                    @click=${() => this.#addToCollection(c.id)}
                  >
                    ${c.title}
                  </div>
                `,
              )
            : html`<div role="menuitem" aria-disabled="true">
                No collections yet
              </div>`}
      </div>
    `;
  }

  render() {
    if (!this._open || !this._data) return nothing;

    const isFeatured = this._data.visibility === "featured";
    const isPinned = this._data.pinned;

    const style = `position:fixed;z-index:100;right:${document.documentElement.clientWidth - this._x}px;${
      this._openAbove
        ? `bottom:${window.innerHeight - this._y + 6}px;`
        : `top:${this._y + 6}px;`
    }`;

    return html`
      <div class="post-menu-backdrop" @click=${() => this.#close()}></div>
      <div class="dropdown-menu" style=${style}>
        <div data-popover aria-hidden="false" class="min-w-52 right-0">
          <div role="menu">
            <div role="menuitem" @click=${() => this.#edit()}>
              ${this.#iconEdit()} Edit
            </div>

            <hr role="separator" />

            <div role="menuitem" @click=${() => this.#toggleCollections()}>
              ${this._collectionsExpanded
                ? this.#iconChevron()
                : this.#iconCollection()}
              Add to collection
            </div>
            ${this.#renderCollections()}
            <div role="menuitem" @click=${() => this.#toggleFeature()}>
              ${isFeatured ? this.#iconHeartOff() : this.#iconHeart()}
              ${isFeatured ? "Unfeature" : "Feature this post"}
            </div>
            <div role="menuitem" @click=${() => this.#togglePin()}>
              ${isPinned ? this.#iconPinOff() : this.#iconPin()}
              ${isPinned ? "Unpin" : "Pin this post"}
            </div>

            <hr role="separator" />

            <div
              role="menuitem"
              class="text-destructive! [&_svg]:text-destructive!"
              @click=${() => this.#delete()}
            >
              ${this.#iconTrash()} Delete
            </div>

            <hr role="separator" />

            <div
              role="menuitem"
              class="text-muted-foreground!"
              @click=${() => this.#copyLink()}
            >
              ${this.#iconLink()} Copy link
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jant-post-menu", JantPostMenu);
