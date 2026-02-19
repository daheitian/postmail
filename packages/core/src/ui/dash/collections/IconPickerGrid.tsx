/**
 * Icon Picker Grid
 *
 * HTML fragment returned by GET /dash/collections/icons.
 * Renders a grid of icon buttons organized by category.
 */

import type { FC } from "hono/jsx";
import { ICON_CATALOG } from "../../../lib/icon-catalog.js";
import { getIconSvg } from "../../../lib/icons.js";

export const IconPickerGrid: FC = () => {
  return (
    <div class="flex flex-col gap-4">
      {Object.entries(ICON_CATALOG).map(([category, names]) => (
        <div key={category} data-category={category}>
          <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {category}
          </h3>
          <div class="grid grid-cols-8 gap-1">
            {names.map((name) => {
              const svg = getIconSvg(name);
              if (!svg) return null;
              return (
                <button
                  key={name}
                  type="button"
                  class="flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent transition-colors"
                  data-icon-name={name}
                  data-icon-svg={svg}
                  title={name}
                  data-on:click={`$iconName = el.dataset.iconName; $iconSvg = el.dataset.iconSvg; $icon = JSON.stringify({ name: $iconName, svg: $iconSvg, color: $iconColor }); const p = document.getElementById('icon-preview'); if (p) p.innerHTML = el.dataset.iconSvg; document.getElementById('icon-picker-dialog')?.close()`}
                >
                  <span
                    class="w-5 h-5 flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: svg
                        .replace(/width="24"/, 'width="20"')
                        .replace(/height="24"/, 'height="20"'),
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
