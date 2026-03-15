/**
 * Type definitions for the collections page manager component.
 */

import type { CollectionFormLabels } from "./collection-types.js";

export interface CollectionManagerLabels {
  collectionsTitle: string;
  collectionSingular: string;
  collectionPlural: string;
  organize: string;
  done: string;
  organizeHint: string;
  newDivider: string;
  dividerLabel: string;
  dividerLabelPlaceholder: string;
  newCollection: string;
  edit: string;
  deleteDivider: string;
  moreActions: string;
  deleteCollection: string;
  confirmDelete: string;
  entrySingular: string;
  entryPlural: string;
  emptyState: string;
  orderSaved: string;
  saved: string;
  saveFailed: string;
  deleted: string;
  formLabels: CollectionFormLabels;
}

export interface ManagedCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: string;
  postCount: number;
  recentActivityAt: number;
}

export interface CollectionManagerItem {
  id: string;
  type: "collection" | "divider";
  collectionId?: string | null;
  label?: string | null;
  position?: string;
  collection?: ManagedCollection;
}
