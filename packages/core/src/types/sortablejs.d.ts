/**
 * Minimal type declarations for sortablejs
 *
 * Only covers the API surface used by nav-reorder.ts.
 */

declare module "sortablejs" {
  interface SortableOptions {
    animation?: number;
    handle?: string;
    onEnd?: (event: { oldIndex?: number; newIndex?: number }) => void;
  }

  interface SortableInstance {
    destroy(): void;
  }

  const Sortable: {
    create(el: HTMLElement, options?: SortableOptions): SortableInstance;
  };

  export default Sortable;
}
