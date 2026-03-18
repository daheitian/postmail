/**
 * Shared type definitions for the collection form Lit component.
 */

export interface CollectionFormLabels {
  titleLabel: string;
  titlePlaceholder: string;
  slugLabel: string;
  slugHelp: string;
  slugInvalidHelp: string;
  slugReservedHelp: string;
  editSlugLabel: string;
  resetSlugLabel: string;
  quickHint: string;
  quickSubmitLabel: string;
  createdLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  sortOrderLabel: string;
  sortNewest: string;
  sortOldest: string;
  sortRatingDesc: string;
  sortRatingAsc: string;
  submitLabel: string;
  cancelLabel: string;
}

export interface CollectionFormInitial {
  title: string;
  slug: string;
  description: string;
  sortOrder: string;
}

export interface CollectionSubmitDetail {
  endpoint: string;
  data: {
    title: string;
    slug: string;
    description?: string;
    sortOrder?: string;
  };
  isEdit: boolean;
}
