import type { FC } from "hono/jsx";
import { formatPageLabel } from "../../lib/pagination.js";

export interface PaginatedPageHeaderProps {
  title: string;
  currentPage?: number;
  totalPages?: number;
  description?: string;
  iconHtml?: string;
  hideOnFirstPage?: boolean;
  showTitle?: boolean;
}

export const PaginatedPageHeader: FC<PaginatedPageHeaderProps> = ({
  title,
  currentPage = 1,
  totalPages,
  description,
  iconHtml,
  hideOnFirstPage = false,
  showTitle = true,
}) => {
  if (hideOnFirstPage && currentPage <= 1) {
    return null;
  }

  const pageLabel =
    currentPage > 1 ? formatPageLabel(currentPage, totalPages) : null;

  return (
    <header class="mb-8">
      {showTitle ? (
        <h1 class="text-2xl font-semibold flex items-center gap-3">
          {iconHtml && (
            <span
              class="shrink-0"
              dangerouslySetInnerHTML={{ __html: iconHtml }}
            />
          )}
          {title}
        </h1>
      ) : null}
      {pageLabel && (
        <p class="mt-2 text-sm text-muted-foreground">{pageLabel}</p>
      )}
      {description && <p class="text-muted-foreground mt-2">{description}</p>}
    </header>
  );
};
