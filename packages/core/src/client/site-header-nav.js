/**
 * Site Header — Mobile Drawer + More Dropdown
 *
 * Toggles a slide-in drawer on mobile for navigation and search.
 * Manages the "More" dropdown popover on desktop.
 */

function initMoreDropdown(root) {
  const trigger = root.querySelector(".site-header-more-btn");
  const popover = root.querySelector(".site-header-more-popover");

  if (!trigger || !popover) return;
  if (trigger.dataset.moreInitialized === "true") return;
  trigger.dataset.moreInitialized = "true";

  function open() {
    popover.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    document.dispatchEvent(
      new CustomEvent("basecoat:popover", {
        detail: { source: trigger.parentElement },
      }),
    );
  }

  function close(focusTrigger = false) {
    popover.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    if (focusTrigger) trigger.focus();
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (trigger.getAttribute("aria-expanded") === "true") {
      close();
    } else {
      open();
    }
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Node)) return;
    if (!trigger.parentElement?.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      popover.getAttribute("aria-hidden") === "false"
    ) {
      close(true);
    }
  });

  document.addEventListener("basecoat:popover", (e) => {
    if (e.detail?.source !== trigger.parentElement) close();
  });
}

export function initSiteHeaderNav(root = document) {
  const hamburger = root.querySelector(".site-header-hamburger");
  const drawer = root.querySelector("#site-nav-drawer");
  const backdrop = root.querySelector(".site-nav-drawer-backdrop");
  const closeBtn = drawer?.querySelector(".site-nav-drawer-close");

  // --- More dropdown (desktop) ---
  initMoreDropdown(root);

  // --- Mobile drawer ---
  if (!hamburger || !drawer || !backdrop) return;
  if (hamburger.dataset.drawerInitialized === "true") return;
  hamburger.dataset.drawerInitialized = "true";

  function open() {
    drawer.setAttribute("aria-hidden", "false");
    drawer.removeAttribute("inert");
    backdrop.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("drawer-open");

    const firstFocusable = drawer.querySelector(
      "input, a, button:not(.site-nav-drawer-close)",
    );
    if (firstFocusable) firstFocusable.focus();
  }

  function close(returnFocus = true) {
    drawer.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("drawer-open");

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
