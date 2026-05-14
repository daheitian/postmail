// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __testOnly,
  hideSlashCommandHint,
  markSlashCommandDiscovered,
  scheduleSlashCommandHint,
} from "../slash-discovery.js";

function createEditorHost(discovered = false): HTMLElement {
  document.body.innerHTML = `
    <jant-compose-editor data-slash-command-discovered="${discovered ? "true" : "false"}">
      <div class="compose-tiptap-body"></div>
      <span class="compose-slash-discovery-hint" aria-hidden="true">Type / for commands</span>
    </jant-compose-editor>
  `;

  return document.querySelector<HTMLElement>(
    "jant-compose-editor",
  ) as HTMLElement;
}

describe("slash discovery", () => {
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

  it("shows the hint after the delay and records one exposure per page", () => {
    const host = createEditorHost();

    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);

    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      true,
    );
    expect(__testOnly.readState()).toMatchObject({
      shownCount: 1,
      completed: false,
    });

    // No auto-fade — the hint stays visible until something explicitly hides it.
    vi.advanceTimersByTime(5000);
    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      true,
    );

    hideSlashCommandHint(host);
    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      false,
    );

    // Refocusing during the same page load shows the hint again
    // without bumping the persisted shownCount.
    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);

    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      true,
    );
    expect(__testOnly.readState().shownCount).toBe(1);
  });

  it("hides the hint immediately when called", () => {
    const host = createEditorHost();

    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);
    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      true,
    );

    hideSlashCommandHint(host);
    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      false,
    );
  });

  it("does not show the hint after the local max has been reached", () => {
    const host = createEditorHost();
    globalThis.localStorage.setItem(
      __testOnly.SLASH_DISCOVERY_STORAGE_KEY,
      JSON.stringify({
        shownCount: __testOnly.SLASH_HINT_MAX_SHOW_COUNT,
        completed: false,
      }),
    );

    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);

    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      false,
    );
  });

  it("does not show the hint when the DB flag is already set", () => {
    const host = createEditorHost(true);

    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);

    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      false,
    );
  });

  it("does not show the hint on mobile widths", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    const host = createEditorHost();

    scheduleSlashCommandHint(host);
    vi.advanceTimersByTime(__testOnly.SLASH_HINT_DELAY_MS);

    expect(host.classList.contains(__testOnly.SLASH_HINT_VISIBLE_CLASS)).toBe(
      false,
    );
  });

  it("marks the slash command as completed locally and syncs to the server", async () => {
    const host = createEditorHost();

    markSlashCommandDiscovered();
    await Promise.resolve();

    expect(__testOnly.readState()).toMatchObject({
      shownCount: __testOnly.SLASH_HINT_MAX_SHOW_COUNT,
      completed: true,
    });
    expect(host.dataset.slashCommandDiscovered).toBe("true");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      __testOnly.SLASH_DISCOVERY_API_PATH,
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
  });
});
