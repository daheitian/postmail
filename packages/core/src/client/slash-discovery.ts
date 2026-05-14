/**
 * Slash Command Discovery
 *
 * Surfaces a small "Type / for commands" hint over the TipTap compose editor on
 * first focus. Mirrors the compose-open-shortcut pattern:
 *  - localStorage tracks shownCount + completed for fast read on subsequent visits
 *  - DB (synced once via POST) is the durable cross-device "user has used this" flag
 *  - The DB flag is hydrated server-side onto the editor host as
 *    `data-slash-command-discovered="true"`
 */

const SLASH_DISCOVERY_STORAGE_KEY = "jant.slashCommandDiscovery";
const SLASH_DISCOVERY_API_PATH = "/api/settings/discovery/slash-command";
const SLASH_HINT_DELAY_MS = 600;
const SLASH_HINT_MAX_SHOW_COUNT = 3;
const SLASH_HINT_VISIBLE_CLASS = "compose-slash-discovery-visible";

interface SlashDiscoveryState {
  shownCount: number;
  completed: boolean;
}

let exposureRecordedThisSession = false;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let activeHost: HTMLElement | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof globalThis.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readState(): SlashDiscoveryState {
  if (!canUseLocalStorage()) {
    return { shownCount: 0, completed: false };
  }

  const raw = globalThis.localStorage.getItem(SLASH_DISCOVERY_STORAGE_KEY);
  if (!raw) {
    return { shownCount: 0, completed: false };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SlashDiscoveryState>;
    return {
      shownCount:
        typeof parsed.shownCount === "number" && parsed.shownCount >= 0
          ? parsed.shownCount
          : 0,
      completed: parsed.completed === true,
    };
  } catch {
    globalThis.localStorage.removeItem(SLASH_DISCOVERY_STORAGE_KEY);
    return { shownCount: 0, completed: false };
  }
}

function writeState(state: SlashDiscoveryState): void {
  if (!canUseLocalStorage()) return;

  try {
    globalThis.localStorage.setItem(
      SLASH_DISCOVERY_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Storage unavailable — skip persistence for this page load.
  }
}

function clearShowTimer() {
  if (showTimer !== null) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function isDesktopEligible(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(min-width: 700px)").matches
  );
}

function isCompletedOnHost(host: HTMLElement): boolean {
  if (readState().completed) return true;
  return host.dataset.slashCommandDiscovered === "true";
}

function markHostsCompleted() {
  document
    .querySelectorAll<HTMLElement>("jant-compose-editor")
    .forEach((host) => {
      host.dataset.slashCommandDiscovered = "true";
      host.classList.remove(SLASH_HINT_VISIBLE_CLASS);
    });
}

function recordExposure(): void {
  const state = readState();
  if (state.completed || exposureRecordedThisSession) return;
  if (state.shownCount >= SLASH_HINT_MAX_SHOW_COUNT) return;

  exposureRecordedThisSession = true;
  writeState({ ...state, shownCount: state.shownCount + 1 });
}

function canShowHint(host: HTMLElement): boolean {
  if (!isDesktopEligible()) return false;
  if (isCompletedOnHost(host)) return false;

  const state = readState();
  return (
    state.shownCount < SLASH_HINT_MAX_SHOW_COUNT || exposureRecordedThisSession
  );
}

export function hideSlashCommandHint(host?: HTMLElement | null): void {
  clearShowTimer();

  if (host) {
    host.classList.remove(SLASH_HINT_VISIBLE_CLASS);
  } else if (activeHost) {
    activeHost.classList.remove(SLASH_HINT_VISIBLE_CLASS);
  }

  if (!host || host === activeHost) {
    activeHost = null;
  }
}

function showHint(host: HTMLElement): void {
  if (!canShowHint(host)) return;

  hideSlashCommandHint(activeHost);
  activeHost = host;
  host.classList.add(SLASH_HINT_VISIBLE_CLASS);
  recordExposure();
}

export function scheduleSlashCommandHint(host: HTMLElement): void {
  if (!canShowHint(host)) return;
  if (host.classList.contains(SLASH_HINT_VISIBLE_CLASS)) return;

  clearShowTimer();
  showTimer = setTimeout(() => {
    showHint(host);
  }, SLASH_HINT_DELAY_MS);
}

export function markSlashCommandDiscovered(): void {
  const state = readState();
  if (!state.completed) {
    writeState({
      shownCount: Math.max(state.shownCount, SLASH_HINT_MAX_SHOW_COUNT),
      completed: true,
    });
  }

  markHostsCompleted();
  hideSlashCommandHint(activeHost);

  if (typeof globalThis.fetch === "function") {
    void globalThis
      .fetch(SLASH_DISCOVERY_API_PATH, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
      .catch(() => {
        // Keep the local completed state even if the sync request fails.
      });
  }
}

/**
 * Initialize once on DOMContentLoaded. The actual scheduling is driven by
 * the compose editor on focus, so this is a no-op placeholder kept for parity
 * with `compose-discovery-bridge` (and to give future call sites a hook).
 */
export function initSlashCommandDiscovery(): void {
  // Intentionally empty — the editor host calls scheduleSlashCommandHint /
  // hideSlashCommandHint directly on focus / update.
}

export const __testOnly = {
  SLASH_DISCOVERY_API_PATH,
  SLASH_DISCOVERY_STORAGE_KEY,
  SLASH_HINT_DELAY_MS,
  SLASH_HINT_MAX_SHOW_COUNT,
  SLASH_HINT_VISIBLE_CLASS,
  readState,
  reset() {
    exposureRecordedThisSession = false;
    clearShowTimer();
    activeHost = null;
  },
};
