// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __testOnly,
  initComposeOpenShortcutDiscovery,
  markComposeOpenShortcutDiscovered,
} from "../compose-discovery.js";

function createPrompt(discovered = false): HTMLElement {
  document.body.innerHTML = `
    <div class="compose-prompt" data-compose-open-shortcut-discovered="${discovered ? "true" : "false"}">
      <button type="button" class="compose-prompt-trigger">Write</button>
      <span class="compose-prompt-discovery-hint" aria-hidden="true">Press N to write</span>
    </div>
  `;

  return document.querySelector<HTMLElement>(".compose-prompt") as HTMLElement;
}

describe("compose discovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    globalThis.localStorage.clear();
    __testOnly.reset();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the hover hint on repeated hovers but records one page exposure", () => {
    const prompt = createPrompt();
    initComposeOpenShortcutDiscovery();

    const trigger = prompt.querySelector<HTMLElement>(
      ".compose-prompt-trigger",
    );
    trigger?.dispatchEvent(new Event("pointerenter"));

    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);

    expect(
      prompt.classList.contains(__testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS),
    ).toBe(true);
    expect(__testOnly.readComposeOpenShortcutDiscoveryState()).toMatchObject({
      shownCount: 1,
      completed: false,
    });

    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_VISIBLE_MS);

    expect(
      prompt.classList.contains(__testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS),
    ).toBe(false);

    trigger?.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);

    expect(
      prompt.classList.contains(__testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS),
    ).toBe(true);
    expect(__testOnly.readComposeOpenShortcutDiscoveryState().shownCount).toBe(
      1,
    );
  });

  it("keeps showing on the same page even if the first hover reaches the max", () => {
    const prompt = createPrompt();
    globalThis.localStorage.setItem(
      __testOnly.COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
      JSON.stringify({
        shownCount: __testOnly.COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT - 1,
        completed: false,
      }),
    );

    initComposeOpenShortcutDiscovery();

    const trigger = prompt.querySelector<HTMLElement>(
      ".compose-prompt-trigger",
    );
    trigger?.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);

    expect(
      prompt.classList.contains(__testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS),
    ).toBe(true);
    expect(__testOnly.readComposeOpenShortcutDiscoveryState().shownCount).toBe(
      __testOnly.COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
    );

    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_VISIBLE_MS);

    trigger?.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);

    expect(
      prompt.classList.contains(__testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS),
    ).toBe(true);
    expect(__testOnly.readComposeOpenShortcutDiscoveryState().shownCount).toBe(
      __testOnly.COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
    );
  });

  it("does not show the hint after the local max has been reached", () => {
    createPrompt();
    globalThis.localStorage.setItem(
      __testOnly.COMPOSE_OPEN_SHORTCUT_DISCOVERY_STORAGE_KEY,
      JSON.stringify({
        shownCount: __testOnly.COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
        completed: false,
      }),
    );

    initComposeOpenShortcutDiscovery();

    const trigger = document.querySelector<HTMLElement>(
      ".compose-prompt-trigger",
    );
    const prompt = document.querySelector<HTMLElement>(".compose-prompt");
    trigger?.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(__testOnly.COMPOSE_OPEN_SHORTCUT_HINT_DELAY_MS);

    expect(
      prompt?.classList.contains(
        __testOnly.COMPOSE_OPEN_SHORTCUT_VISIBLE_CLASS,
      ),
    ).toBe(false);
  });

  it("marks the shortcut as completed locally and syncs it to the server", async () => {
    const prompt = createPrompt();

    markComposeOpenShortcutDiscovered();
    await Promise.resolve();

    expect(__testOnly.readComposeOpenShortcutDiscoveryState()).toMatchObject({
      shownCount: __testOnly.COMPOSE_OPEN_SHORTCUT_MAX_SHOW_COUNT,
      completed: true,
    });
    expect(prompt.dataset.composeOpenShortcutDiscovered).toBe("true");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      __testOnly.COMPOSE_OPEN_SHORTCUT_DISCOVERY_API_PATH,
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
  });
});
