/**
 * Thread Context Interactions
 *
 * 1. Expand/collapse faded ancestor context via toggle button
 * 2. Auto-scroll to current post on thread detail pages
 */

// Expand/collapse: event delegation on toggle buttons
document.addEventListener("click", (e) => {
  const toggle = (e.target as HTMLElement).closest(
    "[data-thread-context-toggle]",
  );
  if (!toggle) return;

  const container = toggle
    .closest(".thread-group")
    ?.querySelector("[data-thread-context]");
  if (!container) return;

  const isExpanded = container.classList.toggle("expanded");
  toggle.textContent = isExpanded ? "Show less" : "Show more";
  if (isExpanded) {
    toggle.classList.add("hidden");
  }
});

// Auto-scroll to current post on detail pages
document.addEventListener("DOMContentLoaded", () => {
  const current = document.querySelector("[data-post-current]");
  if (!current) return;

  requestAnimationFrame(() => {
    current.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
