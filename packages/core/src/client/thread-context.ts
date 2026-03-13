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
  const value = getComputedStyle(container).getPropertyValue(
    "--site-thread-context-max-height",
  );
  return parsePixelValue(value, 188);
}

function updateThreadContextState(
  container: HTMLElement,
  toggle: HTMLElement,
): void {
  const collapsedMaxHeight = getCollapsedMaxHeight(container);
  const isExpanded = container.classList.contains("expanded");
  const overflows = container.scrollHeight > collapsedMaxHeight + 1;
  const showMoreLabel = toggle.dataset.labelMore ?? "Show more";
  const showLessLabel = toggle.dataset.labelLess ?? "Show less";

  if (!overflows) {
    container.classList.remove("thread-context-faded", "expanded");
    toggle.classList.add("hidden");
    toggle.textContent = showMoreLabel;
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

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

  updateThreadContextState(container, toggle);

  if ("ResizeObserver" in globalThis) {
    const observer = new globalThis.ResizeObserver(() => {
      updateThreadContextState(container, toggle);
    });
    observer.observe(container);
  }
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
  updateThreadContextState(container, toggle);
});

// Auto-scroll to current post on detail pages
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".thread-group").forEach((group) => {
    if (group instanceof HTMLElement) {
      setupThreadContext(group);
    }
  });

  const current = document.querySelector("[data-post-current]");
  if (!current) return;

  requestAnimationFrame(() => {
    current.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
