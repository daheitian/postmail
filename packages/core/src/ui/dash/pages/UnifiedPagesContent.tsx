/**
 * Unified pages list - navigation items + other pages
 */

import { useLingui } from "@lingui/react/macro";
import type { Page, NavItem } from "../../../types.js";
import { ListItemRow, ActionButtons, CrudPageHeader } from "../index.js";

export function UnifiedPagesContent({
  navItems,
  otherPages,
}: {
  navItems: NavItem[];
  otherPages: Page[];
}) {
  const { t } = useLingui();

  return (
    <>
      <CrudPageHeader
        title={t({
          message: "Pages",
          comment: "@context: Pages main heading",
        })}
      >
        <div class="flex gap-2">
          <a href="/dash/pages/links/new" class="btn-outline">
            {t({
              message: "Add Link",
              comment: "@context: Button to add a navigation link",
            })}
          </a>
          <a href="/dash/pages/new" class="btn">
            {t({
              message: "New Page",
              comment: "@context: Button to create new page",
            })}
          </a>
        </div>
      </CrudPageHeader>

      {/* Navigation section */}
      <section class="mb-8">
        <h2 class="text-lg font-medium mb-3">
          {t({
            message: "Your site navigation",
            comment: "@context: Section heading for navigation items",
          })}
        </h2>
        {navItems.length === 0 ? (
          <p class="text-sm text-muted-foreground py-4">
            {t({
              message:
                "No navigation links yet. Add pages to navigation or create links.",
              comment: "@context: Empty state for navigation section",
            })}
          </p>
        ) : (
          <div id="nav-links-list" class="flex flex-col divide-y">
            {navItems.map((item) => (
              <ListItemRow
                key={item.id}
                actions={
                  item.type === "page" ? (
                    <>
                      <ActionButtons
                        editHref={
                          item.pageId
                            ? `/dash/pages/${item.pageId}/edit`
                            : undefined
                        }
                        editLabel={t({
                          message: "Edit",
                          comment: "@context: Button to edit page",
                        })}
                      />
                      <button
                        type="button"
                        class="btn-sm-ghost"
                        data-on:click__prevent={`@post('/dash/pages/${item.pageId}/remove-from-nav')`}
                      >
                        {t({
                          message: "Un-nav",
                          comment:
                            "@context: Button to remove page from navigation",
                        })}
                      </button>
                    </>
                  ) : (
                    <>
                      <ActionButtons
                        editHref={`/dash/pages/links/${item.id}/edit`}
                        editLabel={t({
                          message: "Edit",
                          comment: "@context: Button to edit link",
                        })}
                        deleteAction={`/dash/pages/links/${item.id}/delete`}
                        deleteLabel={t({
                          message: "Delete",
                          comment: "@context: Button to delete link",
                        })}
                      />
                    </>
                  )
                }
              >
                <div
                  class="flex items-center gap-3 cursor-grab"
                  data-id={item.id}
                >
                  <span class="text-muted-foreground select-none">⠿</span>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{item.label}</span>
                    <code class="text-sm text-muted-foreground bg-muted px-1 rounded">
                      {item.url}
                    </code>
                    <span class="badge-secondary">
                      {item.type === "page"
                        ? t({
                            message: "page",
                            comment: "@context: Nav item type badge",
                          })
                        : t({
                            message: "link",
                            comment: "@context: Nav item type badge",
                          })}
                    </span>
                  </div>
                </div>
              </ListItemRow>
            ))}
          </div>
        )}
      </section>

      {/* Other pages section */}
      <section>
        <h2 class="text-lg font-medium mb-3">
          {t({
            message: "Other pages",
            comment: "@context: Section heading for pages not in navigation",
          })}
        </h2>
        {otherPages.length === 0 ? (
          <p class="text-sm text-muted-foreground py-4">
            {t({
              message: "All pages are in your navigation.",
              comment: "@context: Empty state when all pages are in nav",
            })}
          </p>
        ) : (
          <div class="flex flex-col divide-y">
            {otherPages.map((page) => (
              <ListItemRow
                key={page.id}
                actions={
                  <>
                    <button
                      type="button"
                      class="btn-sm-outline"
                      data-on:click__prevent={`@post('/dash/pages/${page.id}/add-to-nav')`}
                    >
                      {t({
                        message: "Add to nav",
                        comment: "@context: Button to add page to navigation",
                      })}
                    </button>
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
                  </>
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
      </section>
    </>
  );
}
