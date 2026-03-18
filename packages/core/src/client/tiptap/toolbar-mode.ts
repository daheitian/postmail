import type { EditorView } from "@tiptap/pm/view";

export type FormattingToolbarMode = "default" | "compose";

const MOBILE_FORMATTING_QUERY = "(max-width: 700px), (pointer: coarse)";

export function isComposeDockedToolbar(mode: FormattingToolbarMode): boolean {
  return (
    mode === "compose" &&
    (globalThis.matchMedia?.(MOBILE_FORMATTING_QUERY).matches ?? false)
  );
}

export function applyDockedToolbarOffset(
  el: HTMLElement,
  view: EditorView,
): void {
  const root =
    view.dom.closest(
      "jant-compose-dialog, .compose-fullscreen, .compose-attached-panel",
    ) ?? view.dom.closest("dialog");

  let offset = 16;
  const toolsRow = root?.querySelector<HTMLElement>(".compose-tools-row");
  const actionRow = root?.querySelector<HTMLElement>(".compose-action-row");

  if (toolsRow) offset += toolsRow.getBoundingClientRect().height;
  if (actionRow) offset += actionRow.getBoundingClientRect().height;

  el.style.setProperty("--tiptap-docked-offset", `${offset}px`);
}
