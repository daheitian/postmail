/**
 * Post Menu
 *
 * Global singleton dropdown that appears on any post's [...] trigger button.
 * Reads post metadata from `data-*` attributes on the closest `article[data-post]`.
 * Uses BaseCoat dropdown-menu component structure for styling.
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 *
 * Includes a collection picker sub-view that replaces the menu content
 * when "Add to collection" is clicked (multi-select with search).
 */

import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { showConfirmDialog } from "../confirm.js";
import { showToast } from "../toast.js";
import type { CollectionSubmitDetail } from "./collection-types.js";

interface PostMenuData {
  id: string;
  permalink: string;
  pinned: boolean;
  featured: boolean;
  visibility: string;
  isReply: boolean;
}

interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
}

/**
 * Render a collection icon from its raw DB value (JSON or legacy emoji).
 * Inline helper to avoid pulling lucide-static into the post-menu bundle.
 */
function renderIconHtml(icon: string | null): string {
  if (!icon) return "";
  if (icon.startsWith("{")) {
    try {
      const parsed = JSON.parse(icon) as {
        svg?: string;
        color?: string;
      };
      if (typeof parsed.svg === "string") {
        let svg = parsed.svg
          .replace(/width="\d+"/, 'width="16"')
          .replace(/height="\d+"/, 'height="16"');
        if (parsed.color) {
          svg = svg.replace(/^<svg/, `<svg style="color: ${parsed.color}"`);
        }
        return svg;
      }
    } catch {
      /* not JSON — treat as text */
    }
  }
  // Legacy emoji/text value
  return `<span>${icon}</span>`;
}

export class JantPostMenu extends LitElement {
  static properties = {
    _open: { state: true },
    _data: { state: true },
    _x: { state: true },
    _y: { state: true },
    _openAbove: { state: true },
    _collectionPickerOpen: { state: true },
    _collections: { state: true },
    _collectionsLoading: { state: true },
    _collectionSearch: { state: true },
    _postCollectionIds: { state: true },
    _addCollectionPanelOpen: { state: true },
  };

  declare _open: boolean;
  declare _data: PostMenuData | null;
  declare _x: number;
  declare _y: number;
  declare _openAbove: boolean;
  declare _collectionPickerOpen: boolean;
  declare _collections: CollectionItem[] | null;
  declare _collectionsLoading: boolean;
  declare _collectionSearch: string;
  declare _postCollectionIds: string[];
  declare _addCollectionPanelOpen: boolean;
  declare _triggerEl: HTMLElement | null;

