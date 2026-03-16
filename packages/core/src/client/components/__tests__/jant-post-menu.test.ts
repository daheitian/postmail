// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import "../jant-post-menu.js";
import type { JantPostMenu } from "../jant-post-menu.js";

function requireElement<T extends globalThis.Element>(
  element: T | null,
  message: string,
): T {
  if (!element) {
    throw new Error(message);
  }
  return element;
}

function click(element: globalThis.Element) {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, composed: true }),
  );
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

async function createMenu(): Promise<{
  menu: JantPostMenu;
  trigger: HTMLButtonElement;
}> {
  document.body.innerHTML = `
    <article
      data-post
      data-post-id="post-1"
      data-post-permalink="/post-1"
      data-post-visibility="unlisted"
    >
      <button
        type="button"
        data-post-menu-trigger
        aria-expanded="false"
      >
        More actions
      </button>
    </article>
  `;

  const menu = document.createElement("jant-post-menu") as JantPostMenu;
  document.body.appendChild(menu);
  await menu.updateComplete;

  const trigger = requireElement(
    document.querySelector<HTMLButtonElement>("[data-post-menu-trigger]"),
    "expected post menu trigger",
  );

  return { menu, trigger };
}

describe("JantPostMenu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setViewport(1024, 768);
  });

  it("moves visibility controls into a submenu", async () => {
    const { menu, trigger } = await createMenu();

    click(trigger);
    await menu.updateComplete;

    const visibilityButton = requireElement(
      menu.querySelector<HTMLElement>("[data-post-menu-open-visibility]"),
      "expected visibility button in main menu",
    );
    expect(visibilityButton.textContent).toContain("Visibility");
    expect(menu.textContent).not.toContain("Make Unlisted");

    click(visibilityButton);
    await menu.updateComplete;

    expect(menu.querySelector("[data-visibility-panel]")).not.toBeNull();
    expect(menu.textContent).toContain("Public");
    expect(menu.textContent).toContain("Unlisted");
    expect(menu.textContent).toContain("Private");
  });

  it("returns to the main menu before closing on Escape", async () => {
    const { menu, trigger } = await createMenu();

    click(trigger);
    await menu.updateComplete;
    click(
      requireElement(
        menu.querySelector<HTMLElement>("[data-post-menu-open-visibility]"),
        "expected visibility button in main menu",
      ),
    );
    await menu.updateComplete;

    document.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Escape",
      }),
    );
    await menu.updateComplete;

    expect(menu.querySelector("[data-visibility-panel]")).toBeNull();
    expect(
      menu.querySelector("[data-post-menu-open-visibility]"),
    ).not.toBeNull();

    document.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", {
        bubbles: true,
        key: "Escape",
      }),
    );
    await menu.updateComplete;

    expect(menu.textContent?.trim()).toBe("");
  });

  it("opens into the right-side whitespace on large screens", async () => {
    setViewport(1440, 900);
    const { menu, trigger } = await createMenu();
    trigger.getBoundingClientRect = () =>
      new globalThis.DOMRect(736, 240, 24, 24);

    click(trigger);
    await menu.updateComplete;

    const wrapper = requireElement(
      menu.querySelector<HTMLElement>(".dropdown-menu"),
      "expected dropdown wrapper",
    );
    const style = wrapper.getAttribute("style") ?? "";

    expect(style).toContain("left:776px");
    expect(style).not.toContain("right:");
  });
});
