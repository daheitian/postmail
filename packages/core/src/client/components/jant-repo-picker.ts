/**
 * GitHub Sync Repository Picker
 *
 * Two-combobox repo picker for the GitHub Sync connect flow. Renders the
 * owner (installation) dropdown and the repo dropdown side by side, with
 * local filtering on the first page of repos and a switch to GitHub's
 * `/search/repositories` endpoint once the user's query exceeds what we
 * have locally.
 *
 * The component is the sole consumer of the `/settings/github-sync/app/*`
 * JSON endpoints added in Phase 2. All navigation and confirmation
 * happens client-side; the final Connect submit posts JSON to
 * `/settings/github-sync/app/connect` and follows the returned redirect.
 *
 * Light DOM (BaseCoat + Tailwind classes apply directly). Labels arrive
 * via a JSON attribute (see jant-repo-picker-types.ts for the shape).
 */

import { LitElement, html, nothing } from "lit";
import type { RepoPickerLabels } from "./jant-repo-picker-types.js";

interface Installation {
  installationId: string;
  account: {
    login: string;
    type: "User" | "Organization";
    avatarUrl: string;
  };
  addedAt: number;
}

interface RepoRow {
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
}

interface ReposResponse {
  repos: RepoRow[];
  totalCount: number;
  hasMore: boolean;
  nextPage: number | null;
  mode: "list" | "search";
}

type Classification =
  | { kind: "empty" }
  | {
      kind: "owned";
      marker: { site_host: string; site_id: string; created_at: number };
    }
  | {
      kind: "owned-by-other-site";
      marker: { site_host: string; site_id: string; created_at: number };
    }
  | { kind: "foreign"; defaultBranch: string };

const SEARCH_DEBOUNCE_MS = 300;
/** How many chars before we stop filtering locally and hit GitHub search. */
const SEARCH_MIN_CHARS = 1;

export class JantRepoPicker extends LitElement {
  static properties = {
    labels: { type: Object },
    apiBase: { type: String, attribute: "api-base" },
    connectUrl: { type: String, attribute: "connect-url" },
    installUrl: { type: String, attribute: "install-url" },
    cancelUrl: { type: String, attribute: "cancel-url" },

    _installations: { state: true },
    _selectedOwner: { state: true },
    _ownerOpen: { state: true },

    _repos: { state: true },
    _totalCount: { state: true },
    _hasMore: { state: true },
    _nextPage: { state: true },
    _reposMode: { state: true },
    _repoOpen: { state: true },
    _repoSearch: { state: true },
    _loadingRepos: { state: true },

    _selectedRepo: { state: true },
    _classification: { state: true },
    _classifying: { state: true },
    _confirmText: { state: true },

    _connecting: { state: true },
    _error: { state: true },

    _showCreate: { state: true },
    _createName: { state: true },
    _createDescription: { state: true },
    _createPrivate: { state: true },
    _creating: { state: true },
    _createError: { state: true },
  };

  declare labels: RepoPickerLabels;
  declare apiBase: string;
  declare connectUrl: string;
  declare installUrl: string;
  declare cancelUrl: string;

  declare _installations: Installation[];
  declare _selectedOwner: Installation | null;
  declare _ownerOpen: boolean;

  declare _repos: RepoRow[];
  declare _totalCount: number;
  declare _hasMore: boolean;
  declare _nextPage: number | null;
  declare _reposMode: "list" | "search";
  declare _repoOpen: boolean;
  declare _repoSearch: string;
  declare _loadingRepos: boolean;

  declare _selectedRepo: RepoRow | null;
  declare _classification: Classification | null;
  declare _classifying: boolean;
  declare _confirmText: string;

  declare _connecting: boolean;
  declare _error: string | null;

  declare _showCreate: boolean;
  declare _createName: string;
  declare _createDescription: string;
  declare _createPrivate: boolean;
  declare _creating: boolean;
  declare _createError: string | null;

  #searchTimer: ReturnType<typeof setTimeout> | null = null;
  #searchToken = 0;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.labels = {} as RepoPickerLabels;
    this.apiBase = "";
    this.connectUrl = "";
    this.installUrl = "";
    this.cancelUrl = "";

    this._installations = [];
    this._selectedOwner = null;
    this._ownerOpen = false;

    this._repos = [];
    this._totalCount = 0;
    this._hasMore = false;
    this._nextPage = null;
    this._reposMode = "list";
    this._repoOpen = false;
    this._repoSearch = "";
    this._loadingRepos = false;

