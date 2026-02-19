/**
 * Shared type definitions for the collection form Lit component.
 */

export interface CollectionFormLabels {
  titleLabel: string;
  titlePlaceholder: string;
  slugLabel: string;
  slugHelp: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  iconLabel: string;
  chooseIcon: string;
  removeIcon: string;
  dialogTitle: string;
  dialogClose: string;
  searchIconsPlaceholder: string;
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
  icon: string;
}

export interface CollectionSubmitDetail {
  endpoint: string;
  data: {
    title: string;
    slug: string;
    description?: string;
    icon?: string;
    sortOrder?: string;
  };
  isEdit: boolean;
}
