/**
 * Minimal type declarations for sortablejs
 *
 * Only covers the API surface used by jant-nav-manager and jant-collections-manager.
 */

declare module "sortablejs" {
  export interface SortableEvent {
    oldIndex?: number;
    newIndex?: number;
    item: HTMLElement;
  }

  export interface SortableOptions {
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

  export interface SortableInstance {
    destroy(): void;
  }

  const Sortable: {
    create(el: HTMLElement, options?: SortableOptions): SortableInstance;
  };

  export default Sortable;
}
