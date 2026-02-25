/**
 * Collection Sidebar Component
 *
 * Manages collections in the public /c page sidebar for authenticated users:
 * - Renders collections + dividers as an interleaved sorted list
 * - Dropdown menus for "More" (reorder, add divider) and per-collection edit
 * - SortableJS drag-and-drop reorder mode
 * - Create/edit collection dialogs embedding <jant-collection-form>
 * - Divider CRUD
 *
 * Anonymous users see a static list rendered server-side; this component
 * is only instantiated for authenticated users.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import Sortable from "sortablejs";
import { showToast } from "../toast.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import type { CollectionSubmitDetail } from "./collection-types.js";
import type {
  CollectionSidebarLabels,
  SidebarCollection,
  SidebarDivider,
  SidebarItem,
} from "./collection-sidebar-types.js";

function interleaveItems(
  collections: SidebarCollection[],
  dividers: SidebarDivider[],
): SidebarItem[] {
  const items: SidebarItem[] = [
    ...collections.map((c) => ({ kind: "collection", data: c }) as SidebarItem),
    ...dividers.map((d) => ({ kind: "divider", data: d }) as SidebarItem),
  ];
  items.sort((a, b) => a.data.position - b.data.position);
  return items;
}

export class JantCollectionSidebar extends LitElement {
  static properties = {
    collections: { type: Array },
    dividers: { type: Array },
    labels: { type: Object },
    activeSlug: { type: String, attribute: "active-slug" },

    _items: { state: true },
    _reorderMode: { state: true },
    _dialogMode: { state: true },
    _editingCollection: { state: true },
    _showMoreMenu: { state: true },
    _hoveringId: { state: true },
    _showItemMenuId: { state: true },
  };

  declare collections: SidebarCollection[];
  declare dividers: SidebarDivider[];
  declare labels: CollectionSidebarLabels;
  declare activeSlug: string;

  declare _items: SidebarItem[];
  declare _reorderMode: boolean;
  declare _dialogMode: "create" | "edit" | null;
  declare _editingCollection: SidebarCollection | null;
  declare _showMoreMenu: boolean;
  declare _hoveringId: number | null;
  declare _showItemMenuId: number | null;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;

  #closeMoreMenu = () => {
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
  };

  #closeItemMenu = () => {
    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);
  };

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.collections = [];
    this.dividers = [];
    this.labels = {} as CollectionSidebarLabels;
    this.activeSlug = "";

    this._items = [];
    this._reorderMode = false;
    this._dialogMode = null;
    this._editingCollection = null;
    this._showMoreMenu = false;
    this._hoveringId = null;
    this._showItemMenuId = null;
  }

  protected update(
    changedProperties: PropertyValueMap<JantCollectionSidebar>,
  ): void {
    if (
      !this.#initialized ||
      changedProperties.has("collections") ||
      changedProperties.has("dividers")
    ) {
      this._items = interleaveItems(
        this.collections ?? [],
        this.dividers ?? [],
      );
      this.#initialized = true;
    }
    super.update(changedProperties);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#sortable?.destroy();
    this.#sortable = null;
    document.removeEventListener("click", this.#closeMoreMenu);
    document.removeEventListener("click", this.#closeItemMenu);
  }

  // ===========================================================================
  // Data fetching
  // ===========================================================================

  async #refreshList() {
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) return;
      const json = await res.json();
      this.collections = json.collections;
      this.dividers = json.dividers;
      // update triggers via the `update` lifecycle
    } catch {
      // silent — stale list is acceptable
    }
  }

  // ===========================================================================
  // SortableJS
  // ===========================================================================

  #initSortable() {
    const list = this.querySelector<HTMLElement>("#sidebar-collections-list");
    if (!list || this.#sortable) return;

    this.#sortable = Sortable.create(list, {
      animation: 150,
      handle: "[data-drag-handle]",
      onEnd: (evt) => {
        // Read new order from DOM BEFORE reverting
        const els = [
          ...list.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
        ];
        const items = els
          .map((el) => el.dataset.sidebarItem)
          .filter((id): id is string => id !== undefined);

        // Revert SortableJS DOM manipulation so Lit can re-render cleanly
        const { item, oldIndex, newIndex } = evt;
        if (oldIndex != null && newIndex != null && oldIndex !== newIndex) {
          item.parentNode?.removeChild(item);
          const children = list.children;
          if (oldIndex >= children.length) {
            list.appendChild(item);
          } else {
            list.insertBefore(item, children[oldIndex]);
          }
        }

        // Destroy sortable so it doesn't fight Lit's re-render
        this.#sortable?.destroy();
        this.#sortable = null;

        // Update internal state — rebuild items in new order
        const collectionMap = new Map(
          (this.collections ?? []).map((c) => [`c-${c.id}`, c]),
        );
        const dividerMap = new Map(
          (this.dividers ?? []).map((d) => [`d-${d.id}`, d]),
        );

        const newItems: SidebarItem[] = [];
        for (const prefixed of items) {
          if (prefixed.startsWith("c-")) {
            const col = collectionMap.get(prefixed);
            if (col) newItems.push({ kind: "collection", data: col });
          } else if (prefixed.startsWith("d-")) {
            const div = dividerMap.get(prefixed);
            if (div) newItems.push({ kind: "divider", data: div });
          }
        }
        this._items = newItems;

        // Persist to server
        fetch("/api/collections/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }).then((res) => {
          if (res.ok) showToast(this.labels.orderSaved);
          else showToast(this.labels.saveFailed, "error");
        });
      },
    });
  }

  #enterReorderMode() {
    this._reorderMode = true;
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
    // SortableJS will be initialized after Lit re-renders (in updated())
  }

  #exitReorderMode() {
    this._reorderMode = false;
    this.#sortable?.destroy();
    this.#sortable = null;
  }

  protected updated(): void {
    if (this._reorderMode) {
      this.#initSortable();
    }
  }

  // ===========================================================================
  // Divider handlers
  // ===========================================================================

  async #addDivider() {
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
    try {
      const res = await fetch("/api/collections/dividers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.#refreshList();
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  async #deleteDivider(id: number) {
    try {
      const res = await fetch(`/api/collections/dividers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Remove locally for instant feedback
      this._items = this._items.filter(
        (item) => !(item.kind === "divider" && item.data.id === id),
      );
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  // ===========================================================================
  // Collection CRUD handlers
  // ===========================================================================

  #openCreateDialog() {
    this._dialogMode = "create";
    this._editingCollection = null;
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
    // Wait for render, then show the dialog
    this.updateComplete.then(() => {
      this.querySelector<HTMLDialogElement>(
        "#sidebar-collection-dialog",
      )?.showModal();
    });
  }

  #openEditDialog(col: SidebarCollection) {
    this._dialogMode = "edit";
    this._editingCollection = col;
    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);
    this.updateComplete.then(() => {
      this.querySelector<HTMLDialogElement>(
        "#sidebar-collection-dialog",
      )?.showModal();
    });
  }

  #closeDialog() {
    this.querySelector<HTMLDialogElement>(
      "#sidebar-collection-dialog",
    )?.close();
    this._dialogMode = null;
    this._editingCollection = null;
  }

  async #handleCollectionSubmit(e: Event) {
    const event = e as CustomEvent<CollectionSubmitDetail>;
    event.stopPropagation(); // prevent global bridge from handling

    const detail = event.detail;
    if (!detail) return;

    const formEl = this.querySelector("jant-collection-form") as
      | (HTMLElement & {
          loading: boolean;
        })
      | null;
    if (formEl) formEl.loading = true;

    try {
      const isEdit = detail.isEdit;
      const url = isEdit
        ? `/api/collections/${this._editingCollection?.id}`
        : "/api/collections";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detail.data),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast(this.labels.saved);
      this.#closeDialog();
      await this.#refreshList();
    } catch {
      showToast(this.labels.saveFailed, "error");
    } finally {
      if (formEl) formEl.loading = false;
    }
  }

  async #deleteCollection(col: SidebarCollection) {
    if (!window.confirm(this.labels.confirmDelete)) return;

    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);

    try {
      const res = await fetch(`/api/collections/${col.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast(this.labels.deleted);
      await this.#refreshList();
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  // ===========================================================================
  // Render
  // ===========================================================================

  #renderHeading() {
    return html`
      <div class="flex items-center justify-between px-3 pb-2">
        <h2
          class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          ${this.labels.collections}
        </h2>
        <div class="flex items-center gap-1">
          ${this._reorderMode
            ? html`
                <button
                  type="button"
                  class="text-xs font-medium text-primary hover:underline"
                  @click=${() => this.#exitReorderMode()}
                >
                  ${this.labels.done}
                </button>
              `
            : html` ${this.#renderMoreButton()} ${this.#renderAddButton()} `}
        </div>
      </div>
    `;
  }

  #renderMoreButton() {
    return html`
      <div class="relative">
        <button
          type="button"
          class="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label=${this.labels.moreActions}
          @click=${(e: Event) => {
            e.stopPropagation();
            this._showMoreMenu = !this._showMoreMenu;
            if (this._showMoreMenu) {
              setTimeout(() => {
                document.addEventListener("click", this.#closeMoreMenu);
              });
            } else {
              document.removeEventListener("click", this.#closeMoreMenu);
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
        ${this._showMoreMenu
          ? html`
              <div
                class="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  @click=${() => this.#enterReorderMode()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 16 4 4 4-4" />
                    <path d="M7 20V4" />
                    <path d="m21 8-4-4-4 4" />
                    <path d="M17 4v16" />
                  </svg>
                  ${this.labels.reorder}
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  @click=${() => this.#addDivider()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 12h18" />
                  </svg>
                  ${this.labels.addDivider}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #renderAddButton() {
    return html`
      <button
        type="button"
        class="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title=${this.labels.newCollection}
        aria-label=${this.labels.newCollection}
        @click=${() => this.#openCreateDialog()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
    `;
  }

  #renderCollectionItem(col: SidebarCollection) {
    const isActive = col.slug === this.activeSlug;

    if (this._reorderMode) {
      return html`
        <div
          data-sidebar-item="c-${col.id}"
          class="flex items-center gap-2 px-3 py-2 text-sm rounded-md"
        >
          <div class="cursor-grab text-muted-foreground" data-drag-handle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </div>
          <span class="flex items-center justify-center w-4 h-4 shrink-0">
            ${unsafeHTML(
              renderCollectionIcon(col.icon, { size: 16, fallback: true }),
            )}
          </span>
          <span class="truncate">${col.title}</span>
        </div>
      `;
    }

    return html`
      <div
        data-sidebar-item="c-${col.id}"
        class=${classMap({
          "group relative": true,
          "z-50": this._showItemMenuId === col.id,
        })}
        @mouseenter=${() => {
          this._hoveringId = col.id;
        }}
        @mouseleave=${() => {
          if (this._hoveringId === col.id) this._hoveringId = null;
        }}
      >
        <a
          href=${`/c/${col.slug}`}
          class=${classMap({
            "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md truncate": true,
            "bg-accent text-accent-foreground font-medium": isActive,
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground":
              !isActive,
          })}
        >
          <span class="flex items-center justify-center w-4 h-4 shrink-0">
            ${unsafeHTML(
              renderCollectionIcon(col.icon, { size: 16, fallback: true }),
            )}
          </span>
          <span class="truncate">${col.title}</span>
        </a>
        ${this._hoveringId === col.id || this._showItemMenuId === col.id
          ? this.#renderItemMenu(col)
          : nothing}
      </div>
    `;
  }

  #renderItemMenu(col: SidebarCollection) {
    const isOpen = this._showItemMenuId === col.id;

    return html`
      <div class="absolute right-1 top-1/2 -translate-y-1/2">
        <button
          type="button"
          class="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          @click=${(e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
              this._showItemMenuId = null;
              document.removeEventListener("click", this.#closeItemMenu);
            } else {
              this._showItemMenuId = col.id;
              setTimeout(() => {
                document.addEventListener("click", this.#closeItemMenu);
              });
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
        ${isOpen
          ? html`
              <div
                class="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  @click=${() => this.#openEditDialog(col)}
                >
                  ${this.labels.edit}
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                  @click=${() => this.#deleteCollection(col)}
                >
                  ${this.labels.deleteCollection}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #renderDividerItem(div: SidebarDivider) {
    if (this._reorderMode) {
      return html`
        <div
          data-sidebar-item="d-${div.id}"
          class="flex items-center gap-2 px-3 py-1"
        >
          <div class="cursor-grab text-muted-foreground" data-drag-handle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </div>
          <hr class="flex-1 border-border" />
          <button
            type="button"
            class="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:text-destructive"
            title=${this.labels.deleteDivider}
            @click=${() => this.#deleteDivider(div.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
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
        </div>
      `;
    }

    return html`
      <div data-sidebar-item="d-${div.id}" class="px-3 py-1">
        <hr class="border-border" />
      </div>
    `;
  }

  #renderDialog() {
    if (!this._dialogMode) return nothing;

    const isEdit = this._dialogMode === "edit";
    const col = this._editingCollection;

    const formLabels = this.labels.formLabels;
    const initial =
      isEdit && col
        ? {
            title: col.title,
            slug: col.slug,
            description: col.description ?? "",
            sortOrder: col.sortOrder ?? "newest",
            icon: col.icon ?? "",
          }
        : {
            title: "",
            slug: "",
            description: "",
            sortOrder: "newest",
            icon: "",
          };

    const dialogLabels = {
      ...formLabels,
      submitLabel: isEdit ? formLabels.submitLabel : formLabels.submitLabel,
    };

    return html`
      <dialog
        id="sidebar-collection-dialog"
        class="m-auto rounded-lg border border-border bg-background text-foreground p-6 w-full max-w-md shadow-lg backdrop:bg-black/50"
        @cancel=${() => this.#closeDialog()}
        @close=${() => {
          this._dialogMode = null;
          this._editingCollection = null;
        }}
        @click=${(e: Event) => {
          // Backdrop click — target is the <dialog> itself when clicking outside the box
          if (e.target === e.currentTarget) {
            this.#closeDialog();
          }
        }}
      >
        <jant-collection-form
          .labels=${dialogLabels}
          .initial=${initial}
          action=${isEdit && col
            ? `/api/collections/${col.id}`
            : "/api/collections"}
          cancel-href="javascript:void(0)"
          ?is-edit=${isEdit}
          @jant:collection-submit=${(e: Event) =>
            this.#handleCollectionSubmit(e)}
          @click=${(e: Event) => {
            // Intercept cancel link click
            const target = (e.target as HTMLElement).closest?.("a.btn-outline");
            if (target) {
              e.preventDefault();
              this.#closeDialog();
            }
          }}
        ></jant-collection-form>
      </dialog>
    `;
  }

  render() {
    return html`
      <nav class="flex flex-col gap-1 pt-6">
        ${this.#renderHeading()}

        <div id="sidebar-collections-list" class="flex flex-col">
          ${this._items.map((item) =>
            item.kind === "collection"
              ? this.#renderCollectionItem(item.data as SidebarCollection)
              : this.#renderDividerItem(item.data as SidebarDivider),
          )}
        </div>

        ${this.#renderDialog()}
      </nav>
    `;
  }
}

customElements.define("jant-collection-sidebar", JantCollectionSidebar);
