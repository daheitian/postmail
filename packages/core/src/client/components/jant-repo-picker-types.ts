/**
 * Types shared between the server-side template and the
 * `jant-repo-picker` Lit component.
 */

export interface RepoPickerLabels {
  pageTitle: string;
  pageSubtitle: string;
  ownerLabel: string;
  ownerPlaceholder: string;
  ownerEmpty: string;
  installAnother: string;
  repositoryLabel: string;
  repoPlaceholderNoOwner: string;
  repoPlaceholder: string;
  repoSearchPlaceholder: string;
  repoEmpty: string;
  repoLoading: string;
  repoShowingOf: string; // "Showing {shown} of {total}"
  repoSearchHint: string;
  createNewRepo: string;
  createNewRepoHint: string;
  createNewDialogTitle: string;
  createNewNameLabel: string;
  createNewNameHelp: string;
  createNewDescriptionLabel: string;
  createNewVisibilityLabel: string;
  createNewVisibilityPrivate: string;
  createNewVisibilityPublic: string;
  createNewSubmit: string;
  createNewCancel: string;
  createNewPersonalAccountHint: string;
  classifyLoading: string;
  classificationEmpty: string;
  classificationOwned: string;
  classificationOwnedByOther: string; // "{host}"
  classificationForeign: string;
  confirmHeading: string;
  confirmBody: string; // "{repo}"
  confirmInputLabel: string; // "{repo}"
  confirmInputPlaceholder: string;
  cancel: string;
  connect: string;
  connecting: string;
  privateBadge: string;
  connectionFailed: string;
  retry: string;
}
