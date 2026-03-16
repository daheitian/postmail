/**
 * Admin Breadcrumb Component
 *
 * Reuses the existing dash-breadcrumb CSS classes.
 */

import { Fragment } from "hono/jsx";
import type { FC } from "hono/jsx";

export interface AdminBreadcrumbAncestor {
  label: string;
  href: string;
}

export interface AdminBreadcrumbProps {
  ancestors?: AdminBreadcrumbAncestor[];
  parent?: string;
  parentHref?: string;
  current: string;
}

export const AdminBreadcrumb: FC<AdminBreadcrumbProps> = ({
  ancestors,
  parent,
  parentHref,
  current,
}) => {
  const breadcrumbAncestors =
    ancestors ??
    (parent && parentHref ? [{ label: parent, href: parentHref }] : []);

  return (
    <nav class="dash-breadcrumb mb-6">
      {breadcrumbAncestors.map((ancestor) => (
        <Fragment key={ancestor.href}>
          <a href={ancestor.href} class="dash-breadcrumb-parent">
            {ancestor.label}
          </a>
          <span class="dash-breadcrumb-sep">/</span>
        </Fragment>
      ))}
      <span class="dash-breadcrumb-current">{current}</span>
    </nav>
  );
};
