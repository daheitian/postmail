const COMPOSE_PROMPT_SELECTOR = ".compose-prompt";
const COMPOSE_PROMPT_TRIGGER_SELECTOR = ".compose-prompt-trigger";
const COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY =
  "jant.composeOpenShortcutDiscovery";
const COMPOSE_OPEN_SHORTCUT_DISCOVERY_API_PATH =
  "/api/settings/discovery/compose-open-shortcut";
const COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS = 350;
const COMPOSE_OPEN_SHORTCUT_HINT_VISIBLE_MS = 1800;
const COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT = 3;
const COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS = "compose-prompt-discovery-visible";

interface ComposeOpenShortcutDiscoveryState {
  shownCount: number;
  completed: boolean;
}

let composeOpenShortcutExposureRecordedThisSession = false;
let composeOpenShortcutShowTimer: ReturnType<typeof setTimeout> | null = null;
let composeOpenShortcutHideTimer: ReturnType<typeof setTimeout> | null = null;
let activeComposePrompt: HTMLElement | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof globalThis.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readComposeOpenShortcutDiscoveryState(): ComposeOpenShortcutDiscoveryState {
  if (!canUseLocalStorage()) {
    return { shownCount: 0, completed: false };
  }

  const raw = globalThis.localStorage.getItem(
    COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
  );
  if (!raw) {
    return { shownCount: 0, completed: false };
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<ComposeOpenShortcutDiscoveryState>;
    return {
      shownCount:
        typeof parsed.shownCount === "number" && parsed.shownCount >= 0
          ? parsed.shownCount
          : 0,
      completed: parsed.completed === true,
    };
  } catch {
    globalThis.localStorage.removeItem(
      COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
    );
    return { shownCount: 0, completed: false };
  }
}

function writeComposeOpenShortcutDiscoveryState(
  state: ComposeOpenShortcutDiscoveryState,
): void {
  if (!canUseLocalStorage()) return;

  try {
    globalThis.localStorage.setItem(
      COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Storage unavailable — skip persistence for this page load.
  }
}

function clearComposeOpenShortcutShowTimer() {
  if (composeOpenShortcutShowTimer !== null) {
    clearTimeout(composeOpenShortcutShowTimer);
    composeOpenShortcutShowTimer = null;
  }
}

function clearComposeOpenShortcutHideTimer() {
  if (composeOpenShortcutHideTimer !== null) {
    clearTimeout(composeOpenShortcutHideTimer);
    composeOpenShortcutHideTimer = null;
  }
}

function isComposePromptDesktopEligible(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(min-width: 700px)").matches
  );
}

function isComposeOpenShortcutCompleted(prompt?: HTMLElement | null): boolean {
  if (readComposeOpenShortcutDiscoveryState().completed) return true;
  return prompt?.dataset.composeOpenShortcutDiscovered === "true";
}

function markComposePromptCompleted(prompt?: HTMLElement | null) {
  if (prompt) {
    prompt.dataset.composeOpenShortcutDiscovered = "true";
    prompt.classList.remove(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS);
  }

  document
    .querySelectorAll<HTMLElement>(COMPOSE_PROMPT_SELECTOR)
    .forEach((composePrompt) => {
      composePrompt.dataset.composeOpenShortcutDiscovered = "true";
      composePrompt.classList.remove(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS);
    });
}

function recordComposeOpenShortcutHintShown(): void {
  const state = readComposeOpenShortcutDiscoveryState();
  if (state.completed || composeOpenShortcutExposureRecordedThisSession) return;
  if (state.shownCount >= COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT) return;

  composeOpenShortcutExposureRecordedThisSession = true;
  writeComposeOpenShortcutDiscoveryState({
    ...state,
    shownCount: state.shownCount + 1,
  });
}

function canShowComposeOpenShortcutHint(prompt: HTMLElement): boolean {
  if (!isComposePromptDesktopEligible()) return false;
  if (isComposeOpenShortcutCompleted(prompt)) return false;

  const state = readComposeOpenShortcutDiscoveryState();
  return (
    state.shownCount < COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT ||
    composeOpenShortcutExposureRecordedThisSession
  );
}

