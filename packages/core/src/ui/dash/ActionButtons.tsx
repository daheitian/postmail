/**
 * Action Buttons Component
 *
 * Provides consistent Edit/View/Delete button group for list and detail pages
 */

import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import { buildConfirmActionExpression } from "../../lib/confirm.js";

export interface ActionButtonsProps {
  /**
   * URL for the edit action
   */
  editHref?: string;

  /**
   * URL for the view action (opens in new tab)
   */
  viewHref?: string;

  /**
   * Delete action URL (sends POST via Datastar @post)
   */
  deleteAction?: string;

  /**
   * Delete confirmation message
   */
  deleteConfirm?: string;

  /**
   * Button size variant
   * @default "sm"
   */
  size?: "sm" | "md";

  /**
   * Custom edit button label (overrides default translation)
   */
  editLabel?: string;

  /**
   * Custom view button label (overrides default translation)
   */
  viewLabel?: string;

  /**
   * Custom delete button label (overrides default translation)
   */
  deleteLabel?: string;
}

export const ActionButtons: FC<ActionButtonsProps> = ({
  editHref,
  viewHref,
  deleteAction,
  deleteConfirm,
  size = "sm",
  editLabel,
  viewLabel,
  deleteLabel,
}) => {
  const { i18n } = useLingui();

  const editClass = size === "sm" ? "btn-sm-outline" : "btn-outline";
  const viewClass = size === "sm" ? "btn-sm-ghost" : "btn-ghost";
  const deleteClass =
    size === "sm"
      ? "btn-sm-ghost text-destructive"
      : "btn-ghost text-destructive";

  const defaultEditLabel = i18n._(
    msg({
      message: "Edit",
      comment: "@context: Button to edit item",
    }),
  );
  const defaultViewLabel = i18n._(
    msg({
      message: "View",
      comment: "@context: Button to view item on public site",
    }),
  );
  const defaultDeleteLabel = i18n._(
    msg({
      message: "Delete",
      comment: "@context: Button to delete item",
    }),
  );

  const deleteClickHandler = deleteAction
    ? deleteConfirm
      ? buildConfirmActionExpression(`@post('${deleteAction}')`, {
          message: deleteConfirm,
          confirmLabel: deleteLabel || defaultDeleteLabel,
          cancelLabel: i18n._(
            msg({
              message: "Cancel",
              comment: "@context: Button label to dismiss a dialog or action",
            }),
          ),
          tone: "danger",
        })
      : `@post('${deleteAction}')`
    : undefined;

  return (
    <>
      {editHref && (
        <a href={editHref} class={editClass}>
          {editLabel || defaultEditLabel}
        </a>
      )}
      {viewHref && (
        <a
          href={viewHref}
          class={viewClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {viewLabel || defaultViewLabel}
        </a>
      )}
      {deleteAction && (
        <button
          type="button"
          class={deleteClass}
          data-on:click__prevent={deleteClickHandler}
        >
          {deleteLabel || defaultDeleteLabel}
        </button>
      )}
    </>
  );
};