  /** Whether collections were modified during this session (triggers page reload on close) */
  #collectionsDirty = false;

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
    this._collectionPickerOpen = false;
    this._collections = null;
    this._collectionsLoading = false;
    this._collectionSearch = "";
    this._postCollectionIds = [];
    this._addCollectionPanelOpen = false;
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
    if (ke.key === "Escape") {
      // Close collection popovers first
      const openPopover = document.querySelector(
        "[data-collection-popover].open",
      );
      if (openPopover) {
        openPopover.classList.remove("open");
        return;
      }
      if (this._open) {
        this.#close();
      }
    }
  };

  #handleDocumentClick = (e: Event) => {
    const target = e.target as HTMLElement;

    // Collection popover toggle
    const popoverTrigger = target.closest<HTMLElement>(
      "[data-collection-popover-trigger]",
    );
    if (popoverTrigger) {
      e.preventDefault();
      e.stopPropagation();
      const popover = popoverTrigger.parentElement?.querySelector<HTMLElement>(
        "[data-collection-popover]",
      );
      if (popover) {
        popover.classList.toggle("open");
      }
      return;
    }

    // Click inside a collection popover — don't close it
    if (target.closest("[data-collection-popover]")) {
      return;
    }

    // Close any open collection popovers on outside click
    const openPopover = document.querySelector(
      "[data-collection-popover].open",
    );
    if (openPopover) {
      openPopover.classList.remove("open");
    }

    // Clicking a trigger button
    const trigger = target.closest<HTMLButtonElement>(
      "[data-post-menu-trigger]",
    );
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      const article = trigger.closest<HTMLElement>("article[data-post]");
      if (!article) return;

      const postId = article.dataset.postId;
      if (!postId) return;

      // Toggle: close if same post, open if different
      if (this._open && this._data?.id === postId) {
        this.#close();
        return;
      }

      this._data = {
        id: postId,
        permalink: article.dataset.postPermalink ?? "",
        pinned: article.hasAttribute("data-post-pinned"),
        featured: article.hasAttribute("data-post-featured"),
        visibility: article.dataset.postVisibility ?? "public",
        isReply: article.hasAttribute("data-post-reply"),
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
      this._collectionPickerOpen = false;
      this._open = true;
      return;
    }

    // Clicking inside the dropdown — don't close (menu or collection picker)
    if (this._open) {
      const inside = target.closest?.(
        "[role='menu'], [data-collection-picker]",
      );
      if (inside) return;
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
    this._collectionPickerOpen = false;
    this._addCollectionPanelOpen = false;
    this._collectionSearch = "";

    if (this.#collectionsDirty) {
      this.#collectionsDirty = false;
      window.location.reload();
    }
  }

  // --- Actions ---

  async #edit() {
    if (!this._data) return;
    const postId = this._data.id;
    this.#close();

    const dialog = document.getElementById(
      "compose-dialog",
    ) as HTMLDialogElement | null;
    const composeEl = dialog?.querySelector("jant-compose-dialog") as
      | import("./jant-compose-dialog.js").JantComposeDialog
      | null;
    if (composeEl) {
      await composeEl.openEdit(postId);
    }
  }

  async #setVisibility(newVisibility: string) {
    if (!this._data) return;

    try {
      const res = await fetch(`/api/posts/${this._data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (!res.ok) throw new Error();

      // Update article's data attribute
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.id}"]`,
      );
      if (article) article.dataset.postVisibility = newVisibility;
      this._data = { ...this._data, visibility: newVisibility };

      const messages: Record<string, string> = {
        public: "Post made public.",
        unlisted: "Post unlisted.",
        private: "Post made private.",
      };
      showToast(messages[newVisibility] ?? "Visibility updated.");
    } catch {
      showToast("Could not update post. Try again.", "error");
    }
    this.#close();
  }

  async #setFeatured(featured: boolean) {
    if (!this._data) return;

    try {
      const res = await fetch(`/api/posts/${this._data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured }),
      });
      if (!res.ok) throw new Error();

      // Update article's data attribute
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.id}"]`,
      );
      if (article) {
        if (featured) {
          article.setAttribute("data-post-featured", "");
        } else {
          article.removeAttribute("data-post-featured");
        }
      }
      this._data = { ...this._data, featured };

      showToast(featured ? "Post featured." : "Post unfeatured.");
    } catch {
      showToast("Could not update post. Try again.", "error");
    }
    this.#close();
  }

  async #togglePin() {
    if (!this._data) return;
    const newPinned = !this._data.pinned;

    try {
      const res = await fetch(`/api/posts/${this._data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned }),
      });
      if (!res.ok) throw new Error();

      // Update article's data attribute
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.id}"]`,
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
    const confirmed = await showConfirmDialog({
      message: "Delete this post permanently? This can't be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/posts/${this._data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      // Remove article from DOM
      const article = document.querySelector<HTMLElement>(
        `article[data-post-id="${this._data.id}"]`,
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

  async #openCollectionPicker() {
    if (!this._data) return;
    const postId = this._data.id;
    this._collectionPickerOpen = true;
    this._collectionSearch = "";
    this._collectionsLoading = true;

    try {
      const [collectionsRes, postRes] = await Promise.all([
        fetch("/api/collections"),
        fetch(`/api/posts/${postId}`),
      ]);

      if (!collectionsRes.ok) throw new Error();
      const collectionsData = await collectionsRes.json();
      this._collections = collectionsData.collections ?? [];

      if (postRes.ok) {
        const postData = await postRes.json();
        this._postCollectionIds = postData.collectionIds ?? [];
      }
    } catch {
      this._collections = this._collections ?? [];
      showToast("Could not load collections.", "error");
    }
    this._collectionsLoading = false;
  }

  async #toggleCollection(collectionId: string) {
    if (!this._data) return;
    const isSelected = this._postCollectionIds.includes(collectionId);

    try {
      if (isSelected) {
        const res = await fetch(
          `/api/collections/${collectionId}/posts/${this._data.id}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error();
        this._postCollectionIds = this._postCollectionIds.filter(
          (id) => id !== collectionId,
        );
        this.#collectionsDirty = true;
        showToast("Removed from collection.");
      } else {
        const res = await fetch(`/api/collections/${collectionId}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: this._data.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (res.status === 409 || body?.error?.includes("already")) {
            if (!this._postCollectionIds.includes(collectionId)) {
              this._postCollectionIds = [
                ...this._postCollectionIds,
                collectionId,
              ];
            }
            return;
          }
          throw new Error();
        }
        this._postCollectionIds = [...this._postCollectionIds, collectionId];
        this.#collectionsDirty = true;
        showToast("Added to collection.");
      }
    } catch {
      showToast(
        isSelected
          ? "Could not remove from collection. Try again."
          : "Could not add to collection. Try again.",
        "error",
      );
    }
  }

  #openAddCollectionPanel() {
    this._addCollectionPanelOpen = true;
  }

  #closeAddCollectionPanel() {
    this._addCollectionPanelOpen = false;
  }

  async #handleAddCollectionSubmit(e: Event) {
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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created = await res.json();
      const newItem: CollectionItem = {
        id: created.id,
        title: created.title,
        slug: created.slug,
        icon: created.icon ?? null,
      };

      this._collections = [...(this._collections ?? []), newItem];

      // Auto-add the post to the newly created collection
      if (this._data) {
        await fetch(`/api/collections/${created.id}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: this._data.id }),
        });
        this._postCollectionIds = [...this._postCollectionIds, created.id];
      }

      this.#collectionsDirty = true;
      this._addCollectionPanelOpen = false;
      showToast("Collection created.");
    } catch {
      showToast("Could not create collection. Try again.", "error");
    } finally {
      if (formEl) formEl.loading = false;
    }
  }

  #submitAddCollectionForm() {
    const form = this.querySelector<HTMLFormElement>(
      ".post-menu-add-collection-panel form",
    );
    if (form) form.requestSubmit();
  }

  /** Get collection form labels from the compose dialog (already on the page) */
  #getCollectionFormLabels() {
    const composeEl = document.querySelector("jant-compose-dialog") as
      | import("./jant-compose-dialog.js").JantComposeDialog
      | null;
    return composeEl?.labels?.collectionFormLabels ?? null;
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

  // Lucide: globe (make public)
  #iconGlobe() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>`;
  }

  // Lucide: link-2-off (unlisted)
  #iconLinkOff() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 17H7A5 5 0 0 1 7 7" />
      <path d="M15 7h2a5 5 0 0 1 4 8" />
      <line x1="8" x2="12" y1="12" y2="12" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>`;
  }

  // Lucide: eye-off (private)
  #iconEyeOff() {
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
        d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"
      />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path
        d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"
      />
      <path d="m2 2 20 20" />
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

  // --- Render ---

  #renderCollectionPicker() {
    if (this._addCollectionPanelOpen) {
      return this.#renderAddCollectionPanel();
    }

    const collections = this._collections ?? [];
    const search = this._collectionSearch.toLowerCase();
    const filtered = search
      ? collections.filter((c) => c.title.toLowerCase().includes(search))
      : collections;

    return html`
      <div data-collection-picker class="post-menu-collection-picker">
        <div class="post-menu-picker-header">
          <span>Collections</span>
        </div>
        ${collections.length > 0
          ? html`<div class="post-menu-picker-search">
              <svg
                width="14"
                height="14"
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
                placeholder="Search collections..."
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                .value=${this._collectionSearch}
                @input=${(e: Event) => {
                  this._collectionSearch = (e.target as HTMLInputElement).value;
                }}
              />
            </div>`
          : nothing}
        <div
          class="post-menu-picker-list"
          role="listbox"
          aria-multiselectable="true"
        >
          ${this._collectionsLoading
            ? html`<div class="post-menu-picker-empty">Loading...</div>`
            : filtered.length > 0
              ? filtered.map((c) => {
                  const selected = this._postCollectionIds.includes(c.id);
                  const iconStr = renderIconHtml(c.icon);
                  return html`
                    <div
                      role="option"
                      aria-selected=${selected ? "true" : "false"}
                      class="post-menu-picker-option"
                      @click=${() => this.#toggleCollection(c.id)}
                    >
                      ${iconStr
                        ? html`<span class="post-menu-picker-icon"
                            >${unsafeHTML(iconStr)}</span
                          >`
                        : nothing}
                      <span class="post-menu-picker-title">${c.title}</span>
                      ${selected
                        ? html`<svg
                            class="post-menu-picker-check"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            width="14"
                            height="14"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>`
                        : nothing}
                    </div>
                  `;
                })
              : html`<div class="post-menu-picker-empty">
                  ${search ? "No matching collections" : "No collections yet"}
                </div>`}
        </div>
        <div
          class="post-menu-picker-add"
          @click=${() => this.#openAddCollectionPanel()}
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
          Add Collection
        </div>
      </div>
    `;
  }

  #renderAddCollectionPanel() {
    const labels = this.#getCollectionFormLabels();
    if (!labels) return nothing;

    const initial = {
      title: "",
      slug: "",
      description: "",
      sortOrder: "newest",
      icon: "",
    };

    return html`
      <div data-collection-picker class="post-menu-add-collection-panel">
        <div class="post-menu-picker-header">
          <button
            type="button"
            class="post-menu-panel-back"
            @click=${() => this.#closeAddCollectionPanel()}
          >
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
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span>Add Collection</span>
          <button
            type="button"
            class="post-menu-panel-done"
            @click=${() => this.#submitAddCollectionForm()}
          >
            Done
          </button>
        </div>
        <div class="post-menu-panel-body">
          <jant-collection-form
            class="post-menu-collection-form"
            .labels=${labels}
            .initial=${initial}
            action="/api/collections"
            cancel-href="javascript:void(0)"
            @jant:collection-submit=${(e: Event) =>
              this.#handleAddCollectionSubmit(e)}
          ></jant-collection-form>
        </div>
      </div>
    `;
  }

  #renderMenu() {
    if (!this._data) return nothing;
    const visibility = this._data.visibility;
    const isPinned = this._data.pinned;
    const isFeatured = this._data.featured;

    return html`
      <div role="menu">
        <div role="menuitem" @click=${() => this.#edit()}>
          ${this.#iconEdit()} Edit
        </div>

        <hr role="separator" />

        <div role="menuitem" @click=${() => this.#openCollectionPicker()}>
          ${this.#iconCollection()} Add to collection
        </div>
        ${isFeatured
          ? html`<div role="menuitem" @click=${() => this.#setFeatured(false)}>
              ${this.#iconHeartOff()} Unfeature
            </div>`
          : html`<div role="menuitem" @click=${() => this.#setFeatured(true)}>
              ${this.#iconHeart()} Feature
            </div>`}
        ${this._data.isReply
          ? nothing
          : html`
              ${visibility !== "public"
                ? html`<div
                    role="menuitem"
                    @click=${() => this.#setVisibility("public")}
                  >
                    ${this.#iconGlobe()} Make Public
                  </div>`
                : nothing}
              ${visibility !== "unlisted"
                ? html`<div
                    role="menuitem"
                    @click=${() => this.#setVisibility("unlisted")}
                  >
                    ${this.#iconLinkOff()} Make Unlisted
                  </div>`
                : nothing}
              ${visibility !== "private"
                ? html`<div
                    role="menuitem"
                    @click=${() => this.#setVisibility("private")}
                  >
                    ${this.#iconEyeOff()} Make Private
                  </div>`
                : nothing}
            `}
        ${this._data.isReply
          ? nothing
          : html`<div role="menuitem" @click=${() => this.#togglePin()}>
              ${isPinned ? this.#iconPinOff() : this.#iconPin()}
              ${isPinned ? "Unpin" : "Pin this post"}
            </div>`}

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
    `;
  }

  render() {
    if (!this._open || !this._data) return nothing;

    const wrapperStyle = `position:fixed;z-index:100;right:${document.documentElement.clientWidth - this._x}px;${
      this._openAbove
        ? `bottom:${window.innerHeight - this._y + 6}px;`
        : `top:${this._y + 6}px;`
    }`;

    return html`
      <div class="post-menu-backdrop" @click=${() => this.#close()}></div>
      <div class="dropdown-menu" style=${wrapperStyle}>
        <div data-popover aria-hidden="false" class="!static min-w-52">
          ${this._collectionPickerOpen
            ? this.#renderCollectionPicker()
            : this.#renderMenu()}
        </div>
      </div>
    `;
  }
}

customElements.define("jant-post-menu", JantPostMenu);
