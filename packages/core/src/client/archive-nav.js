/**
 * Archive Navigation Selects
 *
 * Bridges BaseCoat select change events to URL navigation.
 * Each select option's data-value is the target URL.
 */
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
