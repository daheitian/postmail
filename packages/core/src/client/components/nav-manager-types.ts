/**
 * Shared type definitions for the nav manager Lit component.
 */

import type { SystemNavKey } from "../../types/constants.js";

export interface NavManagerItem {
  id: string;
  type: "link" | "system";
  systemKey?: SystemNavKey;
  label: string;
  displayLabel?: string;
  url: string;
  placement?: "header" | "more";
}

export interface SystemNavConfig {
  key: SystemNavKey;
  label: string;
  description: string;
}

export interface NavManagerLabels {
  preview: string;
  navigationItems: string;
  emptyState: string;
  link: string;
  system: string;
  toggleEdit: string;
  label: string;
  url: string;
  save: string;
  delete: string;
  remove: string;
  orderSaved: string;
  labelRequired: string;
  saveFailed: string;
  deleteFailed: string;
  systemLinks: string;
  systemLinksDescription: string;
  addCustomLinkToNavigation: string;
  addLink: string;
  addLinkDescription: string;
  urlPlaceholder: string;
  labelAndUrlRequired: string;
  headerSection: string;
  moreSection: string;
  moreEmptyHint: string;
  placementSaved: string;
  useFeaturedAsDefault: string;
  useFeaturedAsDefaultDescription: string;
  homeViewSaved: string;
  latest: string;
  featured: string;
}

export interface NavManagerUpdateDetail {
  id: string;
  label: string;
  url?: string;
}

export interface NavManagerDeleteDetail {
  id: string;
}
