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
import {
  captureSortableRevertNextSibling,
  getSortableMove,
  readSortableDataIds,
  responsiveSortableOptions,
  revertSortableDomMove,
  setSortableDraggingState,
} from "../sortable-list.js";
import { showConfirmDialog } from "../confirm.js";
import { publicPath } from "../runtime-paths.js";
import { showToast } from "../toast.js";
import { renderCollectionIcon } from "../../lib/icons.js";
import { formatRelativeAge, toISOString } from "../../lib/time.js";
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
    _editingDividerId: { state: true },
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
  declare _editingDividerId: string | null;
  declare _showMoreMenu: boolean;
  declare _hoveringId: string | null;
  declare _showItemMenuId: string | null;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;
  #revertNextSibling: Node | null = null;
  #managerRoot: HTMLElement | null = null;

  #closeMoreMenu = () => {
    this._showMoreMenu = false;
    document.removeEventListener("click", this.#closeMoreMenu);
  };

  #closeItemMenu = () => {
    this._showItemMenuId = null;
    document.removeEventListener("click", this.#closeItemMenu);
  };

  #handleHeaderClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest("[data-collections-more-menu]")) {
      event.stopPropagation();
    }

    const actionEl = target.closest<HTMLElement>("[data-collections-action]");
    if (!actionEl || !this.#managerRoot?.contains(actionEl)) return;

    const action = actionEl.dataset.collectionsAction;
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();

    if (action !== "toggle-menu" && this._showMoreMenu) {
      this._showMoreMenu = false;
      document.removeEventListener("click", this.#closeMoreMenu);
    }

    switch (action) {
      case "create":
        this.#openCreateDialog();
        break;
      case "done":
        this.#exitReorderMode();
        break;
      case "toggle-menu":
        this._showMoreMenu = !this._showMoreMenu;
        if (this._showMoreMenu) {
          setTimeout(() => {
            document.addEventListener("click", this.#closeMoreMenu);
          });
        } else {
          document.removeEventListener("click", this.#closeMoreMenu);
        }
        break;
      case "organize":
        this.#enterReorderMode();
        break;
      case "divider":
        void this.#addDivider();
        break;
      default:
        break;
    }
  };

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#bindManagerRoot();
  }

  constructor() {
    super();
    this.items = [];
    this.labels = {} as CollectionManagerLabels;

    this._items = [];
    this._reorderMode = false;
    this._dialogMode = null;
    this._editingCollection = null;
    this._editingDividerId = null;
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
    this.#managerRoot?.removeEventListener("click", this.#handleHeaderClick);
    this.#managerRoot = null;
    document.removeEventListener("click", this.#closeMoreMenu);
    document.removeEventListener("click", this.#closeItemMenu);
  }

  #hasCollections() {
    return this._items.some(
      (item) => item.type === "collection" && item.collection,
    );
  }

  #collectionCount() {
    return this._items.filter(
      (item) => item.type === "collection" && item.collection,
    ).length;
  }

  #collectionCountLabel() {
    const count = this.#collectionCount();
    return `${count} ${
      count === 1
        ? this.labels.collectionSingular
        : this.labels.collectionPlural
    }`;
  }

  #countLabel(count: number) {
    return `${count} ${
      count === 1 ? this.labels.entrySingular : this.labels.entryPlural
    }`;
  }

  #bindManagerRoot() {
    const root = this.closest<HTMLElement>("[data-collections-manager-root]");
    if (root === this.#managerRoot) return;

    this.#managerRoot?.removeEventListener("click", this.#handleHeaderClick);
    this.#managerRoot = root;
    this.#managerRoot?.addEventListener("click", this.#handleHeaderClick);
  }

  #queryHeaderElement<T extends HTMLElement>(selector: string) {
    return this.#managerRoot?.querySelector<T>(selector) ?? null;
  }

  #syncHeaderState() {
    const countEl = this.#queryHeaderElement<HTMLElement>(
      "[data-collections-count]",
    );
    if (countEl) {
      countEl.textContent = this.#collectionCountLabel();
      countEl.hidden = false;
    }

    const doneButton = this.#queryHeaderElement<HTMLButtonElement>(
      '[data-collections-action="done"]',
    );
    if (doneButton) {
      doneButton.hidden = !this._reorderMode;
    }

    const reorderActions = this.#queryHeaderElement<HTMLElement>(
      "[data-collections-reorder-actions]",
    );
    if (reorderActions) {
      reorderActions.hidden = !this._reorderMode;
    }

    const toolbar = this.#queryHeaderElement<HTMLElement>(
      "[data-collections-toolbar]",
    );
    if (toolbar) {
      toolbar.hidden = this._reorderMode;
    }

    const hint = this.#queryHeaderElement<HTMLElement>(
      "[data-collections-hint]",
    );
    if (hint) {
      hint.hidden = !this._reorderMode;
    }

    const menu = this.#queryHeaderElement<HTMLElement>(
      "[data-collections-more-menu]",
    );
    if (menu) {
      menu.hidden = !this._showMoreMenu || this._reorderMode;
    }

    const toggleButton = this.#queryHeaderElement<HTMLButtonElement>(
      '[data-collections-action="toggle-menu"]',
    );
    if (toggleButton) {
      toggleButton.setAttribute(
        "aria-expanded",
        String(this._showMoreMenu && !this._reorderMode),
      );
    }
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
      ...responsiveSortableOptions,
      chosenClass: "collection-directory-chosen",
      dragClass: "collection-directory-drag",
      ghostClass: "collection-directory-ghost",
      handle: "[data-drag-handle]",
      scroll: true,
      onChoose: () => {
        setSortableDraggingState(list, true);
      },
      onStart: (evt) => {
        this.#revertNextSibling = captureSortableRevertNextSibling(evt);
      },
      onUnchoose: () => {
        setSortableDraggingState(list, false);
      },
      onEnd: (evt) => {
        const orderedIds = readSortableDataIds(
          list,
          "[data-sidebar-item]",
          "sidebarItem",
        );
        revertSortableDomMove(list, evt, this.#revertNextSibling);
        this.#revertNextSibling = null;
        setSortableDraggingState(list, false);

        this.#sortable?.destroy();
        this.#sortable = null;

        const { movedId, afterId, beforeId } = getSortableMove(
          orderedIds,
          evt.newIndex,
        );
        if (!movedId) return;

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
    this._editingDividerId = null;
    this.#sortable?.destroy();
    this.#sortable = null;
  }

  protected updated(): void {
    this.#bindManagerRoot();
    this.#syncHeaderState();

    if (this._reorderMode) {
      this.#initSortable();
    }

    if (this._editingDividerId) {
      const input = this.querySelector<HTMLInputElement>(
        `[data-divider-input-for="${this._editingDividerId}"]`,
      );
      if (input) {
        input.focus();
        input.select();
        input.scrollIntoView({ block: "nearest" });
        this._editingDividerId = null;
      }
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
      const item = (await res.json()) as { id: string };
      this._reorderMode = true;
      await this.#refreshList();
      this._editingDividerId = item.id;
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
      const dialog = this.querySelector<HTMLDialogElement>(
        "#collections-manager-dialog",
      );
      dialog?.showModal();
      const titleInput = dialog?.querySelector<HTMLInputElement>(
        "[data-collection-title-input]",
      );
      titleInput?.focus();
      titleInput?.select();
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
    const confirmed = await showConfirmDialog({
      message: this.labels.confirmDelete,
      confirmLabel: this.labels.deleteCollection,
      cancelLabel: this.labels.cancel,
      tone: "danger",
    });
    if (!confirmed) return;

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

  #renderCollectionItem(item: CollectionManagerItem, sequence: number) {
    const collection = item.collection;
    if (!collection) return nothing;

    const body = html`
      <div class="collection-directory-main">
        <span class="collection-directory-sequence" aria-hidden="true">
          ${String(sequence).padStart(2, "0")}
        </span>
        <div class="collection-directory-title-row">
          <span class="collection-directory-title">
            <span class="collection-directory-title-marker" aria-hidden="true">
              ${unsafeHTML(
                renderCollectionIcon(collection.icon, {
                  size: 14,
                  fallback: true,
                }),
              )}
            </span>
            <span>${collection.title}</span>
          </span>
        </div>
        <p class="collection-directory-summary">
          <span class="collection-directory-meta"
            >${this.#countLabel(collection.postCount)}</span
          >
          <span class="collection-directory-meta-separator" aria-hidden="true"
            >/</span
          >
          <time
            class="collection-directory-updated"
            datetime=${toISOString(collection.recentActivityAt)}
          >
            ${formatRelativeAge(collection.recentActivityAt)}
          </time>
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
          <div class="collection-directory-reorder-main" data-drag-handle>
            ${body}
          </div>
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
          href=${publicPath(`/c/${collection.slug}`)}
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
              data-divider-input-for=${item.id}
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
      ${this.#hasCollections()
        ? html`
            <div id="collections-manager-list" class="collection-directory">
              ${(() => {
                let collectionIndex = 0;
                return this._items.map((item) => {
                  if (item.type === "collection") {
                    collectionIndex += 1;
                    return this.#renderCollectionItem(item, collectionIndex);
                  }
                  return this.#renderDividerItem(item);
                });
              })()}
            </div>
          `
        : html`<p class="text-muted-foreground">${this.labels.emptyState}</p>`}
      ${this.#renderDialog()}
    `;
  }
}

customElements.define("jant-collections-manager", JantCollectionsManager);
