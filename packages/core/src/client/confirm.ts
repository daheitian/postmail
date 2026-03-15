import type { ConfirmDialogOptions } from "../lib/confirm.js";
import "./components/jant-confirm-dialog.js";
import type { JantConfirmDialog } from "./components/jant-confirm-dialog.js";

declare global {
  var jantConfirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const CONFIRM_DIALOG_TAG = "jant-confirm-dialog";

/**
 * Ensure the shared confirm dialog element is mounted once.
 *
 * @returns The mounted confirm dialog element
 */
export function ensureConfirmDialog(): JantConfirmDialog {
  const existing =
    document.querySelector<JantConfirmDialog>(CONFIRM_DIALOG_TAG);
  if (existing) return existing;

  const dialog = document.createElement(
    CONFIRM_DIALOG_TAG,
  ) as JantConfirmDialog;
  document.body.appendChild(dialog);
  return dialog;
}

/**
 * Open the shared confirm dialog and resolve to the user's choice.
 *
 * @param options - Confirm dialog copy and visual tone
 * @returns Promise resolving to `true` when confirmed
 */
export function showConfirmDialog(
  options: ConfirmDialogOptions,
): Promise<boolean> {
  return ensureConfirmDialog().confirm(options);
}

globalThis.jantConfirm = showConfirmDialog;
