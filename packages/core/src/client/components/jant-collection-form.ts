/**
 * Collection Form Component
 *
 * Handles create/edit collection form interactions:
 * - Maintains form state for title, slug, description, sort order, and icon
 * - Notion-style inline icon trigger with anchored popover (Icons + Emojis tabs)
 * - Color presets that instantly recolor all icon previews
 * - Default "library" icon in create mode
 * - Dispatches `jant:collection-submit` for the bridge to POST to the server
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  DEFAULT_ICON_PALETTE,
  DEFAULT_ICON_NAME,
  createIconValue,
  parseCollectionIcon,
  renderCollectionIcon,
  getIconSvg,
} from "../../lib/icons.js";
import {
  ICON_COLOR_PRESETS,
  getCollectionIconColorVar,
  type CollectionIconPalette,
} from "../../lib/collection-icon-palette.js";
import {
  ALL_ICON_CATEGORIES,
  ALL_ICON_NAMES,
  ICON_CATALOG,
} from "../../lib/icon-catalog.js";
import { EMOJI_CATALOG } from "../../lib/emoji-catalog.js";
import { slugify } from "../lazy-slugify.js";
import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "./collection-types.js";

const ICON_SEARCH_RESULTS_LIMIT = 120;
const CURATED_ICON_NAMES = new Set(Object.values(ICON_CATALOG).flat());
const ALL_ICON_CATEGORY_NAMES = Object.keys(ALL_ICON_CATEGORIES);

type CatalogCategory = {
  name: string;
  icons: Array<{ name: string; svg: string }>;
};

type EmojiCategory = {
  name: string;
  emojis: string[];
};

export class JantCollectionForm extends LitElement {
  static properties = {
    labels: { type: Object },
    initial: { type: Object },
    action: { type: String },
    cancelHref: { type: String, attribute: "cancel-href" },
    isEdit: { type: Boolean, attribute: "is-edit" },
    variant: { type: String },

    _title: { state: true },
    _slug: { state: true },
    _description: { state: true },
    _sortOrder: { state: true },
    _iconName: { state: true },
    _iconSvg: { state: true },
    _iconPalette: { state: true },
    _iconEmoji: { state: true },
    _iconSearch: { state: true },
    _pickerOpen: { state: true },
    _pickerTab: { state: true },
    _showAllIconCategories: { state: true },
    _browseIconCategory: { state: true },
    _loading: { state: true },
  };

  declare labels: CollectionFormLabels;
  declare initial: CollectionFormInitial;
  declare action: string;
  declare cancelHref: string;
  declare isEdit: boolean;
  declare variant: "full" | "quick";

  declare _title: string;
  declare _slug: string;
  declare _description: string;
  declare _sortOrder: string;
  declare _iconName: string;
  declare _iconSvg: string;
  declare _iconPalette: CollectionIconPalette;
  declare _iconEmoji: string;
  declare _iconSearch: string;
  declare _pickerOpen: boolean;
  declare _pickerTab: "icons" | "emojis";
  declare _showAllIconCategories: boolean;
  declare _browseIconCategory: string;
  declare _loading: boolean;

  #initialized = false;
  #svgCache = new Map<string, string>();

  #getCachedSvg(name: string): string | null {
    const cached = this.#svgCache.get(name);
    if (cached !== undefined) return cached;
    const svg = getIconSvg(name);
    if (svg) this.#svgCache.set(name, svg);
    return svg;
  }

  #closePickerHandler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const pickerEl = this.querySelector<HTMLElement>("[data-icon-picker]");
    const triggerEl = this.querySelector<HTMLElement>("[data-icon-trigger]");
    if (
      pickerEl &&
      !pickerEl.contains(target) &&
      triggerEl &&
      !triggerEl.contains(target)
    ) {
      this._pickerOpen = false;
    }
  };

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.labels = {} as CollectionFormLabels;
    this.initial = {
      title: "",
      slug: "",
      description: "",
      sortOrder: "newest",
      icon: "",
    };
    this.action = "";
    this.cancelHref = "/";
    this.isEdit = false;
    this.variant = "full";

    this._title = "";
    this._slug = "";
    this._description = "";
    this._sortOrder = "newest";
    this._iconName = "";
    this._iconSvg = "";
    this._iconPalette = DEFAULT_ICON_PALETTE;
    this._iconEmoji = "";
    this._iconSearch = "";
    this._pickerOpen = false;
    this._pickerTab = "icons";
    this._showAllIconCategories = false;
    this._browseIconCategory = "";
    this._loading = false;
  }

  protected update(
    changedProperties: PropertyValueMap<JantCollectionForm>,
  ): void {
    if (!this.#initialized || changedProperties.has("initial")) {
      this.#applyInitialData();
    }
    super.update(changedProperties);
  }

  set loading(value: boolean) {
    this._loading = value;
  }

  get loading(): boolean {
    return this._loading;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#closePickerHandler, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#closePickerHandler, true);
  }

  #applyInitialData() {
    if (!this.initial) return;
    this.#initialized = true;
    this._title = this.initial.title ?? "";
    this._slug = this.initial.slug ?? "";
    this._description = this.initial.description ?? "";
    this._sortOrder = this.initial.sortOrder ?? "newest";

    const rawIcon = this.initial.icon ?? "";
    const parsed = parseCollectionIcon(rawIcon);
    if (parsed) {
      this._iconName = parsed.name;
      this._iconSvg = parsed.svg;
      this._iconPalette = parsed.palette;
      this._iconEmoji = "";
    } else if (rawIcon && !rawIcon.startsWith("{")) {
      // Legacy emoji value
      this._iconEmoji = rawIcon;
      this._iconName = "";
      this._iconSvg = "";
      this._iconPalette = DEFAULT_ICON_PALETTE;
    } else {
      this._iconName = "";
      this._iconSvg = "";
      this._iconPalette = DEFAULT_ICON_PALETTE;
      this._iconEmoji = "";
      // Default icon in create mode
      if (!this.isEdit && this.variant !== "quick") {
        this.#applyDefaultIcon();
      }
    }
  }

  #applyDefaultIcon() {
    const svg = getIconSvg(DEFAULT_ICON_NAME);
    if (svg) {
      this._iconName = DEFAULT_ICON_NAME;
      this._iconSvg = svg;
      this._iconPalette = DEFAULT_ICON_PALETTE;
    }
  }

  get #iconValue(): string {
    if (this._iconEmoji) {
      return this._iconEmoji;
    }
    if (this._iconName && this._iconSvg) {
      return createIconValue(
        this._iconName,
        this._iconSvg,
        this._iconPalette || DEFAULT_ICON_PALETTE,
      );
    }
    return "";
  }

  #browseIconsByCategory: CatalogCategory[] | null = null;
  #allIconsByCategory = new Map<string, CatalogCategory | null>();

  #getBrowseIconsByCategory(): CatalogCategory[] {
    if (this.#browseIconsByCategory) return this.#browseIconsByCategory;
    const result: CatalogCategory[] = [];
    for (const [category, names] of Object.entries(ICON_CATALOG)) {
      const icons = names
        .map((name) => {
          const svg = this.#getCachedSvg(name);
          return svg ? { name, svg } : null;
        })
        .filter((icon): icon is { name: string; svg: string } => Boolean(icon));
      if (icons.length > 0) {
        result.push({ name: category, icons });
      }
    }
    this.#browseIconsByCategory = result;
    return result;
  }

  #getBrowseCategoryName(): string {
    if (
      this._browseIconCategory &&
      Object.prototype.hasOwnProperty.call(
        ALL_ICON_CATEGORIES,
        this._browseIconCategory,
      )
    ) {
      return this._browseIconCategory;
    }

    return ALL_ICON_CATEGORY_NAMES[0] ?? "";
  }

  #getAllIconsCategory(categoryName: string): CatalogCategory | null {
    const cached = this.#allIconsByCategory.get(categoryName);
    if (cached !== undefined) return cached;

    const names = ALL_ICON_CATEGORIES[categoryName];
    if (!names) {
      this.#allIconsByCategory.set(categoryName, null);
      return null;
    }

    const icons = names
      .map((name) => {
        const svg = this.#getCachedSvg(name);
        return svg ? { name, svg } : null;
      })
      .filter((icon): icon is { name: string; svg: string } => Boolean(icon));

    const category = icons.length > 0 ? { name: categoryName, icons } : null;
    this.#allIconsByCategory.set(categoryName, category);
    return category;
  }

  #setShowAllIconCategories(showAll: boolean) {
    this._showAllIconCategories = showAll;
    if (showAll) {
      this._browseIconCategory = ALL_ICON_CATEGORY_NAMES[0] ?? "";
    }
  }

  #filteredCatalog(): CatalogCategory[] {
    const q = this._iconSearch.trim().toLowerCase();

    if (!q) {
      if (this._showAllIconCategories) {
        const category = this.#getAllIconsCategory(
          this.#getBrowseCategoryName(),
        );
        return category ? [category] : [];
      }

      const categories = [...this.#getBrowseIconsByCategory()];
      if (
        this._iconName &&
        this._iconSvg &&
        !CURATED_ICON_NAMES.has(this._iconName)
      ) {
        categories.unshift({
          name: "selected",
          icons: [{ name: this._iconName, svg: this._iconSvg }],
        });
      }
      return categories;
    }

    const matching = ALL_ICON_NAMES.filter((name) => name.includes(q)).slice(
      0,
      ICON_SEARCH_RESULTS_LIMIT,
    );
    if (matching.length === 0) return [];

    const icons = matching
      .map((name) => {
        const svg = this.#getCachedSvg(name);
        return svg ? { name, svg } : null;
      })
      .filter((icon): icon is { name: string; svg: string } => Boolean(icon));

    if (icons.length === 0) return [];
    return [{ name: "results", icons }];
  }

  #filteredEmojiCatalog(): EmojiCategory[] {
    const q = this._iconSearch.trim().toLowerCase();
    const result: EmojiCategory[] = [];
    for (const [category, emojis] of Object.entries(EMOJI_CATALOG)) {
      if (q && !category.includes(q)) continue;
      result.push({ name: category, emojis });
    }
    return result;
  }

  #togglePicker(e: Event) {
    e.stopPropagation();
    this._pickerOpen = !this._pickerOpen;
    this._iconSearch = "";
  }

  #selectIcon(name: string, svg: string) {
    this._iconName = name;
    this._iconSvg = svg;
    this._iconEmoji = "";
    if (!this._iconPalette) {
      this._iconPalette = DEFAULT_ICON_PALETTE;
    }
    this._iconSearch = "";
    this._pickerOpen = false;
  }

  #selectEmoji(emoji: string) {
    this._iconEmoji = emoji;
    this._iconName = "";
    this._iconSvg = "";
    this._iconSearch = "";
    this._pickerOpen = false;
  }

  #removeIcon() {
    this._iconEmoji = "";
    this._iconPalette = DEFAULT_ICON_PALETTE;
    this.#applyDefaultIcon();
    this._pickerOpen = false;
  }

  #handleSubmit(e: Event) {
    e.preventDefault();
    const title = this._title.trim();
    const slug = this._slug.trim();
    if (!title || !slug) {
      return;
    }

    const detail: CollectionSubmitDetail = {
      endpoint: this.action,
      isEdit: this.isEdit,
      data: {
        title,
        slug,
        description:
          this.variant === "quick"
            ? undefined
            : this._description.trim() || undefined,
        icon:
          this.variant === "quick" ? undefined : this.#iconValue || undefined,
        sortOrder:
          this.variant === "quick" ? undefined : this._sortOrder || undefined,
      },
    };

    this.dispatchEvent(
      new CustomEvent<CollectionSubmitDetail>("jant:collection-submit", {
        bubbles: true,
        detail,
      }),
    );
  }

  #renderTriggerIcon() {
    if (this._iconEmoji) {
      return html`<span class="text-lg leading-none">${this._iconEmoji}</span>`;
    }
    if (this._iconSvg) {
      const htmlString = renderCollectionIcon(this.#iconValue, {
        size: 20,
        fallback: false,
      });
      return html`<span
        class="w-5 h-5 flex items-center justify-center"
        style=${`color:${getCollectionIconColorVar(this._iconPalette)}`}
      >
        ${unsafeHTML(htmlString)}
      </span>`;
    }
    return html`<span class="text-muted-foreground text-base">+</span>`;
  }

  #renderInlineIconTrigger() {
    return html`
      <button
        type="button"
        data-icon-trigger
        class="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors z-10"
        @click=${(e: Event) => this.#togglePicker(e)}
      >
        ${this.#renderTriggerIcon()}
      </button>
    `;
  }

  #renderPickerColorPresets() {
    return html`
      <div class="flex items-center gap-1.5 px-3 pb-2">
        ${ICON_COLOR_PRESETS.map((preset) => {
          const isActive = this._iconPalette === preset.name;
          return html`
            <button
              type="button"
              class=${`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110${isActive ? " ring-2 ring-offset-1 ring-primary" : ""}`}
              style=${`background-color:${getCollectionIconColorVar(preset.name)}; border-color: transparent`}
              title=${preset.name}
              @click=${() => {
                this._iconPalette = preset.name;
              }}
            ></button>
          `;
        })}
      </div>
    `;
  }

  #formatCategoryLabel(category: string): string {
    return category
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  #renderIconBrowseControls() {
    const hasSearch = this._iconSearch.trim().length > 0;
    if (hasSearch) return nothing;

    if (!this._showAllIconCategories) {
      return html`
        <div class="flex items-center justify-between gap-3 px-3 pb-2">
          <p
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            ${this.labels.featuredIconsLabel}
          </p>
          <button
            type="button"
            data-icon-show-more
            class="btn-ghost text-sm"
            @click=${() => this.#setShowAllIconCategories(true)}
          >
            ${this.labels.showMoreIcons}
          </button>
        </div>
      `;
    }

    return html`
      <div class="flex flex-col gap-2 px-3 pb-2">
        <div class="flex items-center justify-between gap-3">
          <p
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            ${this.labels.browseAllIconsLabel}
          </p>
          <button
            type="button"
            data-icon-show-less
            class="btn-ghost text-sm"
            @click=${() => this.#setShowAllIconCategories(false)}
          >
            ${this.labels.showLessIcons}
          </button>
        </div>
        <div
          class="collection-icon-category-strip overflow-x-auto"
          style="scrollbar-width: none; -ms-overflow-style: none;"
        >
          <div class="flex min-w-max gap-1.5">
            ${ALL_ICON_CATEGORY_NAMES.map((category) => {
              const isActive = this.#getBrowseCategoryName() === category;
              return html`
                <button
                  type="button"
                  data-icon-browse-category=${category}
                  class=${`shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors ${isActive ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                  aria-pressed=${isActive ? "true" : "false"}
                  @click=${() => {
                    this._browseIconCategory = category;
                  }}
                >
                  ${this.#formatCategoryLabel(category)}
                </button>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  #renderIconsGrid() {
    const categories = this.#filteredCatalog();
    if (categories.length === 0) {
      return html`<p class="text-sm text-muted-foreground px-3 py-2">
        No icons found
      </p>`;
    }
    return categories.map(
      (category) => html`
        <div class="flex flex-col gap-1.5 mb-3" data-category=${category.name}>
          <h3
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3"
          >
            ${this.#formatCategoryLabel(category.name)}
          </h3>
          <div class="grid grid-cols-8 gap-0.5 px-2">
            ${category.icons.map(
              (icon) => html`
                <button
                  type="button"
                  class=${`flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors${this._iconName === icon.name && this._iconSvg === icon.svg && !this._iconEmoji ? " ring-2 ring-primary" : ""}`}
                  data-icon-name=${icon.name}
                  title=${icon.name}
                  style=${`color:${getCollectionIconColorVar(this._iconPalette)}`}
                  @click=${() => this.#selectIcon(icon.name, icon.svg)}
                >
                  <span class="w-4 h-4 flex items-center justify-center">
                    ${unsafeHTML(
                      icon.svg
                        .replace(/width="24"/, 'width="16"')
                        .replace(/height="24"/, 'height="16"'),
                    )}
                  </span>
                </button>
              `,
            )}
          </div>
        </div>
      `,
    );
  }

  #renderEmojisGrid() {
    const categories = this.#filteredEmojiCatalog();
    if (categories.length === 0) {
      return html`<p class="text-sm text-muted-foreground px-3 py-2">
        No emojis found
      </p>`;
    }
    return categories.map(
      (category) => html`
        <div class="flex flex-col gap-1.5 mb-3" data-category=${category.name}>
          <h3
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3"
          >
            ${category.name}
          </h3>
          <div class="grid grid-cols-8 gap-0.5 px-2">
            ${category.emojis.map(
              (emoji) => html`
                <button
                  type="button"
                  class=${`flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors text-lg${this._iconEmoji === emoji ? " ring-2 ring-primary" : ""}`}
                  @click=${() => this.#selectEmoji(emoji)}
                >
                  ${emoji}
                </button>
              `,
            )}
          </div>
        </div>
      `,
    );
  }

  #renderIconPopover() {
    if (!this._pickerOpen) return nothing;

    const isIconsTab = this._pickerTab === "icons";
    const searchPlaceholder = isIconsTab
      ? this.labels.searchIconsPlaceholder
      : this.labels.searchEmojisPlaceholder;
    const hasIcon = this._iconSvg || this._iconEmoji;

    return html`
      <div
        data-icon-picker
        class="absolute left-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-background shadow-lg"
      >
        <!-- Tabs -->
        <div class="flex border-b border-border">
          <button
            type="button"
            class=${`flex-1 px-3 py-2 text-sm font-medium transition-colors ${isIconsTab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            @click=${() => {
              this._pickerTab = "icons";
              this._iconSearch = "";
            }}
          >
            ${this.labels.iconsTab}
          </button>
          <button
            type="button"
            class=${`flex-1 px-3 py-2 text-sm font-medium transition-colors ${!isIconsTab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            @click=${() => {
              this._pickerTab = "emojis";
              this._iconSearch = "";
            }}
          >
            ${this.labels.emojisTab}
          </button>
        </div>

        <!-- Color presets (icons tab only) -->
        ${isIconsTab
          ? html`<div class="pt-2">${this.#renderPickerColorPresets()}</div>`
          : nothing}

        <!-- Search -->
        <div class="px-3 py-2">
          <input
            type="search"
            class="input text-sm w-full"
            placeholder=${searchPlaceholder}
            .value=${this._iconSearch}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              this._iconSearch = target.value;
            }}
          />
        </div>

        ${isIconsTab ? this.#renderIconBrowseControls() : nothing}

        <!-- Grid -->
        <div class="overflow-y-auto max-h-80">
          ${isIconsTab ? this.#renderIconsGrid() : this.#renderEmojisGrid()}
        </div>

        <!-- Remove button -->
        ${hasIcon
          ? html`
              <div class="border-t border-border px-3 py-2">
                <button
                  type="button"
                  data-icon-remove
                  class="btn-ghost text-sm w-full"
                  @click=${() => this.#removeIcon()}
                >
                  ${this.labels.removeIcon}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    const isQuick = this.variant === "quick";

    return html`
      <form
        class="flex flex-col gap-4 max-w-lg"
        @submit=${(event: Event) => this.#handleSubmit(event)}
      >
        <div class="field">
          <label class="label">${this.labels.titleLabel}</label>
          <div class=${isQuick ? nothing : "relative"}>
            ${isQuick ? nothing : this.#renderInlineIconTrigger()}
            <input
              type="text"
              class=${isQuick ? "input" : "input pl-12"}
              data-collection-title-input
              required
              .value=${this._title}
              placeholder=${this.isEdit
                ? nothing
                : this.labels.titlePlaceholder}
              @input=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                this._title = target.value;
                if (!this.isEdit) {
                  const currentTitle = target.value;
                  slugify(currentTitle).then((slug) => {
                    if (this._title === currentTitle) {
                      this._slug = slug;
                    }
                  });
                }
              }}
            />
            ${isQuick ? nothing : this.#renderIconPopover()}
          </div>
        </div>

        <div class="field">
          <label class="label">${this.labels.slugLabel}</label>
          <input
            type="text"
            class="input"
            required
            pattern="[a-z0-9\\-]+"
            .value=${this._slug}
            placeholder=${this.isEdit ? nothing : "my-collection"}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              this._slug = target.value.toLowerCase();
            }}
          />
          ${this.isEdit
            ? nothing
            : html`<p class="text-xs text-muted-foreground mt-1">
                ${this.labels.slugHelp}
              </p>`}
        </div>

        ${isQuick
          ? nothing
          : html`
              <div class="field">
                <label class="label">${this.labels.descriptionLabel}</label>
                <textarea
                  class="textarea"
                  rows="3"
                  .value=${this._description}
                  placeholder=${this.isEdit
                    ? nothing
                    : this.labels.descriptionPlaceholder}
                  @input=${(event: Event) => {
                    const target = event.target as HTMLTextAreaElement;
                    this._description = target.value;
                  }}
                ></textarea>
              </div>

              <div class="field">
                <label class="label">${this.labels.sortOrderLabel}</label>
                <select
                  class="select"
                  .value=${this._sortOrder}
                  @change=${(event: Event) => {
                    const target = event.target as HTMLSelectElement;
                    this._sortOrder = target.value;
                  }}
                >
                  <option value="newest">${this.labels.sortNewest}</option>
                  <option value="oldest">${this.labels.sortOldest}</option>
                  <option value="rating_desc">
                    ${this.labels.sortRatingDesc}
                  </option>
                  <option value="rating_asc">
                    ${this.labels.sortRatingAsc}
                  </option>
                </select>
              </div>
            `}

        <div class="flex gap-2">
          <button type="submit" class="btn" ?disabled=${this._loading}>
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
            ${this.labels.submitLabel}
          </button>
          <a href=${this.cancelHref} class="btn-outline">
            ${this.labels.cancelLabel}
          </a>
        </div>
      </form>
    `;
  }
}

customElements.define("jant-collection-form", JantCollectionForm);
