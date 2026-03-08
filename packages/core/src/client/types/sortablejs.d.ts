/**
 * Minimal type declarations for sortablejs
 *
 * Only covers the API surface used by jant-nav-manager and jant-collection-sidebar.
 */

declare module "sortablejs" {
  interface SortableEvent {
    oldIndex?: number;
    newIndex?: number;
    item: HTMLElement;
  }

  interface SortableOptions {
    animation?: number;
    handle?: string;
    onStart?: (event: SortableEvent) => void;
    onEnd?: (event: SortableEvent) => void;
  }

  interface SortableInstance {
    destroy(): void;
  }

  const Sortable: {
    create(el: HTMLElement, options?: SortableOptions): SortableInstance;
  };

  export default Sortable;
}
