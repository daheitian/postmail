/**
 * Thread Context Interactions
 *
 * 1. Expand/collapse faded ancestor context via toggle button
 * 2. Auto-scroll to current post on thread detail pages
 */

function parsePixelValue(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCollapsedMaxHeight(container: HTMLElement): number {
  const wasExpanded = container.classList.contains("expanded");
  if (wasExpanded) {
    container.classList.remove("expanded");
  }

  const value = getComputedStyle(container).maxHeight;
  const maxHeight = parsePixelValue(value, 188);

  if (wasExpanded) {
    container.classList.add("expanded");
  }

  return maxHeight;
}

function getPendingImages(container: HTMLElement): HTMLImageElement[] {
  return Array.from(container.querySelectorAll("img")).filter(
    (image) => !image.complete,
  );
}

function waitForContentToSettle(
  container: HTMLElement,
  callback: () => void,
): void {
  const pendingImages = getPendingImages(container);
  if (pendingImages.length === 0) {
    requestAnimationFrame(() => {
      requestAnimationFrame(callback);
    });
    return;
  }

  let remaining = pendingImages.length;
  const handleDone = (): void => {
    remaining -= 1;
    if (remaining === 0) {
      callback();
    }
  };

  pendingImages.forEach((image) => {
    image.addEventListener("load", handleDone, { once: true });
    image.addEventListener("error", handleDone, { once: true });
  });
}

function updateThreadContextState(
  container: HTMLElement,
  toggle: HTMLElement,
  allowExpand: boolean,
): void {
  const collapsedMaxHeight = getCollapsedMaxHeight(container);
  const isExpanded = container.classList.contains("expanded");
  const overflows = container.scrollHeight > collapsedMaxHeight + 1;
  const showMoreLabel = toggle.dataset.labelMore ?? "Show more";
  const showLessLabel = toggle.dataset.labelLess ?? "Show less";

  if (!overflows) {
    if (allowExpand) {
      container.classList.remove(
        "thread-context-collapsed",
        "thread-context-faded",
        "expanded",
      );
    } else {
      container.classList.add("thread-context-collapsed");
      container.classList.remove("thread-context-faded", "expanded");
    }
    toggle.classList.add("hidden");
    toggle.textContent = showMoreLabel;
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  container.classList.add("thread-context-collapsed");
  container.classList.add("thread-context-faded");
  toggle.classList.remove("hidden");
  toggle.textContent = isExpanded ? showLessLabel : showMoreLabel;
  toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
}

function setupThreadContext(group: HTMLElement): void {
  const container = group.querySelector<HTMLElement>("[data-thread-context]");
  const toggle = group.querySelector<HTMLElement>(
    "[data-thread-context-toggle]",
  );
  if (!container || !toggle) return;

  let allowExpand = false;
  updateThreadContextState(container, toggle, allowExpand);

  waitForContentToSettle(container, () => {
    allowExpand = true;
    updateThreadContextState(container, toggle, allowExpand);
  });

  if ("ResizeObserver" in globalThis) {
    const observer = new globalThis.ResizeObserver(() => {
      updateThreadContextState(container, toggle, allowExpand);
    });
    observer.observe(container);
  }
}

export function setupThreadContexts(
  root: globalThis.Document | globalThis.Element = document,
): void {
  root.querySelectorAll(".thread-group").forEach((group) => {
    if (group instanceof HTMLElement) {
      setupThreadContext(group);
    }
  });
}

// Expand/collapse: event delegation on toggle buttons
document.addEventListener("click", (e) => {
  const toggle = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-thread-context-toggle]",
  );
  if (!toggle) return;

  const container = toggle
    .closest(".thread-group")
    ?.querySelector<HTMLElement>("[data-thread-context]");
  if (!container) return;

  container.classList.toggle("expanded");
  updateThreadContextState(container, toggle, true);
});

// Auto-scroll to current post on detail pages
document.addEventListener("DOMContentLoaded", () => {
  setupThreadContexts(document);

  const current = document.querySelector("[data-post-current]");
  if (!current) return;

  requestAnimationFrame(() => {
    current.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
