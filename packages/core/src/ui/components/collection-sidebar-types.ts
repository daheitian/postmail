/**
 * Type definitions for the collection sidebar Lit component.
 */

import type { CollectionFormLabels } from "./collection-types.js";

export interface CollectionSidebarLabels {
  collections: string;
  reorder: string;
  done: string;
  addDivider: string;
  newCollection: string;
  edit: string;
  deleteDivider: string;
  moreActions: string;
  deleteCollection: string;
  confirmDelete: string;
  // Toast messages
  orderSaved: string;
  saved: string;
  saveFailed: string;
  deleted: string;
  // Collection form labels (passed through to jant-collection-form)
  formLabels: CollectionFormLabels;
}

export interface SidebarCollection {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: string;
  position: number;
  postCount: number;
}

export interface SidebarDivider {
  id: number;
  position: number;
}

export type SidebarItem =
  | { kind: "collection"; data: SidebarCollection }
  | { kind: "divider"; data: SidebarDivider };
