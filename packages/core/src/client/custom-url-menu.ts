/**
 * Custom URL action menus on the settings page.
 *
 * Keeps row menus mutually exclusive and dismisses them on outside click
 * and Escape.
 */

/**
 * Initialize custom URL action menus within a root.
 *
 * @param root - DOM subtree to scan for custom URL action menus.
 * @returns Nothing.
 * @example
 * initCustomUrlMenus();
 */
export function initCustomUrlMenus(
  root: globalThis.ParentNode = document,
): void {
  root
    .querySelectorAll<HTMLElement>("[data-custom-url-actions]")
    .forEach((menuRoot) => {
      if (menuRoot.dataset.customUrlActionsInitialized === "true") return;

      const trigger = menuRoot.querySelector<HTMLButtonElement>(
        "[data-custom-url-action='toggle-menu']",
      );
      const menu = menuRoot.querySelector<HTMLElement>(
        "[data-custom-url-menu]",
      );

      if (!(trigger instanceof HTMLButtonElement) || !menu) return;

      const close = (focusTrigger = false) => {
        if (menu.hidden) return;
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (focusTrigger) trigger.focus();
      };

      const open = (focusFirstItem = false) => {
        document.dispatchEvent(
          new CustomEvent("jant:custom-url-menu", {
            detail: { source: menuRoot },
          }),
        );
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        if (focusFirstItem) {
          const firstItem =
            menu.querySelector<HTMLElement>("[role='menuitem']");
          firstItem?.focus();
        }
      };

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (menu.hidden) {
          open(false);
          return;
        }

        close(false);
      });

      trigger.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          if (menu.hidden) {
            open(true);
          } else {
            close(false);
          }
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
        }
      });

      menu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
        }
      });

      menuRoot.addEventListener("click", (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const actionEl = target.closest<HTMLElement>(
          "[data-custom-url-action]",
        );
        if (!actionEl || !menuRoot.contains(actionEl)) return;
        if (actionEl.dataset.customUrlAction === "delete") {
          close(false);
        }
      });

      document.addEventListener("click", (event) => {
        if (!(event.target instanceof Node)) return;
        if (!menuRoot.contains(event.target)) {
          close(false);
        }
      });

      document.addEventListener("jant:custom-url-menu", (event) => {
        const customEvent = event as CustomEvent<{
          source?: globalThis.EventTarget | null;
        }>;
        if (customEvent.detail?.source !== menuRoot) {
          close(false);
        }
      });

      menuRoot.dataset.customUrlActionsInitialized = "true";
    });
}

initCustomUrlMenus();
