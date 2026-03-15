/**
 * Collection sort menu popovers.
 *
 * Ensures collection detail sort menus dismiss on outside click, Escape,
 * and when a different popover opens.
 */

/**
 * Initializes collection sort menu popovers within a root.
 *
 * @param root - DOM subtree to scan for collection sort menus.
 * @returns Nothing.
 * @example
 * initCollectionSortMenus();
 */
export function initCollectionSortMenus(
  root: globalThis.ParentNode = document,
): void {
  root
    .querySelectorAll<HTMLElement>(".collection-sort-menu")
    .forEach((menuRoot) => {
      if (menuRoot.dataset.collectionSortMenuInitialized === "true") return;

      const trigger = menuRoot.querySelector<HTMLButtonElement>(
        ":scope > .collection-sort-trigger",
      );
      const popover = menuRoot.querySelector<HTMLElement>(
        ":scope > [data-popover]",
      );
      const menu = popover?.querySelector<HTMLElement>(
        "[data-collection-sort-options]",
      );

      if (!(trigger instanceof HTMLButtonElement) || !popover || !menu) return;

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
          close(false);
        } else {
          open();
        }
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (trigger.getAttribute("aria-expanded") !== "true") open();
          const firstItem = menu.querySelector<HTMLAnchorElement>("a[href]");
          if (firstItem instanceof HTMLElement) {
            firstItem.focus();
          }
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
        const customEvent = event as CustomEvent<{
          source?: globalThis.EventTarget | null;
        }>;
        if (customEvent.detail?.source !== menuRoot) {
          close(false);
        }
      });

      menuRoot.dataset.collectionSortMenuInitialized = "true";
    });
}

initCollectionSortMenus();
