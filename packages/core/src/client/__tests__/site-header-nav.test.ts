// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

type SiteHeaderInit = typeof import("../site-header-nav.js").initSiteHeaderNav;
type ResponsiveSearchRoot = HTMLElement & {
  setWidths: (widths: {
    clientWidth?: number;
    fullWidth?: number;
    compactWidth?: number;
    iconWidth?: number;
  }) => void;
};

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  callback: (...args: unknown[]) => void;
  observed: unknown[] = [];

  constructor(callback: (...args: unknown[]) => void) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(element: unknown) {
    this.observed.push(element);
  }

  disconnect() {}

  unobserve() {}

  trigger() {
    this.callback([], this);
  }
}

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

function createResponsiveSearchDOM(): {
  root: ResponsiveSearchRoot;
  headerRow: HTMLElement;
} {
  const root = document.createElement("div");
  root.innerHTML = `
    <div class="site-header-top">
      <a href="/" class="site-logo">Jant</a>
      <nav class="site-header-nav">
        <a href="/latest" class="site-header-link">Latest</a>
        <a href="/archive" class="site-header-link">Archive</a>
        <a href="/collections" class="site-header-link">Collections</a>
      </nav>
      <form class="site-header-search-form">
        <input type="search" class="site-header-search-input" />
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const headerRow = root.querySelector(".site-header-top") as HTMLElement;
  let clientWidth = 420;
  let fullWidth = 360;
  let compactWidth = 360;
  let iconWidth = 360;

  Object.defineProperty(headerRow, "clientWidth", {
    configurable: true,
    get: () => clientWidth,
  });

  Object.defineProperty(headerRow, "scrollWidth", {
    configurable: true,
    get: () => {
      switch (headerRow.dataset.searchMode) {
        case "compact":
          return compactWidth;
        case "icon":
          return iconWidth;
        default:
          return fullWidth;
      }
    },
  });

  const responsiveRoot = root as unknown as ResponsiveSearchRoot;
  responsiveRoot.setWidths = (widths) => {
    clientWidth = widths.clientWidth ?? clientWidth;
    fullWidth = widths.fullWidth ?? fullWidth;
    compactWidth = widths.compactWidth ?? compactWidth;
    iconWidth = widths.iconWidth ?? iconWidth;
  };

  return { root: responsiveRoot, headerRow };
}

describe("site header nav drawer", () => {
  let initSiteHeaderNav: SiteHeaderInit;
  let root: HTMLElement;

  beforeEach(async () => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("drawer-open");
    vi.resetModules();
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
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

describe("site header responsive search", () => {
  let initSiteHeaderNav: SiteHeaderInit;

  beforeEach(async () => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("drawer-open");
    vi.resetModules();
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    ({ initSiteHeaderNav } = await import("../site-header-nav.js"));
  });

  it("keeps full search width when the header fits", () => {
    const { root, headerRow } = createResponsiveSearchDOM();

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBeUndefined();
  });

  it("shrinks search before collapsing it to an icon", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 350,
      fullWidth: 390,
      compactWidth: 340,
      iconWidth: 320,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("compact");
  });

  it("falls back to icon mode when compact search still overflows", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 300,
      fullWidth: 390,
      compactWidth: 340,
      iconWidth: 280,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("icon");
  });

  it("recomputes search mode when the header width changes", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 300,
      fullWidth: 390,
      compactWidth: 340,
      iconWidth: 280,
    });

    initSiteHeaderNav(root);
    expect(headerRow.dataset.searchMode).toBe("icon");

    root.setWidths({
      clientWidth: 360,
      fullWidth: 390,
      compactWidth: 340,
    });
    MockResizeObserver.instances[0]?.trigger();

    expect(headerRow.dataset.searchMode).toBe("compact");
  });
});
