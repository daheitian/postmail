/**
 * Admin Breadcrumb Component
 *
 * Reuses the existing dash-breadcrumb CSS classes.
 */

import type { FC } from "hono/jsx";

export interface AdminBreadcrumbProps {
  parent: string;
  parentHref: string;
  current: string;
}

export const AdminBreadcrumb: FC<AdminBreadcrumbProps> = ({
  parent,
  parentHref,
  current,
}) => {
  return (
    <nav class="dash-breadcrumb mb-6">
      <a href={parentHref} class="dash-breadcrumb-parent">
        {parent}
      </a>
      <span class="dash-breadcrumb-sep">/</span>
      <span class="dash-breadcrumb-current">{current}</span>
    </nav>
  );
};