    this._selectedRepo = null;
    this._classification = null;
    this._classifying = false;
    this._confirmText = "";

    this._connecting = false;
    this._error = null;

    this._showCreate = false;
    this._createName = "";
    this._createDescription = "";
    this._createPrivate = true;
    this._creating = false;
    this._createError = null;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#handleOutsideClick);
    document.addEventListener("keydown", this.#handleEscape);
    void this.#loadInstallations();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#handleOutsideClick);
    document.removeEventListener("keydown", this.#handleEscape);
    if (this.#searchTimer) clearTimeout(this.#searchTimer);
  }

  // -------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------

  async #loadInstallations() {
    try {
      const res = await fetch(`${this.apiBase}/installations`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        installations: Installation[];
      };
      this._installations = data.installations;
      // Auto-select when there is exactly one option — common case for
      // users who've only authorized on their primary account.
      const only =
        data.installations.length === 1 ? data.installations[0] : null;
      if (only) {
        this.#selectOwner(only);
      }
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    }
  }

  async #loadRepos(installationId: string, opts: { q?: string } = {}) {
    const token = ++this.#searchToken;
    this._loadingRepos = true;
    try {
      const params = new URLSearchParams({ installationId });
      if (opts.q) params.set("q", opts.q);
      const res = await fetch(`${this.apiBase}/repos?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      // Ignore stale responses (user typed another key while we were
      // fetching). The newer request will take over.
      if (token !== this.#searchToken) return;
      if (res.status === 410) {
        // Installation was uninstalled on GitHub — drop it from UI.
        this._installations = this._installations.filter(
          (i) => i.installationId !== installationId,
        );
        this._selectedOwner = null;
        this._repos = [];
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ReposResponse;
      this._repos = data.repos;
      this._totalCount = data.totalCount;
      this._hasMore = data.hasMore;
      this._nextPage = data.nextPage;
      this._reposMode = data.mode;
    } catch (err) {
      if (token === this.#searchToken) {
        this._error = err instanceof Error ? err.message : String(err);
      }
    } finally {
      if (token === this.#searchToken) {
        this._loadingRepos = false;
      }
    }
  }

  async #classify(installationId: string, repo: string) {
    this._classifying = true;
    this._classification = null;
    this._confirmText = "";
    try {
      const res = await fetch(`${this.apiBase}/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ installationId, repo }),
      });
      const data = (await res.json()) as {
        classification?: Classification;
        error?: string;
      };
      if (!res.ok || !data.classification) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      this._classification = data.classification;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._classifying = false;
    }
  }

  async #connect() {
    if (!this._selectedOwner || !this._selectedRepo || !this._classification) {
      return;
    }
    this._connecting = true;
    this._error = null;
    try {
      const needsConfirm =
        this._classification.kind === "foreign" ||
        this._classification.kind === "owned-by-other-site";
      const res = await fetch(this.connectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          installationId: this._selectedOwner.installationId,
          repo: this._selectedRepo.fullName,
          confirmForeign: needsConfirm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      window.location.href = data.redirect ?? this.cancelUrl;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      this._connecting = false;
    }
  }

  async #createRepo() {
    if (!this._selectedOwner) return;
    const name = this._createName.trim();
    if (!name) return;
    this._creating = true;
    this._createError = null;
    try {
      const res = await fetch(`${this.apiBase}/create-repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          installationId: this._selectedOwner.installationId,
          name,
          private: this._createPrivate,
          description: this._createDescription.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        repo?: RepoRow;
        error?: string;
      };
      if (!res.ok || !data.repo) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const created = data.repo;
      // Prepend to list, select, classify.
      this._repos = [
        created,
        ...this._repos.filter((r) => r.fullName !== created.fullName),
      ];
      this._showCreate = false;
      this._createName = "";
      this._createDescription = "";
      this.#selectRepo(created);
    } catch (err) {
      this._createError = err instanceof Error ? err.message : String(err);
    } finally {
      this._creating = false;
    }
  }

  // -------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------

  #selectOwner(installation: Installation) {
    if (this._selectedOwner?.installationId === installation.installationId) {
      this._ownerOpen = false;
      return;
    }
    this._selectedOwner = installation;
    this._ownerOpen = false;
    this._selectedRepo = null;
    this._classification = null;
    this._confirmText = "";
    this._repoSearch = "";
    void this.#loadRepos(installation.installationId);
  }

  #selectRepo(repo: RepoRow) {
    this._selectedRepo = repo;
    this._repoOpen = false;
    this._repoSearch = "";
    if (this._selectedOwner) {
      void this.#classify(this._selectedOwner.installationId, repo.fullName);
    }
  }

  #onRepoSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this._repoSearch = value;
    if (this.#searchTimer) clearTimeout(this.#searchTimer);
    if (!this._selectedOwner) return;
    const trimmed = value.trim();

    // Below the min-char threshold, keep the already-loaded first page
    // and filter locally. Past it, debounce into a server-side search.
    if (trimmed.length < SEARCH_MIN_CHARS) {
      if (this._reposMode === "search") {
        void this.#loadRepos(this._selectedOwner.installationId);
      }
      return;
    }
    this.#searchTimer = setTimeout(() => {
      if (!this._selectedOwner) return;
      void this.#loadRepos(this._selectedOwner.installationId, { q: trimmed });
    }, SEARCH_DEBOUNCE_MS);
  }

  #filteredRepos(): RepoRow[] {
    const q = this._repoSearch.trim().toLowerCase();
    if (!q || this._reposMode === "search") return this._repos;
    return this._repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q),
    );
  }

  #handleOutsideClick = (e: MouseEvent) => {
    if (!this._ownerOpen && !this._repoOpen) return;
    const target = e.target as Node;
    const ownerWrap = this.querySelector(".repo-picker-owner");
    const repoWrap = this.querySelector(".repo-picker-repo");
    if (ownerWrap && !ownerWrap.contains(target)) this._ownerOpen = false;
    if (repoWrap && !repoWrap.contains(target)) this._repoOpen = false;
  };

  #handleEscape = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (this._showCreate) {
      this._showCreate = false;
      return;
    }
    if (this._ownerOpen || this._repoOpen) {
      this._ownerOpen = false;
      this._repoOpen = false;
    }
  };

  #toggleOwner() {
    this._ownerOpen = !this._ownerOpen;
    this._repoOpen = false;
  }

  #toggleRepo() {
    if (!this._selectedOwner) return;
    this._repoOpen = !this._repoOpen;
    this._ownerOpen = false;
    if (this._repoOpen) {
      queueMicrotask(() => {
        const input = this.querySelector<HTMLInputElement>(
          ".repo-picker-repo-search",
        );
        input?.focus();
      });
    }
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  render() {
    return html`
      <div class="flex flex-col gap-6 max-w-form">
        <div>
          <h2 class="text-lg font-medium mb-1">${this.labels.pageTitle}</h2>
          <p class="text-sm text-muted-foreground">
            ${this.labels.pageSubtitle}
          </p>
        </div>

        ${this.#renderOwner()} ${this.#renderRepo()}
        ${this.#renderClassification()} ${this.#renderActions()}
        ${this._error
          ? html`<div class="alert alert-destructive text-sm">
              ${this._error}
            </div>`
          : nothing}
        ${this._showCreate ? this.#renderCreateDialog() : nothing}
      </div>
    `;
  }

  #renderOwner() {
    const selected = this._selectedOwner;
    return html`
      <div class="field repo-picker-owner relative">
        <label class="label">${this.labels.ownerLabel}</label>
        <button
          type="button"
          class="input flex items-center justify-between w-full text-left"
          @click=${() => this.#toggleOwner()}
          aria-haspopup="listbox"
          aria-expanded=${this._ownerOpen}
        >
          <span class="flex items-center gap-2 truncate">
            ${selected
              ? html`
                  ${selected.account.avatarUrl
                    ? html`<img
                        src=${selected.account.avatarUrl}
                        alt=""
                        class="w-5 h-5 rounded-full"
                        loading="lazy"
                      />`
                    : nothing}
                  <span class="truncate">${selected.account.login}</span>
                `
              : html`<span class="text-muted-foreground"
                  >${this._installations.length === 0
                    ? this.labels.ownerEmpty
                    : this.labels.ownerPlaceholder}</span
                >`}
          </span>
          <span class="text-muted-foreground">▾</span>
        </button>
        ${this._ownerOpen ? this.#renderOwnerMenu() : nothing}
      </div>
    `;
  }

  #renderOwnerMenu() {
    return html`
      <div
        class="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg"
        role="listbox"
      >
        <ul class="max-h-64 overflow-y-auto py-1">
          ${this._installations.map(
            (inst) => html`
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  @click=${() => this.#selectOwner(inst)}
                  role="option"
                  aria-selected=${this._selectedOwner?.installationId ===
                  inst.installationId}
                >
                  ${inst.account.avatarUrl
                    ? html`<img
                        src=${inst.account.avatarUrl}
                        alt=""
                        class="w-5 h-5 rounded-full"
                        loading="lazy"
                      />`
                    : nothing}
                  <span class="truncate">${inst.account.login}</span>
                  <span class="ml-auto text-xs text-muted-foreground">
                    ${inst.account.type === "Organization" ? "Org" : ""}
                  </span>
                </button>
              </li>
            `,
          )}
          ${this.installUrl
            ? html`
                <li class="border-t mt-1 pt-1">
                  <a
                    href=${this.installUrl}
                    class="block px-3 py-2 text-sm text-primary hover:bg-muted"
                  >
                    ${this.labels.installAnother}
                  </a>
                </li>
              `
            : nothing}
        </ul>
      </div>
    `;
  }

  #renderRepo() {
    const selected = this._selectedRepo;
    const disabled = !this._selectedOwner;
    return html`
      <div class="field repo-picker-repo relative">
        <label class="label">${this.labels.repositoryLabel}</label>
        <button
          type="button"
          class="input flex items-center justify-between w-full text-left ${disabled
            ? "opacity-60 cursor-not-allowed"
            : ""}"
          @click=${() => this.#toggleRepo()}
          aria-haspopup="listbox"
          aria-expanded=${this._repoOpen}
          ?disabled=${disabled}
        >
          <span class="truncate">
            ${selected
              ? html`<span>${selected.name}</span> ${selected.private
                    ? html`<span class="text-xs text-muted-foreground ml-1"
                        >${this.labels.privateBadge}</span
                      >`
                    : nothing}`
              : html`<span class="text-muted-foreground"
                  >${disabled
                    ? this.labels.repoPlaceholderNoOwner
                    : this.labels.repoPlaceholder}</span
                >`}
          </span>
          <span class="text-muted-foreground">▾</span>
        </button>
        ${this._repoOpen ? this.#renderRepoMenu() : nothing}
      </div>
    `;
  }

  #renderRepoMenu() {
    const items = this.#filteredRepos();
    return html`
      <div
        class="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg"
      >
        <div class="p-2 border-b">
          <input
            type="text"
            class="input repo-picker-repo-search w-full"
            placeholder=${this.labels.repoSearchPlaceholder}
            .value=${this._repoSearch}
            @input=${(e: Event) => this.#onRepoSearchInput(e)}
          />
          ${this._hasMore && this._reposMode === "list"
            ? html`<p class="mt-1 text-xs text-muted-foreground">
                ${this.labels.repoShowingOf
                  .replace("{shown}", String(this._repos.length))
                  .replace("{total}", String(this._totalCount))}
                — ${this.labels.repoSearchHint}
              </p>`
            : nothing}
        </div>
        <ul class="max-h-64 overflow-y-auto py-1" role="listbox">
          ${this._loadingRepos
            ? html`<li class="px-3 py-2 text-sm text-muted-foreground">
                ${this.labels.repoLoading}
              </li>`
            : items.length === 0
              ? html`<li class="px-3 py-2 text-sm text-muted-foreground">
                  ${this.labels.repoEmpty}
                </li>`
              : items.map(
                  (r) => html`
                    <li>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                        @click=${() => this.#selectRepo(r)}
                        role="option"
                        aria-selected=${this._selectedRepo?.fullName ===
                        r.fullName}
                      >
                        <span class="truncate">${r.name}</span>
                        ${r.private
                          ? html`<span
                              class="ml-auto text-xs text-muted-foreground"
                              >${this.labels.privateBadge}</span
                            >`
                          : nothing}
                      </button>
                    </li>
                  `,
                )}
        </ul>
        ${this.#canCreateRepo()
          ? html`
              <div class="border-t p-1">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                  @click=${() => {
                    this._showCreate = true;
                    this._repoOpen = false;
                    this._createName = this._repoSearch.trim();
                    queueMicrotask(() => {
                      this.querySelector<HTMLInputElement>(
                        ".repo-picker-create-name",
                      )?.focus();
                    });
                  }}
                >
                  ${this.labels.createNewRepo}
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #canCreateRepo(): boolean {
    // Create is only supported for Organization accounts (see github-app.ts
    // comment — user accounts require user-OAuth, which we don't carry).
    return this._selectedOwner?.account.type === "Organization";
  }

  #renderClassification() {
    if (this._classifying) {
      return html`<p class="text-sm text-muted-foreground">
        ${this.labels.classifyLoading}
      </p>`;
    }
    if (!this._classification || !this._selectedRepo) return nothing;
    const c = this._classification;
    if (c.kind === "empty") {
      return html`<p class="text-sm text-muted-foreground">
        ${this.labels.classificationEmpty}
      </p>`;
    }
    if (c.kind === "owned") {
      return html`<p class="text-sm text-muted-foreground">
        ${this.labels.classificationOwned}
      </p>`;
    }
    if (c.kind === "owned-by-other-site") {
      return html`<div class="alert alert-destructive text-sm">
        ${this.labels.classificationOwnedByOther.replace(
          "{host}",
          c.marker.site_host,
        )}
      </div>`;
    }
    // foreign — show confirm input
    const full = this._selectedRepo.fullName;
    return html`
      <div class="alert alert-warning flex flex-col gap-3 text-sm">
        <div>
          <strong class="block mb-1">${this.labels.confirmHeading}</strong>
          <span>${this.labels.confirmBody.replace("{repo}", full)}</span>
        </div>
        <div class="field">
          <label class="label text-xs">
            ${this.labels.confirmInputLabel.replace("{repo}", full)}
          </label>
          <input
            type="text"
            class="input w-full"
            placeholder=${this.labels.confirmInputPlaceholder}
            .value=${this._confirmText}
            @input=${(e: Event) => {
              this._confirmText = (e.target as HTMLInputElement).value;
            }}
            autocomplete="off"
            spellcheck="false"
          />
        </div>
      </div>
    `;
  }

  #canConnect(): boolean {
    if (
      !this._selectedRepo ||
      !this._classification ||
      this._classifying ||
      this._connecting
    ) {
      return false;
    }
    const c = this._classification;
    if (c.kind === "owned-by-other-site") return false;
    if (c.kind === "foreign") {
      return this._confirmText.trim() === this._selectedRepo.fullName;
    }
    return true;
  }

  #renderActions() {
    return html`
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn"
          ?disabled=${!this.#canConnect()}
          @click=${() => this.#connect()}
        >
          ${this._connecting ? this.labels.connecting : this.labels.connect}
        </button>
        <a href=${this.cancelUrl} class="btn-ghost">${this.labels.cancel}</a>
      </div>
    `;
  }

  #renderCreateDialog() {
    return html`
      <div
        class="fixed inset-0 z-20 flex items-center justify-center bg-black/40"
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this._showCreate = false;
        }}
      >
        <div
          class="w-full max-w-md rounded-lg bg-background p-6 shadow-xl flex flex-col gap-4"
        >
          <h3 class="text-lg font-medium">
            ${this.labels.createNewDialogTitle}
          </h3>
          <div class="field">
            <label class="label">${this.labels.createNewNameLabel}</label>
            <input
              type="text"
              class="input repo-picker-create-name"
              .value=${this._createName}
              @input=${(e: Event) => {
                this._createName = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter" && this._createName.trim()) {
                  void this.#createRepo();
                }
              }}
              placeholder="my-site-backup"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="text-xs text-muted-foreground mt-1">
              ${this.labels.createNewNameHelp}
            </p>
          </div>
          <div class="field">
            <label class="label"
              >${this.labels.createNewDescriptionLabel}</label
            >
            <input
              type="text"
              class="input"
              .value=${this._createDescription}
              @input=${(e: Event) => {
                this._createDescription = (e.target as HTMLInputElement).value;
              }}
              autocomplete="off"
            />
          </div>
          <div class="field">
            <label class="label">${this.labels.createNewVisibilityLabel}</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  ?checked=${this._createPrivate}
                  @change=${() => {
                    this._createPrivate = true;
                  }}
                />
                ${this.labels.createNewVisibilityPrivate}
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  ?checked=${!this._createPrivate}
                  @change=${() => {
                    this._createPrivate = false;
                  }}
                />
                ${this.labels.createNewVisibilityPublic}
              </label>
            </div>
          </div>
          ${this._createError
            ? html`<div class="alert alert-destructive text-sm">
                ${this._createError}
              </div>`
            : nothing}
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="btn-ghost"
              @click=${() => {
                this._showCreate = false;
              }}
            >
              ${this.labels.createNewCancel}
            </button>
            <button
              type="button"
              class="btn"
              ?disabled=${this._creating || !this._createName.trim()}
              @click=${() => this.#createRepo()}
            >
              ${this._creating
                ? this.labels.connecting
                : this.labels.createNewSubmit}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("jant-repo-picker", JantRepoPicker);
