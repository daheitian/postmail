/**
 * Card Theme - Single Page
 *
 * Custom page (type "page") view.
 */

import type { FC } from "hono/jsx";
import type { SinglePageProps } from "@jant/core";

export const SinglePage: FC<SinglePageProps> = ({ page }) => {
  return (
    <article class="h-entry">
      {page.title && (
        <h1 class="p-name text-3xl font-semibold mb-6">{page.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: page.contentHtml || "" }}
      />
    </article>
  );
};
