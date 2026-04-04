// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

type SiteHeaderInit = typeof import("../site-header-nav.js").initSiteHeaderNav;

function createDrawerDOM(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `
    <button
      class="site-header-hamburger"
      aria-controls="site-nav-drawer"
      aria-expanded="false"
    ></button>
    <div class="site-nav-drawer-backdrop" aria-hidden="true"></div>
    <div id="site-nav-drawer" class="site-nav-drawer" aria-hidden="true" inert>
      <div class="site-nav-drawer-header">
        <button class="site-nav-drawer-close"></button>
      </div>
      <nav class="site-nav-drawer-nav">
        <a href="/about" class="site-nav-drawer-link">About</a>
        <a href="/archive" class="site-nav-drawer-link">Archive</a>
      </nav>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

describe("site header nav drawer", () => {
  let initSiteHeaderNav: SiteHeaderInit;
  let root: HTMLElement;

  beforeEach(async () => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("drawer-open");
    vi.resetModules();
    root = createDrawerDOM();
    ({ initSiteHeaderNav } = await import("../site-header-nav.js"));
    initSiteHeaderNav(root);
  });

  it("opens drawer when hamburger is clicked", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;
    const backdrop = root.querySelector(
      ".site-nav-drawer-backdrop",
    ) as HTMLElement;

    hamburger.click();

    expect(drawer.getAttribute("aria-hidden")).toBe("false");
    expect(drawer.hasAttribute("inert")).toBe(false);
    expect(backdrop.getAttribute("aria-hidden")).toBe("false");
    expect(hamburger.getAttribute("aria-expanded")).toBe("true");
    expect(document.documentElement.classList.contains("drawer-open")).toBe(
      true,
    );
  });

  it("closes drawer on close button click", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;
    const closeBtn = root.querySelector(
      ".site-nav-drawer-close",
    ) as HTMLButtonElement;

    hamburger.click();
    closeBtn.click();

    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
    expect(document.documentElement.classList.contains("drawer-open")).toBe(
      false,
    );
  });

  it("closes drawer on backdrop click", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;
    const backdrop = root.querySelector(
      ".site-nav-drawer-backdrop",
    ) as HTMLElement;

    hamburger.click();
    backdrop.click();

    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(backdrop.getAttribute("aria-hidden")).toBe("true");
  });

  it("closes drawer on Escape key", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;

    hamburger.click();
    drawer.dispatchEvent(
      new globalThis.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles drawer on repeated hamburger clicks", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;

    hamburger.click();
    expect(drawer.getAttribute("aria-hidden")).toBe("false");

    hamburger.click();
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
  });
});
