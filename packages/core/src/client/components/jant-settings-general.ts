/**
 * General Settings Component
 *
 * Main container for the General settings page. Contains:
 * - Avatar section (delegated to <jant-settings-avatar>)
 * - General settings form (site name, description, footer, language,
 *   homepage view, timezone)
 * - Search settings form
 *
 * Each form section tracks dirty state independently and dispatches
 * `jant:settings-save` events for the bridge to handle.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type {
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

    // General form
    _siteName: { state: true },
    _siteDescription: { state: true },
    _siteFooter: { state: true },
    _siteLanguage: { state: true },
    _timeZone: { state: true },
    _origGeneral: { state: true },
    _generalDirty: { state: true },
    _generalLoading: { state: true },

    // SEO form
    _noindex: { state: true },
    _origNoindex: { state: true },
    _showJantBrandingOnHome: { state: true },
    _origShowJantBrandingOnHome: { state: true },
    _seoDirty: { state: true },
    _seoLoading: { state: true },
  };

  declare labels: SettingsLabels;
  declare timezones: SettingsTimezone[];
  declare languages: SettingsLanguage[];
  declare siteNameFallback: string;
  declare siteDescriptionFallback: string;
  declare demoMode: boolean;

  // General
  declare _siteName: string;
  declare _siteDescription: string;
  declare _siteFooter: string;
  declare _siteLanguage: string;
  declare _timeZone: string;
  declare _origGeneral: {
    siteName: string;
    siteDescription: string;
    siteFooter: string;
    siteLanguage: string;
    timeZone: string;
  };
  declare _generalDirty: boolean;
  declare _generalLoading: boolean;

  // SEO
  declare _noindex: boolean;
  declare _origNoindex: boolean;
  declare _showJantBrandingOnHome: boolean;
  declare _origShowJantBrandingOnHome: boolean;
  declare _seoDirty: boolean;
  declare _seoLoading: boolean;

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

    this._siteName = "";
    this._siteDescription = "";
    this._siteFooter = "";
    this._siteLanguage = "en";
    this._timeZone = "UTC";
    this._origGeneral = {
      siteName: "",
      siteDescription: "",
      siteFooter: "",
      siteLanguage: "en",
      timeZone: "UTC",
    };
    this._generalDirty = false;
    this._generalLoading = false;

    this._noindex = false;
    this._origNoindex = false;
    this._showJantBrandingOnHome = false;
    this._origShowJantBrandingOnHome = false;
    this._seoDirty = false;
    this._seoLoading = false;
  }

  /** Initialize form state from data attributes set by the bridge */
  initData(data: {
    siteName: string;
    siteDescription: string;
    siteLanguage: string;
    timeZone: string;
    siteFooter: string;
    showJantBrandingOnHome: boolean;
    noindex: boolean;
  }) {
    this._siteName = data.siteName;
    this._siteDescription = data.siteDescription;
    this._siteFooter = data.siteFooter;
    this._showJantBrandingOnHome = data.showJantBrandingOnHome;
    this._siteLanguage = data.siteLanguage;
    this._timeZone = data.timeZone;
    this._origGeneral = {
      siteName: data.siteName,
      siteDescription: data.siteDescription,
      siteFooter: data.siteFooter,
      siteLanguage: data.siteLanguage,
      timeZone: data.timeZone,
    };

    this._noindex = data.noindex;
    this._origNoindex = data.noindex;
    this._origShowJantBrandingOnHome = data.showJantBrandingOnHome;
  }

  /** Called by bridge after a section save succeeds */
  sectionSaved(section: string) {
    if (section === "general") {
      this._origGeneral = {
        siteName: this._siteName,
        siteDescription: this._siteDescription,
        siteFooter: this._siteFooter,
        siteLanguage: this._siteLanguage,
        timeZone: this._timeZone,
      };
      this._generalDirty = false;
      this._generalLoading = false;
    } else if (section === "seo") {
      this._origNoindex = this._noindex;
      this._origShowJantBrandingOnHome = this._showJantBrandingOnHome;
      this._seoDirty = false;
      this._seoLoading = false;
    }
  }

  /** Called by bridge on save error */
  sectionError(section: string) {
    if (section === "general") this._generalLoading = false;
    else if (section === "seo") this._seoLoading = false;
  }

  // ── General form helpers ──────────────────────────────────────────

  private _markGeneralDirty() {
    this._generalDirty = true;
  }

  private _cancelGeneral() {
    this._siteName = this._origGeneral.siteName ?? "";
    this._siteDescription = this._origGeneral.siteDescription ?? "";
    this._siteFooter = this._origGeneral.siteFooter ?? "";
    this._siteLanguage = this._origGeneral.siteLanguage ?? "en";
    this._timeZone = this._origGeneral.timeZone ?? "UTC";
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
            timeZone: this._timeZone,
          },
          section: "general",
        },
      }),
    );
  }

  // ── SEO form helpers ──────────────────────────────────────────────

  private _toggleNoindex() {
    if (this.demoMode) return;
    this._noindex = !this._noindex;
    this._seoDirty =
      this._noindex !== this._origNoindex ||
      this._showJantBrandingOnHome !== this._origShowJantBrandingOnHome;
  }

  private _toggleShowJantBrandingOnHome() {
    this._showJantBrandingOnHome = !this._showJantBrandingOnHome;
    this._seoDirty =
      this._noindex !== this._origNoindex ||
      this._showJantBrandingOnHome !== this._origShowJantBrandingOnHome;
  }

  private _cancelSeo() {
    this._noindex = this._origNoindex;
    this._showJantBrandingOnHome = this._origShowJantBrandingOnHome;
    this._seoDirty = false;
  }

  private _saveSeo() {
    if (this._seoLoading || !this._seoDirty) return;
    this._seoLoading = true;
    this.dispatchEvent(
      new CustomEvent("jant:settings-save", {
        bubbles: true,
        detail: {
          endpoint: "/settings/general/seo",
          data: {
            noindex: this._noindex ? "" : "true",
            showJantBrandingOnHome: this._showJantBrandingOnHome,
          },
          section: "seo",
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
        <div class="flex flex-col gap-4">
          <div class="field">
            <label class="label">${this.labels.siteName}</label>
            <input
              type="text"
              class="input"
              .value=${this._siteName}
              placeholder=${this.siteNameFallback}
              @input=${(e: Event) => {
                this._siteName = (e.target as HTMLInputElement).value;
                this._markGeneralDirty();
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
                this._siteDescription = (e.target as HTMLTextAreaElement).value;
                this._markGeneralDirty();
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
                this._markGeneralDirty();
              }}
            ></textarea>
            <p class="text-sm text-muted-foreground mt-1">
              ${this.labels.footerHelp}
            </p>
          </div>

          <div class="field">
            <label class="label">${this.labels.language}</label>
            <select
              class="select"
              @change=${(e: Event) => {
                this._siteLanguage = (e.target as HTMLSelectElement).value;
                this._markGeneralDirty();
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
                this._markGeneralDirty();
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

  private _renderSeoForm() {
    return html`
      <div
        @keydown=${(e: globalThis.KeyboardEvent) =>
          this._onKeydown(
            e,
            () => this._saveSeo(),
            this._seoDirty,
            this._seoLoading,
          )}
      >
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
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${this._showJantBrandingOnHome}
              @change=${this._toggleShowJantBrandingOnHome}
            />
            <span>${this.labels.showJantBrandingOnHome}</span>
          </label>
          ${this._renderActions(
            this._seoLoading,
            this._seoDirty,
            () => this._saveSeo(),
            () => this._cancelSeo(),
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
        ${this._renderSeoForm()}
      </div>
    `;
  }
}

customElements.define("jant-settings-general", JantSettingsGeneral);
