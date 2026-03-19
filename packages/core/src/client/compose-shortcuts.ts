import {
  getActiveCollectionId,
  getComposeDialog,
  getCurrentDetailPostArticle,
  openNewCompose,
  openReplyForArticle,
} from "./compose-launch.js";

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
  if (key !== "n" && key !== "r") return;
  if (shouldIgnoreShortcut(event)) return;

  if (key === "n") {
    event.preventDefault();
    const collectionId = getActiveCollectionId();
    void openNewCompose(collectionId ? { collectionId } : undefined);
    return;
  }

  const article = getCurrentDetailPostArticle();
  if (!article) return;

  event.preventDefault();
  void openReplyForArticle(article);
});
