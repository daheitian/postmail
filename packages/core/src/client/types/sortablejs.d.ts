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
    bubbleScroll?: boolean;
    chosenClass?: string;
    direction?: "horizontal" | "vertical";
    dragClass?: string;
    fallbackTolerance?: number;
    filter?: string;
    forceAutoScrollFallback?: boolean;
    ghostClass?: string;
    handle?: string;
    onChoose?: (event: SortableEvent) => void;
    onStart?: (event: SortableEvent) => void;
    onUnchoose?: (event: SortableEvent) => void;
    onEnd?: (event: SortableEvent) => void;
    preventOnFilter?: boolean;
    scroll?: boolean | HTMLElement;
    scrollSensitivity?: number;
    scrollSpeed?: number;
  }

  interface SortableInstance {
    destroy(): void;
  }

  const Sortable: {
    create(el: HTMLElement, options?: SortableOptions): SortableInstance;
  };

  export default Sortable;
}
