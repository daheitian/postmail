// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

type SiteHeaderInit =
  typeof import("../site-header-nav.js").initSiteHeaderMenus;

function rect({ left = 0, top = 0, width = 0, height = 0 }) {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return this;
    },
  };
}

function setRect(
  element: HTMLElement,
  getValue: () => ReturnType<typeof rect>,
) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: getValue,
  });
}

function renderHeader() {
  document.body.innerHTML = `
    <nav class="site-header-nav">
      <a href="/collections" class="site-header-link">Collections</a>
      <a href="/archive" class="site-header-link">Archive</a>
      <a href="/rss" class="site-header-link">RSS</a>
      <div class="dropdown-menu site-header-more" hidden>
        <button
          type="button"
          class="site-header-more-btn"
          aria-haspopup="menu"
          aria-expanded="false"
        >
          More
        </button>
        <div data-popover aria-hidden="true" data-align="start">
          <div role="menu">
            <a href="/settings" role="menuitem">Settings</a>
          </div>
        </div>
      </div>
    </nav>
  `;

  const nav = document.querySelector<HTMLElement>(".site-header-nav");
  const menuRoot = document.querySelector<HTMLElement>(".site-header-more");
  const trigger = document.querySelector<HTMLButtonElement>(
    ".site-header-more-btn",
  );
  const popover = document.querySelector<HTMLElement>("[data-popover]");
  const menu = document.querySelector<HTMLElement>('[role="menu"]');

  if (!nav || !menuRoot || !trigger || !popover || !menu) {
    throw new Error("Expected site header nav markup");
  }

  return { nav, menuRoot, trigger, popover, menu };
}

describe("site header nav", () => {
  let initSiteHeaderMenus: SiteHeaderInit;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";

    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: (time: number) => void) => {
        callback(0);
        return 1;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });

    ({ initSiteHeaderMenus } = await import("../site-header-nav.js"));
  });

  it("moves links into the overflow menu when the row is too narrow", () => {
    const { nav, menuRoot, menu, trigger, popover } = renderHeader();
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a"),
    );

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 320,
    });

    setRect(nav, () => rect({ width: 150, height: 32 }));
    setRect(menuRoot, () => {
      const inlineItems = Array.from(nav.children).filter(
        (child) =>
          child instanceof HTMLElement &&
          (child !== menuRoot || !menuRoot.hidden),
      );
      let left = 0;
      for (const child of inlineItems) {
        const width = child === menuRoot ? 32 : 48;
        if (child === menuRoot) {
          return rect({ left, width, height: 32 });
        }
        left += width + 8;
      }
      return rect({ left: 0, width: 32, height: 32 });
    });
    setRect(trigger, () => menuRoot.getBoundingClientRect());
    setRect(popover, () => rect({ width: 160, height: 120 }));

    anchors.forEach((anchor) => {
      setRect(anchor, () => {
        const inlineItems = Array.from(nav.children).filter(
          (child) => child instanceof HTMLElement && child !== menuRoot,
        );
        let left = 0;
        for (const child of inlineItems) {
          if (child === anchor) {
            return rect({ left, width: 48, height: 32 });
          }
          left += 56;
        }
        return rect({ left: 0, width: 48, height: 32 });
      });
    });

    initSiteHeaderMenus();

    expect(
      Array.from(nav.querySelectorAll(":scope > a.site-header-link")).map(
        (link) => link.textContent?.trim(),
      ),
    ).toEqual(["Collections", "Archive"]);
    expect(menuRoot.hidden).toBe(false);
    expect(
      Array.from(menu.querySelectorAll('[role="menuitem"]')).map((link) =>
        link.textContent?.trim(),
      ),
    ).toEqual(["RSS", "Settings"]);
  });

  it("does not exceed the configured max visible link count", () => {
    const { nav, menuRoot, menu, trigger, popover } = renderHeader();
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("a"),
    );

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 640,
    });

    setRect(nav, () => rect({ width: 480, height: 32 }));
    setRect(menuRoot, () => rect({ left: 168, width: 32, height: 32 }));
    setRect(trigger, () => menuRoot.getBoundingClientRect());
    setRect(popover, () => rect({ width: 160, height: 120 }));

    anchors.forEach((anchor, index) => {
      setRect(anchor, () => rect({ left: index * 56, width: 48, height: 32 }));
    });

    initSiteHeaderMenus();

    expect(
      Array.from(nav.querySelectorAll(":scope > a.site-header-link")).map(
        (link) => link.textContent?.trim(),
      ),
    ).toEqual(["Collections", "Archive", "RSS"]);
    expect(menuRoot.hidden).toBe(false);
    expect(
      Array.from(menu.querySelectorAll('[role="menuitem"]')).map((link) =>
        link.textContent?.trim(),
      ),
    ).toEqual(["Settings"]);
  });

  it("defaults to start alignment on desktop when it fits", () => {
    const { nav, menuRoot, trigger, popover } = renderHeader();

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 800,
    });

    setRect(nav, () => rect({ width: 800, height: 32 }));
    setRect(menuRoot, () => rect({ left: 8, width: 32, height: 32 }));
    setRect(trigger, () => rect({ left: 8, width: 32, height: 32 }));
    setRect(popover, () => rect({ width: 180, height: 120 }));

    initSiteHeaderMenus();

    menuRoot.hidden = false;
    trigger.click();

    expect(popover.getAttribute("aria-hidden")).toBe("false");
    expect(popover.dataset.align).toBe("start");
  });

  it("switches to end alignment on desktop when start would overflow", () => {
    const { nav, menuRoot, trigger, popover } = renderHeader();

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 800,
    });

    // Trigger near the right edge — start alignment would push popover past viewport
    setRect(nav, () => rect({ width: 800, height: 32 }));
    setRect(menuRoot, () => rect({ left: 700, width: 32, height: 32 }));
    setRect(trigger, () => rect({ left: 700, width: 32, height: 32 }));
    setRect(popover, () => rect({ width: 180, height: 120 }));

    initSiteHeaderMenus();

    menuRoot.hidden = false;
    trigger.click();

    expect(popover.getAttribute("aria-hidden")).toBe("false");
    expect(popover.dataset.align).toBe("end");
  });

  it("pins popover to page right edge on mobile", () => {
    const { nav, menuRoot, trigger, popover } = renderHeader();

    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 375,
    });

    // Stub --site-padding as 30px (1.875rem at 16px base)
    const originalGetComputedStyle = globalThis.getComputedStyle;
    vi.stubGlobal("getComputedStyle", (el: globalThis.Element) => {
      const style = originalGetComputedStyle(el);
      return {
        ...style,
        getPropertyValue: (prop: string) =>
          prop === "--site-padding" ? "30" : style.getPropertyValue(prop),
      };
    });

    setRect(nav, () => rect({ width: 375, height: 32 }));
    // menuRoot right edge at 310 (375 - 30 padding - 34 search - 1 gap)
    setRect(menuRoot, () =>
      rect({ left: 278, width: 32, height: 32, right: 310 }),
    );
    setRect(trigger, () => rect({ left: 278, width: 32, height: 32 }));
    setRect(popover, () => rect({ width: 200, height: 120 }));

    initSiteHeaderMenus();

    menuRoot.hidden = false;
    trigger.click();

    expect(popover.getAttribute("aria-hidden")).toBe("false");
    expect(popover.dataset.align).toBe("end");
    // right offset = menuRoot.right(310) - (viewport(375) - padding(30)) = -35
    expect(popover.style.right).toBe("-35px");
  });
});
