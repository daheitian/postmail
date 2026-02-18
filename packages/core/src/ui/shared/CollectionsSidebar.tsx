/**
 * Collections Sidebar
 *
 * Shared sidebar navigation for public collection pages.
 * Shows all collections with icons and active state.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";

export interface CollectionsSidebarProps {
  collections: Collection[];
  activeSlug?: string;
}

export const CollectionsSidebar: FC<CollectionsSidebarProps> = ({
  collections,
  activeSlug,
}) => {
  const { t } = useLingui();

  return (
    <nav class="flex flex-col gap-1 pt-6">
      <h2 class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t({
          message: "Collections",
          comment: "@context: Sidebar heading for collections nav",
        })}
      </h2>
      {collections.map((col) => {
        const isActive = col.slug === activeSlug;
        return (
          <a
            key={col.id}
            href={`/c/${col.slug}`}
            class={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md truncate ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <span
              class="flex items-center justify-center w-4 h-4 shrink-0"
              dangerouslySetInnerHTML={{
                __html: renderCollectionIcon(col.icon, {
                  size: 16,
                  fallback: true,
                }),
              }}
            />
            <span class="truncate">{col.title}</span>
          </a>
        );
      })}
    </nav>
  );
};