function hideComposeOpenShortcutHint(prompt?: HTMLElement | null): void {
  clearComposeOpenShortcutShowTimer();
  clearComposeOpenShortcutHideTimer();

  if (prompt) {
    prompt.classList.remove(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS);
  } else if (activeComposePrompt) {
    activeComposePrompt.classList.remove(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS);
  }

  if (!prompt || prompt === activeComposePrompt) {
    activeComposePrompt = null;
  }
}

function showComposeOpenShortcutHint(prompt: HTMLElement): void {
  if (!canShowComposeOpenShortcutHint(prompt)) return;

  hideComposeOpenShortcutHint(activeComposePrompt);
  activeComposePrompt = prompt;
  prompt.classList.add(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS);
  recordComposeOpenShortcutHintShown();

  composeOpenShortcutHideTimer = setTimeout(() => {
    hideComposeOpenShortcutHint(prompt);
  }, COMPOSE_OPEN_SHORTCUT_HINT_VISIBLE_MS);
}

function scheduleComposeOpenShortcutHint(prompt: HTMLElement): void {
  if (!canShowComposeOpenShortcutHint(prompt)) return;
  if (prompt.classList.contains(COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS)) return;

  clearComposeOpenShortcutShowTimer();
  composeOpenShortcutShowTimer = setTimeout(() => {
    showComposeOpenShortcutHint(prompt);
  }, COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);
}

function bindComposePromptDiscovery(prompt: HTMLElement): void {
  if (prompt.dataset.composeOpenShortcutDiscoveryBound === "true") return;

  const trigger = prompt.querySelector<HTMLElement>(
    COMPOSE_PROMPT_TRIGGER_SELECTOR,
  );
  if (!trigger) return;

  prompt.dataset.composeOpenShortcutDiscoveryBound = "true";

  trigger.addEventListener("pointerenter", () => {
    scheduleComposeOpenShortcutHint(prompt);
  });

  trigger.addEventListener("pointerleave", () => {
    hideComposeOpenShortcutHint(prompt);
  });

  trigger.addEventListener("focusin", () => {
    scheduleComposeOpenShortcutHint(prompt);
  });

  trigger.addEventListener("focusout", () => {
    hideComposeOpenShortcutHint(prompt);
  });
}

export function initComposeOpenShortcutDiscovery(
  root: globalThis.ParentNode = document,
): void {
  root
    .querySelectorAll<HTMLElement>(COMPOSE_PROMPT_SELECTOR)
    .forEach((prompt) => bindComposePromptDiscovery(prompt));
}

export function markComposeOpenShortcutDiscovered(): void {
  const state = readComposeOpenShortcutDiscoveryState();
  if (!state.completed) {
    writeComposeOpenShortcutDiscoveryState({
      shownCount: Math.max(
        state.shownCount,
        COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
      ),
      completed: true,
    });
  }

  markComposePromptCompleted(activeComposePrompt);
  hideComposeOpenShortcutHint(activeComposePrompt);

  if (typeof globalThis.fetch === "function") {
    void globalThis
      .fetch(COMPOSE_OPEN_SHORTCUT_DISCOVERY_API_PATH, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
      .catch(() => {
        // Keep the local completed state even if the sync request fails.
      });
  }
}

export const __testOnly = {
  COMPOSE_OPEN_SHORTCUT_DISCOVERY_API_PATH,
  COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
  COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS,
  COMPOSE_OPEN_SHORTCUT_HINT_VISIBLE_MS,
  COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
  COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS,
  readComposeOpenShortcutDiscoveryState,
  reset() {
    composeOpenShortcutExposureRecordedThisSession = false;
    clearComposeOpenShortcutShowTimer();
    clearComposeOpenShortcutHideTimer();
    activeComposePrompt = null;
  },
};
