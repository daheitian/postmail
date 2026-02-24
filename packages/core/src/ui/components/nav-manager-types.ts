/**
 * Shared type definitions for the nav manager Lit component.
 */

export interface NavManagerItem {
  id: number;
  type: "page" | "link" | "system";
  label: string;
  url: string;
  pageId: number | null;
}

export interface SystemNavConfig {
  key: string;
  defaultLabel: string;
  url: string;
  description: string;
}

export interface AvailablePage {
  id: number;
  title: string;
  slug: string;
}

export interface NavManagerLabels {
  preview: string;
  navigationItems: string;
  emptyState: string;
  page: string;
  link: string;
  system: string;
  toggleEdit: string;
  label: string;
  url: string;
  save: string;
  delete: string;
  editPage: string;
  remove: string;
  orderSaved: string;
  labelRequired: string;
  saveFailed: string;
  deleteFailed: string;
  systemLinks: string;
  systemLinksDescription: string;
  addToNavigation: string;
  addPage: string;
  addPageDescription: string;
  addLink: string;
  addLinkDescription: string;
  add: string;
  allPagesInNav: string;
  urlPlaceholder: string;
  labelAndUrlRequired: string;
}

export interface NavManagerUpdateDetail {
  id: number;
  label: string;
  url?: string;
}

export interface NavManagerDeleteDetail {
  id: number;
}
