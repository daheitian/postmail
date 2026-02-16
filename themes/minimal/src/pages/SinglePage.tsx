/**
 * Minimal Theme - Single Page
 *
 * Custom page (type "page") view — clean centered content.
 */

import type { FC } from "hono/jsx";
import type { SinglePageProps } from "@jant/core";

export const SinglePage: FC<SinglePageProps> = ({ page }) => {
  return (
    <article class="h-entry py-6">
      {page.title && (
        <h1 class="p-name text-2xl font-semibold mb-6">{page.title}</h1>
      )}

      <div
        class="e-content prose"
        dangerouslySetInnerHTML={{ __html: page.bodyHtml || "" }}
      />
    </article>
  );
};
