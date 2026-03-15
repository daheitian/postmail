/**
 * Shared confirm dialog helpers.
 */

export type ConfirmDialogTone = "default" | "danger";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmDialogTone;
}

/**
 * Build a Datastar expression that waits for the shared confirm dialog.
 *
 * @param action - Datastar action expression to run after confirmation
 * @param options - Confirm dialog copy and visual tone
 * @returns Datastar-compatible async expression string
 *
 * @example
 * ```ts
 * buildConfirmActionExpression("@post('/posts/1/delete')", {
 *   message: "Delete this post permanently?",
 *   confirmLabel: "Delete",
 *   cancelLabel: "Cancel",
 *   tone: "danger",
 * });
 * ```
 */
export function buildConfirmActionExpression(
  action: string,
  options: ConfirmDialogOptions,
): string {
  return `(async () => { if (!(await jantConfirm(${JSON.stringify(options)}))) return; ${action} })()`;
}
