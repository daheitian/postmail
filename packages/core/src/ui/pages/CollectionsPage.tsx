/**
 * Collections Listing Page
 *
 * 2-column card grid of collections with icons and post counts.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionsPageProps } from "../../types.js";
import { renderCollectionIcon } from "../../lib/icons.js";

export const CollectionsPage: FC<CollectionsPageProps> = ({ collections }) => {
  const { t } = useLingui();

  return (
    <div class="py-6" data-page="collections">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold">
          {t({
            message: "Collections",
            comment: "@context: Collections page heading",
          })}
        </h1>
      </header>

      <main>
        {collections.length === 0 ? (
          <p class="text-muted-foreground">
            {t({
              message: "No collections yet.",
              comment: "@context: Empty state message on collections page",
            })}
          </p>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {collections.map((collection) => (
              <a
                key={collection.id}
                href={`/c/${collection.slug}`}
                class="collection-card"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="collection-card-icon"
                    dangerouslySetInnerHTML={{
                      __html: renderCollectionIcon(collection.icon, {
                        size: 20,
                        fallback: true,
                      }),
                    }}
                  />
                  <span class="font-medium">{collection.title}</span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">
                  {collection.postCount}{" "}
                  {collection.postCount === 1
                    ? t({
                        message: "entry",
                        comment: "@context: Singular entry count label",
                      })
                    : t({
                        message: "entries",
                        comment: "@context: Plural entry count label",
                      })}
                </p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
