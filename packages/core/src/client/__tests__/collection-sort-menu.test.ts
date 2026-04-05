// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import { initCollectionSortMenus } from "../collection-sort-menu.js";

function renderMenu() {
  document.body.innerHTML = `
    <div class="collection-sort-menu">
      <button
        type="button"
        class="collection-sort-trigger"
        aria-expanded="false"
        aria-controls="collection-sort-popover"
      >
        Sort
      </button>
      <div
        id="collection-sort-popover"
        class="collection-sort-popover"
        data-popover
        aria-hidden="true"
      >
        <div data-collection-sort-options>
          <a href="/test">Newest first</a>
          <a href="/test?sort=oldest">Oldest first</a>
        </div>
      </div>
    </div>
  `;

  initCollectionSortMenus();

  const trigger = document.querySelector<HTMLButtonElement>(
    ".collection-sort-trigger",
  );
  const popover = document.querySelector<HTMLElement>("[data-popover]");
  const firstLink = document.querySelector<HTMLAnchorElement>("a[href]");

  if (!(trigger instanceof HTMLButtonElement) || !popover || !firstLink) {
    throw new Error("Expected collection sort menu markup");
  }

  return { trigger, popover, firstLink };
}

describe("collection sort menu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("closes when clicking outside the menu", () => {
    const { trigger, popover } = renderMenu();

    trigger.click();
    expect(popover.getAttribute("aria-hidden")).toBe("false");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(popover.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const { trigger, popover, firstLink } = renderMenu();

    trigger.click();
    firstLink.focus();

    popover.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", { key: "Escape" }),
    );

    expect(popover.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
