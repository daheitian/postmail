/**
 * Media gallery horizontal scroll fade hints.
 *
 * Toggles `.can-scroll-start` / `.can-scroll-end` on `.media-gallery-scroll-wrap`
 * based on the inner scroller's scroll position.
 */

const THRESHOLD = 4; // px tolerance for "at edge"

function updateHints(wrap: HTMLElement): void {
  const scroller = wrap.querySelector(
    "[data-post-media]",
  ) as HTMLElement | null;
  if (!scroller) return;

  const { scrollLeft, scrollWidth, clientWidth } = scroller;
  wrap.classList.toggle("can-scroll-start", scrollLeft > THRESHOLD);
  wrap.classList.toggle(
    "can-scroll-end",
    scrollLeft + clientWidth < scrollWidth - THRESHOLD,
  );
}

function initWrap(wrap: HTMLElement): void {
  const scroller = wrap.querySelector("[data-post-media]");
  if (!scroller) return;

  // Initial check
  updateHints(wrap);

  scroller.addEventListener("scroll", () => updateHints(wrap), {
    passive: true,
  });
}

// Init all existing galleries
function initAll(): void {
  document
    .querySelectorAll<HTMLElement>(".media-gallery-scroll-wrap")
    .forEach(initWrap);
}

// Handle dynamically added galleries (Datastar morph, etc.)
const observer = new globalThis.MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches(".media-gallery-scroll-wrap")) {
        initWrap(node);
      }
      node
        .querySelectorAll<HTMLElement>(".media-gallery-scroll-wrap")
        .forEach(initWrap);
    }
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAll();
    observer.observe(document.body, { childList: true, subtree: true });
  });
} else {
  initAll();
  observer.observe(document.body, { childList: true, subtree: true });
}
