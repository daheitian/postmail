/**
 * Archive Navigation Selects
 *
 * Bridges BaseCoat select change events to URL navigation.
 * - Single selects (.archive-nav-select): each option's data-value is the target URL.
 * - Multi-selects (.archive-nav-multiselect): navigates on popover close
 *   (not on every toggle) so users can select multiple options.
 */

// Single-select: navigate immediately on change
document.addEventListener("change", (e) => {
  const target = e.target;
  if (
    !(target instanceof HTMLElement) ||
    !target.classList.contains("archive-nav-select")
  ) {
    return;
  }
  const value = e.detail?.value;
  if (typeof value === "string" && value.startsWith("/")) {
    window.location.href = value;
  }
});

// Multi-select: navigate when popover closes, only if selection changed
document.querySelectorAll(".archive-nav-multiselect").forEach((select) => {
  const trigger = select.querySelector(":scope > button");
  const input = select.querySelector(':scope > input[type="hidden"]');
  const filterKey = select.dataset.filterKey;
  if (!trigger || !input || !filterKey) return;

  let snapshotValue = input.value;

  const observer = new MutationObserver(() => {
    const expanded = trigger.getAttribute("aria-expanded");
    if (expanded === "true") {
      // Popover opened — snapshot current value
      snapshotValue = input.value;
    } else {
      // Popover closed — navigate if selection changed
      if (input.value === snapshotValue) return;

      let values = [];
      try {
        values = JSON.parse(input.value || "[]");
      } catch {
        return;
      }

      const url = new URL(window.location.href);
      if (values.length > 0) {
        url.searchParams.set(filterKey, values.join(","));
      } else {
        url.searchParams.delete(filterKey);
      }
      url.searchParams.delete("page");
      window.location.href = url.pathname + (url.search || "");
    }
  });

  observer.observe(trigger, {
    attributes: true,
    attributeFilter: ["aria-expanded"],
  });
});
