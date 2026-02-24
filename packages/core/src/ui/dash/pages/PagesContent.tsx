/**
 * Pages list — page CRUD only
 */

import { useLingui } from "@lingui/react/macro";
import type { Page } from "../../../types.js";
import { ListItemRow, ActionButtons, CrudPageHeader } from "../index.js";

export function PagesContent({ pages }: { pages: Page[] }) {
  const { t } = useLingui();

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Pages",
          comment: "@context: Pages main heading",
        })}
      >
        <a href="/dash/pages/new" class="btn">
          {t({
            message: "New Page",
            comment: "@context: Button to create new page",
          })}
        </a>
      </CrudPageHeader>

      {pages.length === 0 ? (
        <p class="text-sm text-muted-foreground py-4">
          {t({
            message: "No pages yet. Create your first page to get started.",
            comment: "@context: Empty state for pages list",
          })}
        </p>
      ) : (
        <div class="flex flex-col divide-y">
          {pages.map((page) => (
            <ListItemRow
              key={page.id}
              actions={
                <ActionButtons
                  editHref={`/dash/pages/${page.id}/edit`}
                  editLabel={t({
                    message: "Edit",
                    comment: "@context: Button to edit page",
                  })}
                  viewHref={
                    page.status !== "draft" ? `/${page.slug}` : undefined
                  }
                  viewLabel={t({
                    message: "View",
                    comment: "@context: Button to view page on public site",
                  })}
                />
              }
            >
              <a
                href={`/dash/pages/${page.id}`}
                class="font-medium hover:underline"
              >
                {page.title ||
                  t({
                    message: "Untitled",
                    comment: "@context: Default title for untitled page",
                  })}
              </a>
              <p class="text-sm text-muted-foreground mt-1">/{page.slug}</p>
            </ListItemRow>
          ))}
        </div>
      )}
    </>
  );
}
