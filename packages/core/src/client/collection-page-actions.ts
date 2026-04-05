import { getCollectionsDirectoryPath } from "../lib/collection-paths.js";
import { showConfirmDialog } from "./confirm.js";
import { showToast } from "./toast.js";

interface CollectionPageActionLabels {
  edit: string;
  moreActions: string;
  deleteCollection: string;
  confirmDelete: string;
  cancel: string;
  saveFailed: string;
  deleted: string;
}

const parseLabels = (value: string | undefined): CollectionPageActionLabels => {
  if (!value) {
    return {
      edit: "",
      moreActions: "",
      deleteCollection: "",
      confirmDelete: "",
      cancel: "",
      saveFailed: "",
      deleted: "",
    };
  }

  try {
    return JSON.parse(value) as CollectionPageActionLabels;
  } catch {
    return {
      edit: "",
      moreActions: "",
      deleteCollection: "",
      confirmDelete: "",
      cancel: "",
      saveFailed: "",
      deleted: "",
    };
  }
};

document
  .querySelectorAll<HTMLElement>("[data-collection-page-actions]")
  .forEach((root) => {
    if (root.dataset.collectionPageActionsInitialized === "true") return;

    const labels = parseLabels(root.dataset.collectionPageLabels);
    const collectionId = root.dataset.collectionId;
    const redirectUrl =
      root.dataset.collectionPageRedirectUrl || getCollectionsDirectoryPath();
    const trigger = root.querySelector<HTMLElement>(
      "[data-collection-page-action='toggle-menu']",
    );
    const menu = root.querySelector<HTMLElement>("[data-collection-page-menu]");

    if (!collectionId || !trigger || !menu) return;

    const closeMenu = (focusTrigger = false) => {
      if (menu.hidden) return;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    };

    const openMenu = (focusFirstItem = false) => {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      if (focusFirstItem) {
        const firstItem = menu.querySelector<HTMLElement>("[role='menuitem']");
        firstItem?.focus();
      }
    };

    const handleDelete = async () => {
      closeMenu(false);

      const confirmed = await showConfirmDialog({
        message: labels.confirmDelete,
        confirmLabel: labels.deleteCollection,
        cancelLabel: labels.cancel,
        tone: "danger",
      });
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/collections/${collectionId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        showToast(labels.deleted);
        window.location.href = redirectUrl;
      } catch {
        showToast(labels.saveFailed, "error");
      }
    };

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (menu.hidden) {
        openMenu(false);
        return;
      }

      closeMenu(false);
    });

    trigger.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        if (menu.hidden) {
          openMenu(true);
        } else {
          closeMenu(false);
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    });

    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    });

    root.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const actionEl = target.closest<HTMLElement>(
        "[data-collection-page-action]",
      );
      if (!actionEl || !root.contains(actionEl)) return;

      const action = actionEl.dataset.collectionPageAction;
      if (action === "delete") {
        event.preventDefault();
        void handleDelete();
      }
    });

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) return;
      if (!root.contains(event.target)) {
        closeMenu(false);
      }
    });

    root.dataset.collectionPageActionsInitialized = "true";
  });
