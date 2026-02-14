/**
 * Minimal Theme - Single Page
 *
 * Simple page content layout for type="page" posts.
 */

import type { FC } from "hono/jsx";
import type { SinglePageProps } from "../../../types.js";

export const SinglePage: FC<SinglePageProps> = ({ page }) => {
  return (
    <article class="h-entry">
      {page.title && (
        <h1 class="p-name text-2xl font-semibold mb-6">{page.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: page.contentHtml || "" }}
      />
    </article>
  );
};
