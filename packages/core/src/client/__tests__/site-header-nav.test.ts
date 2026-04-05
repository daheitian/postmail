// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

type SiteHeaderInit = typeof import("../site-header-nav.js").initSiteHeaderNav;
type ResponsiveSearchRoot = HTMLElement & {
  setWidths: (widths: {
    clientWidth?: number;
    fullWidth?: number;
    compactWidth?: number;
    buttonWidth?: number;
    collapsedWidth?: number;
    logoScrollWidth?: number;
    fullLogoClientWidth?: number;
    compactLogoClientWidth?: number;
    buttonLogoClientWidth?: number;
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
      <div class="site-header-search-slot">
        <form class="site-header-search-form">
          <input type="search" class="site-header-search-input" />
        </form>
        <a href="/search" class="site-header-search-link">Search</a>
      </div>
      <div class="site-header-right"></div>
    </div>
  `;
  document.body.appendChild(root);

  const headerRow = root.querySelector(".site-header-top") as HTMLElement;
  const logo = root.querySelector(".site-logo") as HTMLElement;
  let clientWidth = 420;
  let fullWidth = 360;
  let compactWidth = 360;
  let buttonWidth = 360;
  let collapsedWidth = 240;
  let logoScrollWidth = 180;
  let fullLogoClientWidth = 180;
  let compactLogoClientWidth = 180;
  let buttonLogoClientWidth = 180;

  Object.defineProperty(headerRow, "clientWidth", {
    configurable: true,
    get: () => clientWidth,
  });

  Object.defineProperty(headerRow, "scrollWidth", {
    configurable: true,
    get: () => {
      if (headerRow.dataset.navMode === "collapsed") {
        return collapsedWidth;
      }

      switch (headerRow.dataset.searchMode) {
        case "compact":
          return compactWidth;
        case "button":
          return buttonWidth;
        default:
          return fullWidth;
      }
    },
  });

  Object.defineProperty(logo, "clientWidth", {
    configurable: true,
    get: () => {
      switch (headerRow.dataset.searchMode) {
        case "compact":
          return compactLogoClientWidth;
        case "button":
          return buttonLogoClientWidth;
        default:
          return fullLogoClientWidth;
      }
    },
  });

  Object.defineProperty(logo, "scrollWidth", {
    configurable: true,
    get: () => logoScrollWidth,
  });

  const responsiveRoot = root as unknown as ResponsiveSearchRoot;
  responsiveRoot.setWidths = (widths) => {
    clientWidth = widths.clientWidth ?? clientWidth;
    fullWidth = widths.fullWidth ?? fullWidth;
    compactWidth = widths.compactWidth ?? compactWidth;
    buttonWidth = widths.buttonWidth ?? buttonWidth;
    collapsedWidth = widths.collapsedWidth ?? collapsedWidth;
    logoScrollWidth = widths.logoScrollWidth ?? logoScrollWidth;
    fullLogoClientWidth = widths.fullLogoClientWidth ?? fullLogoClientWidth;
    compactLogoClientWidth =
      widths.compactLogoClientWidth ?? compactLogoClientWidth;
    buttonLogoClientWidth =
      widths.buttonLogoClientWidth ?? buttonLogoClientWidth;
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

  it("closes drawer when a navigation link is clicked", () => {
    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;
    const link = root.querySelector(
      ".site-nav-drawer-link",
    ) as HTMLAnchorElement;

    hamburger.click();
    link.click();

    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
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

    document.documentElement.setAttribute("data-header-ssr-mode", "drawer");
    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBeUndefined();
    expect(document.documentElement.hasAttribute("data-header-ssr-mode")).toBe(
      false,
    );
  });

  it("shrinks search before collapsing it to a button", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 350,
      fullWidth: 390,
      compactWidth: 340,
      buttonWidth: 320,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("compact");
  });

  it("falls back to button mode when compact search still overflows", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 300,
      fullWidth: 390,
      compactWidth: 340,
      buttonWidth: 280,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("button");
  });

  it("prefers button mode on narrow headers when the full search clips the logo", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 485,
      fullWidth: 430,
      buttonWidth: 320,
      logoScrollWidth: 180,
      fullLogoClientWidth: 118,
      buttonLogoClientWidth: 180,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("button");
  });

  it("still uses compact mode on wider headers when that is enough to preserve the logo", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 560,
      fullWidth: 430,
      compactWidth: 370,
      buttonWidth: 320,
      logoScrollWidth: 180,
      fullLogoClientWidth: 132,
      compactLogoClientWidth: 180,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.searchMode).toBe("compact");
  });

  it("recomputes search mode when the header width changes", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.setWidths({
      clientWidth: 300,
      fullWidth: 390,
      compactWidth: 340,
      buttonWidth: 280,
    });

    initSiteHeaderNav(root);
    expect(headerRow.dataset.searchMode).toBe("button");

    root.setWidths({
      clientWidth: 360,
      fullWidth: 390,
      compactWidth: 340,
    });
    MockResizeObserver.instances[0]?.trigger();

    expect(headerRow.dataset.searchMode).toBe("compact");
  });

  it("collapses the header into drawer mode when button search still overflows", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.insertAdjacentHTML(
      "beforeend",
      `
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
      </div>
    `,
    );
    root.setWidths({
      clientWidth: 280,
      fullWidth: 420,
      compactWidth: 360,
      buttonWidth: 320,
      collapsedWidth: 220,
    });

    initSiteHeaderNav(root);

    expect(headerRow.dataset.navMode).toBe("collapsed");
    expect(headerRow.dataset.searchMode).toBeUndefined();
  });

  it("closes the drawer when the header expands out of collapsed mode", () => {
    const { root, headerRow } = createResponsiveSearchDOM();
    root.insertAdjacentHTML(
      "beforeend",
      `
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
      </div>
    `,
    );
    root.setWidths({
      clientWidth: 280,
      fullWidth: 420,
      compactWidth: 360,
      buttonWidth: 320,
      collapsedWidth: 220,
    });

    initSiteHeaderNav(root);

    const hamburger = root.querySelector(
      ".site-header-hamburger",
    ) as HTMLButtonElement;
    const drawer = root.querySelector("#site-nav-drawer") as HTMLElement;

    hamburger.click();
    expect(drawer.getAttribute("aria-hidden")).toBe("false");

    root.setWidths({
      clientWidth: 420,
      fullWidth: 360,
      compactWidth: 340,
      buttonWidth: 300,
    });
    MockResizeObserver.instances[0]?.trigger();

    expect(headerRow.dataset.navMode).toBeUndefined();
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
  });
});
