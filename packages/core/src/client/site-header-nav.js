/**
 * Site Header — Mobile Navigation Drawer
 *
 * Toggles a slide-in drawer on mobile for navigation and search.
 * Desktop nav links are always visible, no overflow logic needed.
 */

export function initSiteHeaderNav(root = document) {
  const hamburger = root.querySelector(".site-header-hamburger");
  const drawer = root.querySelector("#site-nav-drawer");
  const backdrop = root.querySelector(".site-nav-drawer-backdrop");
  const closeBtn = drawer?.querySelector(".site-nav-drawer-close");

  if (!hamburger || !drawer || !backdrop) return;
  if (hamburger.dataset.drawerInitialized === "true") return;
  hamburger.dataset.drawerInitialized = "true";

  function open() {
    drawer.setAttribute("aria-hidden", "false");
    drawer.removeAttribute("inert");
    backdrop.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("drawer-open");

    // Focus the first focusable element in the drawer
    const firstFocusable = drawer.querySelector(
      'input, a, button:not(.site-nav-drawer-close)',
    );
    if (firstFocusable) firstFocusable.focus();
  }

  function close(returnFocus = true) {
    drawer.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("drawer-open");

    // Set inert after the slide-out transition completes
    drawer.addEventListener(
      "transitionend",
      () => {
        if (drawer.getAttribute("aria-hidden") === "true") {
          drawer.setAttribute("inert", "");
        }
      },
      { once: true },
    );

    if (returnFocus) hamburger.focus();
  }

  hamburger.addEventListener("click", () => {
    if (hamburger.getAttribute("aria-expanded") === "true") {
      close();
    } else {
      open();
    }
  });

  closeBtn?.addEventListener("click", () => close());
  backdrop.addEventListener("click", () => close());

  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
}

initSiteHeaderNav();
