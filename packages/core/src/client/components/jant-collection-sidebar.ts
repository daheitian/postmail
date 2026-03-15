/**
 * Collections Page Manager
 *
 * Manages collections on the public /c page for authenticated users:
 * - Renders collection rows and dividers in a single-column layout
 * - Dropdown menu for page actions (organize, new divider)
 * - SortableJS drag-and-drop organize mode
 * - Create/edit collection dialogs embedding <jant-collection-form>
 * - Divider CRUD
 *
 * Light DOM only so site styles apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import Sortable from "sortablejs";
import { showToast } from "../toast.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { formatDate, toISOString } from "../../lib/time.js";
import type { CollectionSubmitDetail } from "./collection-types.js";
import type {
  CollectionManagerItem,
  CollectionManagerLabels,
  ManagedCollection,
} from "./collection-manager-types.js";

export class JantCollectionsManager extends LitElement {
  static properties = {
    items: { type: Array },
    labels: { type: Object },

    _items: { state: true },
    _reorderMode: { state: true },
    _dialogMode: { state: true },
    _editingCollection: { state: true },
    _showMoreMenu: { state: true },
    _hoveringId: { state: true },
    _showItemMenuId: { state: true },
  };

  declare items: CollectionManagerItem[];
  declare labels: CollectionManagerLabels;

  declare _items: CollectionManagerItem[];
  declare _reorderMode: boolean;
  declare _dialogMode: "create" | "edit" | null;
  declare _editingCollection: ManagedCollection | null;
  declare _showMoreMenu: boolean;
  declare _hoveringId: string | null;
  declare _showItemMenuId: string | null;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;
  #revertNextSibling: Node | null = null;

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
    this.items = [];
    this.labels = {} as CollectionManagerLabels;

    this._items = [];
    this._reorderMode = false;
    this._dialogMode = null;
    this._editingCollection = null;
    this._showMoreMenu = false;
    this._hoveringId = null;
    this._showItemMenuId = null;
  }

  protected update(
    changedProperties: PropertyValueMap<JantCollectionsManager>,
  ): void {
    if (!this.#initialized || changedProperties.has("items")) {
      this._items = [...(this.items ?? [])];
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

  #hasCollections() {
    return this._items.some(
      (item) => item.type === "collection" && item.collection,
    );
  }

  #countLabel(count: number) {
    return `${count} ${
      count === 1 ? this.labels.entrySingular : this.labels.entryPlural
    }`;
  }

  #formatUpdatedLabel(timestamp: number) {
    return `${this.labels.updatedLabel} ${formatDate(timestamp)}`;
  }

  #toItems(json: {
    collections?: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      icon: string | null;
      sortOrder: string;
      postCount: number;
      recentActivityAt: number;
    }>;
    sidebarItems?: Array<{
      id: string;
      type: "collection" | "divider";
      collectionId: string | null;
      label: string | null;
      position: string;
    }>;
  }): CollectionManagerItem[] {
    const collections = json.collections ?? [];
    const sidebarItems = json.sidebarItems ?? [];
    const collectionMap = new Map<string, ManagedCollection>();

    for (const collection of collections) {
      collectionMap.set(collection.id, {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        icon: collection.icon,
        sortOrder: collection.sortOrder,
        postCount: collection.postCount ?? 0,
        recentActivityAt: collection.recentActivityAt,
      });
    }

    const seenCollections = new Set<string>();
    const orderedItems: CollectionManagerItem[] = [];

    for (const item of sidebarItems) {
      const collection =
        item.collectionId != null
          ? collectionMap.get(item.collectionId)
          : undefined;

      if (item.type === "collection" && !collection) {
        continue;
      }

      if (collection) {
        seenCollections.add(collection.id);
      }

      orderedItems.push({
        id: item.id,
        type: item.type,
        collectionId: item.collectionId,
        label: item.label,
        position: item.position,
        collection,
      });
    }

    for (const collection of collections) {
      if (seenCollections.has(collection.id)) continue;
      orderedItems.push({
        id: `collection-${collection.id}`,
        type: "collection",
        collectionId: collection.id,
        position: "",
        collection: collectionMap.get(collection.id),
      });
    }

    return orderedItems;
  }

  async #refreshList() {
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) return;
      const json = await res.json();
      this._items = this.#toItems(json);
    } catch {
      // stale UI is acceptable
    }
  }

  #initSortable() {
    const list = this.querySelector<HTMLElement>("#collections-manager-list");
    if (!list || this.#sortable) return;

    this.#sortable = Sortable.create(list, {
      animation: 150,
      handle: "[data-drag-handle]",
      onStart: (evt) => {
        this.#revertNextSibling = evt.item.nextSibling;
      },
      onEnd: (evt) => {
        const els = [
          ...list.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
        ];
        const orderedIds = els
          .map((el) => el.dataset.sidebarItem)
          .filter((id): id is string => id !== undefined);

        const { item, oldIndex, newIndex } = evt;
        if (oldIndex != null && newIndex != null && oldIndex !== newIndex) {
          item.parentNode?.removeChild(item);
          if (this.#revertNextSibling) {
            list.insertBefore(item, this.#revertNextSibling);
          } else {
            list.appendChild(item);
          }
        }
        this.#revertNextSibling = null;

        this.#sortable?.destroy();
        this.#sortable = null;

        const movedId = newIndex != null ? orderedIds[newIndex] : undefined;
        if (!movedId) return;

        const movedIdx = orderedIds.indexOf(movedId);
        const afterId = movedIdx > 0 ? orderedIds[movedIdx - 1] : null;
        const beforeId =
          movedIdx < orderedIds.length - 1 ? orderedIds[movedIdx + 1] : null;

        const itemMap = new Map(this._items.map((entry) => [entry.id, entry]));
        this._items = orderedIds
          .map((id) => itemMap.get(id))
          .filter(
            (entry): entry is CollectionManagerItem => entry !== undefined,
          );

        fetch(`/api/collections/sidebar-items/${movedId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            after: afterId ?? null,
            before: beforeId ?? null,
          }),
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

  async #addDivider() {
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
    try {
      const res = await fetch("/api/collections/sidebar-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.#refreshList();
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  async #deleteDivider(id: string) {
    try {
      const res = await fetch(`/api/collections/sidebar-items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._items = this._items.filter((item) => item.id !== id);
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  async #saveDividerLabel(id: string, label: string) {
    const normalized = label.trim();
    const current = this._items.find((item) => item.id === id)?.label ?? "";
    if (normalized === current) return;

    try {
      const res = await fetch(`/api/collections/sidebar-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: normalized || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      this._items = this._items.map((item) =>
        item.id === id ? { ...item, label: updated.label ?? null } : item,
      );
    } catch {
      showToast(this.labels.saveFailed, "error");
      await this.#refreshList();
    }
  }

  #openCreateDialog() {
    this._dialogMode = "create";
    this._editingCollection = null;
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
    this.updateComplete.then(() => {
      this.querySelector<HTMLDialogElement>(
        "#collections-manager-dialog",
      )?.showModal();
    });
  }

  #openEditDialog(collection: ManagedCollection) {
    this._dialogMode = "edit";
    this._editingCollection = collection;
    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);
    this.updateComplete.then(() => {
      this.querySelector<HTMLDialogElement>(
        "#collections-manager-dialog",
      )?.showModal();
    });
  }

  #closeDialog() {
    this.querySelector<HTMLDialogElement>(
      "#collections-manager-dialog",
    )?.close();
    this._dialogMode = null;
    this._editingCollection = null;
  }

  async #handleCollectionSubmit(e: Event) {
    const event = e as CustomEvent<CollectionSubmitDetail>;
    event.stopPropagation();

    const detail = event.detail;
    if (!detail) return;

    const formEl = this.querySelector("jant-collection-form") as
      | (HTMLElement & { loading: boolean })
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

  async #deleteCollection(collection: ManagedCollection) {
    if (!window.confirm(this.labels.confirmDelete)) return;

    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);

    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast(this.labels.deleted);
      await this.#refreshList();
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  #renderPageHeader() {
    return html`
      <header class="collections-page-header">
        <div class="collections-page-heading">
          <h1 class="text-2xl font-semibold">
            ${this.labels.collectionsTitle}
          </h1>
          <p class="collections-page-description">
            ${this.labels.pageDescription}
          </p>
          ${this._reorderMode
            ? html`
                <p class="collections-page-hint text-sm text-muted-foreground">
                  ${this.labels.organizeHint}
                </p>
              `
            : nothing}
        </div>
        <div class="collections-page-actions">
          ${this._reorderMode
            ? html`
                <button
                  type="button"
                  class="btn-outline"
                  @click=${() => this.#exitReorderMode()}
                >
                  ${this.labels.done}
                </button>
              `
            : html`
                <button
                  type="button"
                  class="btn"
                  @click=${() => this.#openCreateDialog()}
                >
                  ${this.labels.newCollection}
                </button>
                ${this.#renderPageMoreMenu()}
              `}
        </div>
      </header>
    `;
  }

  #renderPageMoreMenu() {
    return html`
      <div class="relative">
        <button
          type="button"
          class="btn-outline collections-page-more-btn"
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
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        ${this._showMoreMenu
          ? html`
              <div
                class="collections-page-menu"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <button
                  type="button"
                  class="collections-page-menu-item"
                  @click=${() => this.#enterReorderMode()}
                >
                  ${this.labels.organize}
                </button>
                <button
                  type="button"
                  class="collections-page-menu-item"
                  @click=${() => this.#addDivider()}
                >
                  ${this.labels.newDivider}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #renderCollectionItem(item: CollectionManagerItem) {
    const collection = item.collection;
    if (!collection) return nothing;

    const body = html`
      <span class="collection-directory-icon">
        ${unsafeHTML(
          renderCollectionIcon(collection.icon, {
            size: 20,
            fallback: true,
          }),
        )}
      </span>
      <div class="collection-directory-copy">
        <div class="collection-directory-title-row">
          <span class="collection-directory-title">${collection.title}</span>
          <time
            class="collection-directory-updated"
            datetime=${toISOString(collection.recentActivityAt)}
          >
            ${this.#formatUpdatedLabel(collection.recentActivityAt)}
          </time>
        </div>
        ${collection.description
          ? html`
              <p class="collection-directory-description">
                ${collection.description}
              </p>
            `
          : nothing}
        <p class="collection-directory-meta">
          ${this.#countLabel(collection.postCount)}
        </p>
      </div>
    `;

    if (this._reorderMode) {
      return html`
        <div
          data-sidebar-item=${item.id}
          class="collection-directory-item collection-directory-item-reorder"
        >
          <div class="collection-directory-handle" data-drag-handle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
          ${body}
        </div>
      `;
    }

    return html`
      <div
        class=${classMap({
          "group relative": true,
          "z-50": this._showItemMenuId === item.id,
        })}
        @mouseenter=${() => {
          this._hoveringId = item.id;
        }}
        @mouseleave=${() => {
          if (this._hoveringId === item.id) this._hoveringId = null;
        }}
      >
        <a
          href=${`/c/${collection.slug}`}
          class="collection-directory-item collection-directory-item-manageable"
        >
          ${body}
        </a>
        ${this._hoveringId === item.id || this._showItemMenuId === item.id
          ? this.#renderItemMenu(item)
          : nothing}
      </div>
    `;
  }

  #renderItemMenu(item: CollectionManagerItem) {
    const collection = item.collection;
    if (!collection) return nothing;

    const isOpen = this._showItemMenuId === item.id;

    return html`
      <div class="collection-directory-item-menu">
        <button
          type="button"
          class="collections-page-icon-button"
          aria-label=${this.labels.moreActions}
          @click=${(e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (isOpen) {
              this._showItemMenuId = null;
              document.removeEventListener("click", this.#closeItemMenu);
            } else {
              this._showItemMenuId = item.id;
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
            fill="currentColor"
          >
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
        ${isOpen
          ? html`
              <div
                class="collections-page-menu"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <button
                  type="button"
                  class="collections-page-menu-item"
                  @click=${() => this.#openEditDialog(collection)}
                >
                  ${this.labels.edit}
                </button>
                <button
                  type="button"
                  class="collections-page-menu-item collections-page-menu-item-danger"
                  @click=${() => this.#deleteCollection(collection)}
                >
                  ${this.labels.deleteCollection}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #renderDividerItem(item: CollectionManagerItem) {
    if (this._reorderMode) {
      return html`
        <div
          data-sidebar-item=${item.id}
          class="collection-directory-divider-row"
        >
          <div class="collection-directory-handle" data-drag-handle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
          <div class="collection-directory-divider-body">
            <input
              type="text"
              class="collection-directory-divider-input"
              placeholder=${this.labels.dividerLabelPlaceholder}
              .value=${item.label ?? ""}
              aria-label=${this.labels.dividerLabelPlaceholder}
              @blur=${(e: Event) =>
                this.#saveDividerLabel(
                  item.id,
                  (e.currentTarget as HTMLInputElement).value,
                )}
              @keydown=${(e: globalThis.KeyboardEvent) => {
                const target = e.currentTarget as HTMLInputElement;
                if (e.key === "Enter") {
                  e.preventDefault();
                  target.blur();
                }
                if (e.key === "Escape") {
                  target.value = item.label ?? "";
                  target.blur();
                }
              }}
            />
            <hr class="collection-directory-divider-line" />
          </div>
          <button
            type="button"
            class="collections-page-icon-button"
            title=${this.labels.deleteDivider}
            aria-label=${this.labels.deleteDivider}
            @click=${() => this.#deleteDivider(item.id)}
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

    const hasLabel = !!item.label;
    return html`
      <div class="collection-directory-divider">
        <div
          class="collection-directory-divider-row"
          aria-hidden=${hasLabel ? nothing : "true"}
        >
          ${hasLabel
            ? html`
                <span class="collection-directory-divider-text">
                  ${item.label}
                </span>
                <hr class="collection-directory-divider-line" />
              `
            : html`<hr class="collection-directory-divider-line" />`}
        </div>
      </div>
    `;
  }

  #renderDialog() {
    if (!this._dialogMode) return nothing;

    const isEdit = this._dialogMode === "edit";
    const collection = this._editingCollection;
    const formLabels = this.labels.formLabels;
    const initial =
      isEdit && collection
        ? {
            title: collection.title,
            slug: collection.slug,
            description: collection.description ?? "",
            sortOrder: collection.sortOrder ?? "newest",
            icon: collection.icon ?? "",
          }
        : {
            title: "",
            slug: "",
            description: "",
            sortOrder: "newest",
            icon: "",
          };

    return html`
      <dialog
        id="collections-manager-dialog"
        class="m-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/50 w-full max-w-md"
        @cancel=${() => this.#closeDialog()}
        @close=${() => {
          this._dialogMode = null;
          this._editingCollection = null;
        }}
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) {
            this.#closeDialog();
          }
        }}
      >
        <jant-collection-form
          .labels=${formLabels}
          .initial=${initial}
          action=${isEdit && collection
            ? `/api/collections/${collection.id}`
            : "/api/collections"}
          cancel-href="javascript:void(0)"
          ?is-edit=${isEdit}
          @jant:collection-submit=${(e: Event) =>
            this.#handleCollectionSubmit(e)}
          @click=${(e: Event) => {
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
      <div class="collections-page-shell">
        ${this.#renderPageHeader()}
        ${this.#hasCollections()
          ? html`
              <div id="collections-manager-list" class="collection-directory">
                ${this._items.map((item) =>
                  item.type === "collection"
                    ? this.#renderCollectionItem(item)
                    : this.#renderDividerItem(item),
                )}
              </div>
            `
          : html`<p class="text-muted-foreground">
              ${this.labels.emptyState}
            </p>`}
        ${this.#renderDialog()}
      </div>
    `;
  }
}

customElements.define("jant-collections-manager", JantCollectionsManager);
