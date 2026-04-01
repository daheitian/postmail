/**
 * Site Header Overflow Menu
 *
 * Keeps public header navigation on a single line by moving links into the
 * overflow menu when the inline row runs out of room.
 */

const VIEWPORT_EDGE_MARGIN = 12;
const LAYOUT_EPSILON = 0.5;

const queueFrame =
  typeof globalThis.requestAnimationFrame === "function"
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (callback) => globalThis.setTimeout(callback, 0);

function isActiveLink(link) {
  return (
    link.dataset.siteHeaderActive === "true" ||
    link.classList.contains("site-header-link-active") ||
    link.classList.contains("site-header-menuitem-active")
  );
}

function setInlineLinkState(link) {
  link.removeAttribute("role");
  link.classList.add("site-header-link");
  link.classList.remove("site-header-menuitem-active");
  link.classList.toggle("site-header-link-active", isActiveLink(link));
}

function setOverflowLinkState(link) {
  link.setAttribute("role", "menuitem");
  link.classList.remove("site-header-link", "site-header-link-active");
  link.classList.toggle("site-header-menuitem-active", isActiveLink(link));
}

function getLastInlineItem(nav, menuRoot) {
  const inlineItems = Array.from(nav.children).filter(
    (child) =>
      child instanceof HTMLElement && (child !== menuRoot || !menuRoot.hidden),
  );
  return inlineItems.at(-1) ?? null;
}

function positionPopover(trigger, popover) {
  if (popover.getAttribute("aria-hidden") === "true") return;

  const viewportWidth =
    document.documentElement.clientWidth || globalThis.innerWidth;

  // On mobile, pin the popover's right edge to the page content edge
  // so the menu is easy to reach with the right thumb.
  if (viewportWidth < 700) {
    const menuRoot = popover.parentElement;
    if (menuRoot) {
      const menuRootRect = menuRoot.getBoundingClientRect();
      const sitePadding = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--site-padding",
        ),
      );
      const pageRight = viewportWidth - (sitePadding || 0);
      const offset = menuRootRect.right - pageRight;
      popover.dataset.align = "end";
      popover.style.right = `${offset}px`;
    }
    return;
  }

  // Desktop: clear any mobile inline offset
  popover.style.right = "";

  popover.dataset.align = "start";

  const popoverRect = popover.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();

  const fitsStart =
    triggerRect.left + popoverRect.width <=
    viewportWidth - VIEWPORT_EDGE_MARGIN;
  const fitsEnd =
    triggerRect.right - popoverRect.width >= VIEWPORT_EDGE_MARGIN;

  if (!fitsStart && fitsEnd) {
    popover.dataset.align = "end";
    return;
  }

  if (fitsStart || !fitsEnd) {
    popover.dataset.align = "start";
    return;
  }

  popover.dataset.align = "end";
}

export function initSiteHeaderMenus(root = document) {
  root.querySelectorAll(".site-header-more").forEach((menuRoot) => {
    if (menuRoot.dataset.siteHeaderMenuInitialized === "true") return;

    const nav = menuRoot.parentElement;
    const trigger = menuRoot.querySelector(":scope > button");
    const popover = menuRoot.querySelector(":scope > [data-popover]");
    const menu = popover ? popover.querySelector(':scope > [role="menu"]') : null;

    if (
      !(nav instanceof HTMLElement) ||
      !(trigger instanceof HTMLButtonElement) ||
      !(popover instanceof HTMLElement) ||
      !(menu instanceof HTMLElement)
    ) {
      return;
    }

    const configuredVisibleCount = nav.querySelectorAll(
      ":scope > a.site-header-link",
    ).length;
    const orderedLinks = [
      ...Array.from(nav.querySelectorAll(":scope > a.site-header-link")),
      ...Array.from(menu.querySelectorAll(':scope > a, :scope > [role="menuitem"]')),
    ].filter((link) => link instanceof HTMLAnchorElement);

    orderedLinks.forEach((link) => {
      link.dataset.siteHeaderActive = isActiveLink(link) ? "true" : "false";
    });

    let layoutQueued = false;

    const close = (focusTrigger = false) => {
      if (popover.getAttribute("aria-hidden") === "true") return;
      popover.setAttribute("aria-hidden", "true");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    };

    const renderLinks = (visibleCount) => {
      orderedLinks.forEach((link) => link.remove());

      const visibleLinks = orderedLinks.slice(0, visibleCount);
      const overflowLinks = orderedLinks.slice(visibleCount);

      visibleLinks.forEach((link) => {
        setInlineLinkState(link);
        nav.insertBefore(link, menuRoot);
      });

      overflowLinks.forEach((link) => {
        setOverflowLinkState(link);
        menu.appendChild(link);
      });

      const hasOverflow = overflowLinks.length > 0;
      menuRoot.hidden = !hasOverflow;
      trigger.classList.toggle(
        "site-header-more-btn-active",
        overflowLinks.some((link) => isActiveLink(link)),
      );

      if (!hasOverflow) close(false);
    };

    const navFits = () => {
      const navRect = nav.getBoundingClientRect();
      const lastInlineItem = getLastInlineItem(nav, menuRoot);
      if (!(lastInlineItem instanceof HTMLElement)) return true;
      return (
        lastInlineItem.getBoundingClientRect().right <=
        navRect.right + LAYOUT_EPSILON
      );
    };

    const layoutLinks = () => {
      if (orderedLinks.length === 0) return;
      if (nav.getBoundingClientRect().width <= 0) return;

      let visibleCount = Math.min(configuredVisibleCount, orderedLinks.length);
      renderLinks(visibleCount);

      while (visibleCount > 0 && !navFits()) {
        visibleCount -= 1;
        renderLinks(visibleCount);
      }

      if (trigger.getAttribute("aria-expanded") === "true") {
        queueFrame(() => positionPopover(trigger, popover));
      }
    };

    const scheduleLayout = () => {
      if (layoutQueued) return;
      layoutQueued = true;
      queueFrame(() => {
        layoutQueued = false;
        layoutLinks();
      });
    };

    const open = () => {
      if (menuRoot.hidden) return;

      document.dispatchEvent(
        new CustomEvent("basecoat:popover", { detail: { source: menuRoot } }),
      );
      popover.setAttribute("aria-hidden", "false");
      trigger.setAttribute("aria-expanded", "true");
      queueFrame(() => positionPopover(trigger, popover));
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

    menu.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) {
        close(false);
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

    globalThis.addEventListener("resize", scheduleLayout);
    globalThis.visualViewport?.addEventListener("resize", scheduleLayout);
    document.fonts?.ready?.then(() => scheduleLayout()).catch(() => {});

    scheduleLayout();
    menuRoot.dataset.siteHeaderMenuInitialized = "true";
  });
}

initSiteHeaderMenus();
