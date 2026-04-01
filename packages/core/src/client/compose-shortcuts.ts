import {
  getActiveCollectionId,
  getComposeDialog,
  getCurrentDetailPostArticle,
  openNewCompose,
  openReplyForArticle,
} from "./compose-launch.js";
import { markComposeOpenShortcutDiscovered } from "./compose-discovery.js";
import type { JantPostMenu } from "./components/jant-post-menu.js";

const INTERACTIVE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable='']",
  "[contenteditable='true']",
  "[role='textbox']",
  ".ProseMirror",
].join(", ");

function isInteractiveTarget(target: globalThis.EventTarget | null): boolean {
  return (
    target instanceof globalThis.Element &&
    target.closest(INTERACTIVE_TARGET_SELECTOR) !== null
  );
}

function shouldIgnoreShortcut(event: globalThis.KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.repeat) return true;
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  if (!getComposeDialog()) return true;
  if (document.querySelector('[data-page="compose"]')) return true;
  if (document.querySelector("dialog[open]")) return true;

  const activeTarget = document.activeElement;
  return (
    isInteractiveTarget(event.target) ||
    (activeTarget !== event.target && isInteractiveTarget(activeTarget))
  );
}

document.addEventListener("keydown", (event: globalThis.KeyboardEvent) => {
  const key = event.key.toLowerCase();
  if (key !== "n" && key !== "r" && key !== "e" && key !== "c") return;
  if (shouldIgnoreShortcut(event)) return;

  if (key === "n") {
    event.preventDefault();
    markComposeOpenShortcutDiscovered();
    const collectionId = getActiveCollectionId();
    void openNewCompose(collectionId ? { collectionId } : undefined);
    return;
  }

  const article = getCurrentDetailPostArticle();
  if (!article) return;

  if (key === "r") {
    event.preventDefault();
    void openReplyForArticle(article);
    return;
  }

  if (key === "e") {
    const postId = article.dataset.postId;
    if (!postId) return;
    event.preventDefault();
    const composeEl = getComposeDialog();
    if (composeEl) {
      void composeEl.openEdit(postId);
    }
    return;
  }

  if (key === "c") {
    event.preventDefault();
    const postMenu = document.querySelector<JantPostMenu>("jant-post-menu");
    if (postMenu) {
      postMenu.openCollectionsForPost(article);
    }
    return;
  }
});
