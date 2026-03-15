/**
 * Site Header Overflow Menu
 *
 * Initializes the public site header's "more links" dropdown.
 * The markup follows BaseCoat's dropdown structure, but we manage
 * this menu locally so it works even when BaseCoat's JS isn't loaded.
 */

document.querySelectorAll(".site-header-more").forEach((menuRoot) => {
  if (menuRoot.dataset.siteHeaderMenuInitialized === "true") return;

  const trigger = menuRoot.querySelector(":scope > button");
  const popover = menuRoot.querySelector(":scope > [data-popover]");
  const menu = popover ? popover.querySelector('[role="menu"]') : null;

  if (!trigger || !popover || !menu) return;

  const close = (focusTrigger = false) => {
    if (popover.getAttribute("aria-hidden") === "true") return;
    popover.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    if (focusTrigger) trigger.focus();
  };

  const open = () => {
    document.dispatchEvent(
      new CustomEvent("basecoat:popover", { detail: { source: menuRoot } }),
    );
    popover.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
  };

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (trigger.getAttribute("aria-expanded") === "true") {
      close();
    } else {
      open();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      open();
      const firstItem = menu.querySelector('[role="menuitem"]');
      if (firstItem instanceof HTMLElement) {
        firstItem.focus();
      }
      return;
    }

    if (event.key === "Escape") {
      close(true);
    }
  });

  popover.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (!menuRoot.contains(event.target)) {
      close(false);
    }
  });

  document.addEventListener("basecoat:popover", (event) => {
    if (event.detail?.source !== menuRoot) {
      close(false);
    }
  });

  menuRoot.dataset.siteHeaderMenuInitialized = "true";
});
