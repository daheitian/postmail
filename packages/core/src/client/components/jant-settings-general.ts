/**
 * General Settings Component
 *
 * Main container for the General settings page. Contains:
 * - General settings form (site name, description, footer, language,
 *   timezone, main RSS feed, home page branding)
 * - Search settings form
 *
 * Each form section tracks dirty state independently and dispatches
 * `jant:settings-save` events for the bridge to handle.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type {
  SettingsInitialData,
  SettingsLabels,
  SettingsTimezone,
  SettingsLanguage,
} from "./settings-types.js";

export class JantSettingsGeneral extends LitElement {
  static properties = {
    labels: { type: Object },
    timezones: { type: Array },
    languages: { type: Array },
    siteNameFallback: { type: String, attribute: "sitename-fallback" },
    siteDescriptionFallback: {
      type: String,
      attribute: "sitedescription-fallback",
    },
    demoMode: { type: Boolean, attribute: "demo-mode" },
    mainFeedUrl: { type: String, attribute: "main-feed-url" },
    latestFeedUrl: { type: String, attribute: "latest-feed-url" },
    featuredFeedUrl: { type: String, attribute: "featured-feed-url" },

    // General form
    _siteName: { state: true },
    _siteDescription: { state: true },
    _siteFooter: { state: true },
    _siteLanguage: { state: true },
    _mainRssFeed: { state: true },
    _timeZone: { state: true },
    _showJantBrandingOnHome: { state: true },
    _origGeneral: { state: true },
    _generalDirty: { state: true },
    _generalLoading: { state: true },

    // Search form
    _noindex: { state: true },
    _origNoindex: { state: true },
    _searchDirty: { state: true },
    _searchLoading: { state: true },
  };

  declare labels: SettingsLabels;
  declare timezones: SettingsTimezone[];
  declare languages: SettingsLanguage[];
  declare siteNameFallback: string;
  declare siteDescriptionFallback: string;
  declare demoMode: boolean;
  declare mainFeedUrl: string;
  declare latestFeedUrl: string;
  declare featuredFeedUrl: string;

  // General
  declare _siteName: string;
  declare _siteDescription: string;
  declare _siteFooter: string;
  declare _siteLanguage: string;
  declare _mainRssFeed: string;
  declare _timeZone: string;
  declare _showJantBrandingOnHome: boolean;
  declare _origGeneral: {
    siteName: string;
    siteDescription: string;
    siteFooter: string;
    siteLanguage: string;
    mainRssFeed: string;
    timeZone: string;
    showJantBrandingOnHome: boolean;
  };
  declare _generalDirty: boolean;
  declare _generalLoading: boolean;

  // Search
  declare _noindex: boolean;
  declare _origNoindex: boolean;
  declare _searchDirty: boolean;
  declare _searchLoading: boolean;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.labels = {} as SettingsLabels;
    this.timezones = [];
    this.languages = [];
    this.siteNameFallback = "";
    this.siteDescriptionFallback = "";
    this.demoMode = false;
    this.mainFeedUrl = "/feed";
    this.latestFeedUrl = "/feed/latest";
    this.featuredFeedUrl = "/feed/featured";

    this._siteName = "";
    this._siteDescription = "";
    this._siteFooter = "";
    this._siteLanguage = "en";
    this._mainRssFeed = "featured";
    this._timeZone = "UTC";
    this._origGeneral = {
      siteName: "",
      siteDescription: "",
      siteFooter: "",
      siteLanguage: "en",
      mainRssFeed: "featured",
      timeZone: "UTC",
      showJantBrandingOnHome: false,
    };
    this._generalDirty = false;
    this._generalLoading = false;

    this._noindex = false;
    this._origNoindex = false;
    this._showJantBrandingOnHome = false;
    this._searchDirty = false;
    this._searchLoading = false;
  }

  /** Initialize form state from data attributes set by the bridge */
  initData(data: SettingsInitialData) {
    this._siteName = data.siteName;
    this._siteDescription = data.siteDescription;
    this._siteFooter = data.siteFooter;
    this._showJantBrandingOnHome = data.showJantBrandingOnHome;
    this._siteLanguage = data.siteLanguage;
    this._mainRssFeed = data.mainRssFeed;
    this._timeZone = data.timeZone;
    this._origGeneral = {
      siteName: data.siteName,
      siteDescription: data.siteDescription,
      siteFooter: data.siteFooter,
      siteLanguage: data.siteLanguage,
      mainRssFeed: data.mainRssFeed,
      timeZone: data.timeZone,
      showJantBrandingOnHome: data.showJantBrandingOnHome,
    };

    this._noindex = data.noindex;
    this._origNoindex = data.noindex;
  }

  /** Called by bridge after a section save succeeds */
  sectionSaved(section: string) {
    if (section === "general") {
      this._origGeneral = {
        siteName: this._siteName,
        siteDescription: this._siteDescription,
        siteFooter: this._siteFooter,
        siteLanguage: this._siteLanguage,
        mainRssFeed: this._mainRssFeed,
        timeZone: this._timeZone,
        showJantBrandingOnHome: this._showJantBrandingOnHome,
      };
      this._generalDirty = false;
      this._generalLoading = false;
    } else if (section === "search") {
      this._origNoindex = this._noindex;
      this._searchDirty = false;
      this._searchLoading = false;
    }
  }

  /** Called by bridge on save error */
  sectionError(section: string) {
    if (section === "general") this._generalLoading = false;
    else if (section === "search") this._searchLoading = false;
  }

  // ── General form helpers ──────────────────────────────────────────

  private _syncGeneralDirty() {
    this._generalDirty =
      this._siteName !== this._origGeneral.siteName ||
      this._siteDescription !== this._origGeneral.siteDescription ||
      this._siteFooter !== this._origGeneral.siteFooter ||
      this._siteLanguage !== this._origGeneral.siteLanguage ||
      this._mainRssFeed !== this._origGeneral.mainRssFeed ||
      this._timeZone !== this._origGeneral.timeZone ||
      this._showJantBrandingOnHome !== this._origGeneral.showJantBrandingOnHome;
  }

  private _cancelGeneral() {
    this._siteName = this._origGeneral.siteName ?? "";
    this._siteDescription = this._origGeneral.siteDescription ?? "";
    this._siteFooter = this._origGeneral.siteFooter ?? "";
    this._siteLanguage = this._origGeneral.siteLanguage ?? "en";
    this._mainRssFeed = this._origGeneral.mainRssFeed ?? "featured";
    this._timeZone = this._origGeneral.timeZone ?? "UTC";
    this._showJantBrandingOnHome =
      this._origGeneral.showJantBrandingOnHome ?? false;
    this._generalDirty = false;
  }

  private _saveGeneral() {
    if (this._generalLoading || !this._generalDirty) return;
    this._generalLoading = true;
    this.dispatchEvent(
      new CustomEvent("jant:settings-save", {
        bubbles: true,
        detail: {
          endpoint: "/settings/general",
          data: {
            siteName: this._siteName,
            siteDescription: this._siteDescription,
            siteFooter: this._siteFooter,
            siteLanguage: this._siteLanguage,
            mainRssFeed: this._mainRssFeed,
            timeZone: this._timeZone,
            showJantBrandingOnHome: this._showJantBrandingOnHome,
          },
          section: "general",
        },
      }),
    );
  }

  // ── Search form helpers ───────────────────────────────────────────

  private _toggleNoindex() {
    if (this.demoMode) return;
    this._noindex = !this._noindex;
    this._searchDirty = this._noindex !== this._origNoindex;
  }

  private _cancelSearch() {
    this._noindex = this._origNoindex;
    this._searchDirty = false;
  }

  private _saveSearch() {
    if (this._searchLoading || !this._searchDirty) return;
    this._searchLoading = true;
    this.dispatchEvent(
      new CustomEvent("jant:settings-save", {
        bubbles: true,
        detail: {
          endpoint: "/settings/general/search",
          data: {
            noindex: this._noindex ? "" : "true",
          },
          section: "search",
        },
      }),
    );
  }

  /** Submit on Enter from non-textarea fields */
  private _onKeydown(
    e: globalThis.KeyboardEvent,
    save: () => void,
    dirty: boolean,
    loading: boolean,
  ) {
    if (
      e.key === "Enter" &&
      !loading &&
      dirty &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      save();
    }
  }

  // ── Render helpers ────────────────────────────────────────────────

  private _renderActions(
    loading: boolean,
    dirty: boolean,
    onSave: () => void,
    onCancel: () => void,
  ) {
    return html`
      <div class="flex gap-2 mt-4">
        <button
          type="button"
          class="btn"
          ?disabled=${loading || !dirty}
          @click=${onSave}
        >
          ${loading
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
          ${this.labels.save}
        </button>
        <button
          type="button"
          class="btn-outline"
          ?disabled=${loading || !dirty}
          @click=${onCancel}
        >
          ${this.labels.cancel}
        </button>
      </div>
    `;
  }

  private _renderSectionTitle(title: string) {
    return html`<h3 class="text-sm font-semibold tracking-[0.01em]">
      ${title}
    </h3>`;
  }

  private _renderMainRssFeedOption(
    value: string,
    title: string,
    description: string,
  ) {
    const checked = this._mainRssFeed === value;
    return html`
      <label
        class=${`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
          checked ? "border-primary" : "border-border"
        }`}
      >
        <input
          type="radio"
          name="main-rss-feed"
          value=${value}
          class="mt-1"
          .checked=${checked}
          @change=${() => {
            this._mainRssFeed = value;
            this._syncGeneralDirty();
          }}
        />
        <div>
          <div class="font-medium">${title}</div>
          <div class="text-sm text-muted-foreground">${description}</div>
        </div>
      </label>
    `;
  }

  private _renderGeneralForm() {
    return html`
      <div
        @keydown=${(e: globalThis.KeyboardEvent) =>
          this._onKeydown(
            e,
            () => this._saveGeneral(),
            this._generalDirty,
            this._generalLoading,
          )}
      >
        <h2 class="text-lg font-semibold mb-4">${this.labels.general}</h2>
        <div class="flex flex-col gap-6">
          <section class="flex flex-col gap-4">
            ${this._renderSectionTitle(this.labels.site)}
            <div class="field">
              <label class="label">${this.labels.siteName}</label>
              <input
                type="text"
                class="input"
                .value=${this._siteName}
                placeholder=${this.siteNameFallback}
                @input=${(e: Event) => {
                  this._siteName = (e.target as HTMLInputElement).value;
                  this._syncGeneralDirty();
                }}
              />
            </div>

            <div class="field">
              <label class="label">${this.labels.aboutBlog}</label>
              <textarea
                class="textarea"
                rows="2"
                .value=${this._siteDescription}
                placeholder=${this.siteDescriptionFallback}
                @input=${(e: Event) => {
                  this._siteDescription = (
                    e.target as HTMLTextAreaElement
                  ).value;
                  this._syncGeneralDirty();
                }}
              ></textarea>
              <p class="text-sm text-muted-foreground mt-1">
                ${this.labels.aboutBlogHelp}
              </p>
            </div>

            <div class="field">
              <label class="label">${this.labels.siteFooter}</label>
              <textarea
                class="textarea font-mono text-sm"
                rows="4"
                .value=${this._siteFooter}
                placeholder=${this.labels.markdownSupported}
                @input=${(e: Event) => {
                  this._siteFooter = (e.target as HTMLTextAreaElement).value;
                  this._syncGeneralDirty();
                }}
              ></textarea>
              <p class="text-sm text-muted-foreground mt-1">
                ${this.labels.footerHelp}
              </p>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            ${this._renderSectionTitle(this.labels.languageAndTime)}
            <div class="field">
              <label class="label">${this.labels.language}</label>
              <select
                class="select"
                @change=${(e: Event) => {
                  this._siteLanguage = (e.target as HTMLSelectElement).value;
                  this._syncGeneralDirty();
                }}
              >
                ${this.languages.map(
                  (lang) => html`
                    <option
                      value=${lang.value}
                      ?selected=${this._siteLanguage === lang.value}
                    >
                      ${lang.label}
                    </option>
                  `,
                )}
              </select>
            </div>

            <div class="field">
              <label class="label">${this.labels.timeZone}</label>
              <select
                class="select"
                @change=${(e: Event) => {
                  this._timeZone = (e.target as HTMLSelectElement).value;
                  this._syncGeneralDirty();
                }}
              >
                ${this.timezones.map(
                  (tz) => html`
                    <option
                      value=${tz.value}
                      ?selected=${this._timeZone === tz.value}
                    >
                      ${tz.label}
                    </option>
                  `,
                )}
              </select>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            ${this._renderSectionTitle(this.labels.feeds)}
            <div class="field">
              <p class="label">${this.labels.mainRssFeed}</p>
              <p class="text-sm text-muted-foreground mt-1">
                ${this.labels.mainRssFeedHelp}
              </p>
              <div class="mt-3 flex flex-col gap-2">
                ${this._renderMainRssFeedOption(
                  "featured",
                  this.labels.featuredFeedOption,
                  this.labels.featuredFeedOptionDescription,
                )}
                ${this._renderMainRssFeedOption(
                  "latest",
                  this.labels.latestFeedOption,
                  this.labels.latestFeedOptionDescription,
                )}
              </div>
              <p class="text-sm text-muted-foreground mt-2">
                ${this.labels.mainRssFeedWarning}
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <p class="text-sm font-medium">
                ${this.labels.availableFeedUrls}
              </p>
              <p class="text-sm text-muted-foreground">
                ${this.labels.availableFeedUrlsHelp}
              </p>
              <a href=${this.mainFeedUrl} class="site-header-link">
                ${this.labels.mainFeedUrl}: ${this.mainFeedUrl}
              </a>
              <a href=${this.latestFeedUrl} class="site-header-link">
                ${this.labels.latestFeedUrl}: ${this.latestFeedUrl}
              </a>
              <a href=${this.featuredFeedUrl} class="site-header-link">
                ${this.labels.featuredFeedUrl}: ${this.featuredFeedUrl}
              </a>
            </div>
          </section>

          <section class="flex flex-col gap-4">
            ${this._renderSectionTitle(this.labels.home)}
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                .checked=${this._showJantBrandingOnHome}
                @change=${() => {
                  this._showJantBrandingOnHome = !this._showJantBrandingOnHome;
                  this._syncGeneralDirty();
                }}
              />
              <span>${this.labels.showJantBrandingOnHome}</span>
            </label>
          </section>

          ${this._renderActions(
            this._generalLoading,
            this._generalDirty,
            () => this._saveGeneral(),
            () => this._cancelGeneral(),
          )}
        </div>
      </div>
    `;
  }

  private _renderSearchForm() {
    return html`
      <div
        @keydown=${(e: globalThis.KeyboardEvent) =>
          this._onKeydown(
            e,
            () => this._saveSearch(),
            this._searchDirty,
            this._searchLoading,
          )}
      >
        <h2 class="text-lg font-semibold mb-4">${this.labels.search}</h2>
        <div class="flex flex-col gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${!this._noindex}
              ?disabled=${this.demoMode}
              @change=${this._toggleNoindex}
            />
            <span>${this.labels.allowIndexing}</span>
          </label>
          ${this.demoMode
            ? html`<p class="text-sm text-muted-foreground">
                ${this.labels.demoSeoLocked}
              </p>`
            : nothing}
          ${this._renderActions(
            this._searchLoading,
            this._searchDirty,
            () => this._saveSearch(),
            () => this._cancelSearch(),
          )}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="flex flex-col">
        ${this._renderGeneralForm()}
        <hr class="my-8" />
        ${this._renderSearchForm()}
      </div>
    `;
  }
}

customElements.define("jant-settings-general", JantSettingsGeneral);
