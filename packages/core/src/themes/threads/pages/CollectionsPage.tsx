/**
 * Threads Theme - Collections Listing Page
 *
 * Lists all collections with titles, descriptions, and post counts.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { CollectionsPageProps } from "../../../types.js";

export const CollectionsPage: FC<CollectionsPageProps> = ({ collections }) => {
  const { t } = useLingui();

  return (
    <div class="py-6">
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
          <div class="divide-y divide-border">
            {collections.map((collection) => (
              <a
                key={collection.id}
                href={`/c/${collection.slug}`}
                class="block py-4 hover:bg-accent/50 -mx-4 px-4 rounded-md transition-colors"
              >
                <div class="flex items-center gap-3">
                  {collection.icon && (
                    <span class="text-2xl">{collection.icon}</span>
                  )}
                  <div class="flex-1 min-w-0">
                    <h2 class="font-medium">{collection.title}</h2>
                    {collection.description && (
                      <p class="text-sm text-muted-foreground mt-1">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <span class="text-sm text-muted-foreground shrink-0">
                    {collection.postCount}{" "}
                    {collection.postCount === 1
                      ? t({
                          message: "post",
                          comment: "@context: Singular post count label",
                        })
                      : t({
                          message: "posts",
                          comment: "@context: Plural post count label",
                        })}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
