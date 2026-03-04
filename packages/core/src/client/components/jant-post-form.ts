/**
 * Dashboard Post Form
 *
 * Light DOM Lit component that manages post create/edit form state.
 * Dispatches `jant:post-submit` for the bridge to handle networking.
 */

import { LitElement } from "lit";
import type { Editor, JSONContent } from "@tiptap/core";
import type {
  PostFormInitial,
  PostFormLabels,
  PostCollectionOption,
  PostMediaItem,
  PostSubmitDetail,
  PostFormat,
  PostStatus,
  PostVisibility,
} from "./post-form-types.js";
import { renderPostForm } from "./post-form-template.js";
import { createTiptapEditor } from "../tiptap/create-editor.js";

const DEFAULT_INITIAL: PostFormInitial = {
  format: "note",
  title: "",
  body: "",
  url: "",
  quoteText: "",
  status: "published",
  visibility: "public",
  pinned: false,
  rating: 0,
  collectionIds: [],
  mediaIds: [],
};

const EMPTY_LABELS: PostFormLabels = {
  formatLabel: "",
  noteOption: "",
  linkOption: "",
  quoteOption: "",
  titleLabel: "",
  titlePlaceholder: "",
  bodyLabel: "",
  bodyPlaceholder: "",
  urlLabel: "",
  urlPlaceholder: "",
  quoteTextLabel: "",
  quoteTextPlaceholder: "",
  mediaLabel: "",
  mediaAddButton: "",
  mediaRemoveButton: "",
  mediaEmptyLabel: "",
  statusLabel: "",
  statusPublished: "",
  statusDraft: "",
  visibilityLabel: "",
  visibilityPublic: "",
  visibilityFeatured: "",
  visibilityUnlisted: "",
  pinnedLabel: "",
  collectionsLabel: "",
  submitLabel: "",
  cancelLabel: "",
  mediaDialogTitle: "",
  mediaDialogDone: "",
  mediaDialogLoading: "",
  submitSuccessMessage: "",
  submitErrorMessage: "",
  draftFallbackMessage: "",
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value && typeof value === "object") {
    return value as T;
  }
  return fallback;
}

export class JantPostForm extends LitElement {
  static properties = {
    labels: { type: Object },
    initial: { type: Object },
    collections: { type: Array },
    media: { type: Array },
    action: { type: String },
    cancelHref: { type: String, attribute: "cancel-href" },
    mediaPickerUrl: { type: String, attribute: "media-picker-url" },
    isEdit: { type: Boolean, attribute: "is-edit" },
    _format: { state: true },
    _title: { state: true },
    _body: { state: true },
    _url: { state: true },
    _quoteText: { state: true },
    _status: { state: true },
    _visibility: { state: true },
    _pinned: { state: true },
    _rating: { state: true },
    _collectionIds: { state: true },
    _mediaIds: { state: true },
    _loading: { state: true },
  };

  declare labels: PostFormLabels;
  declare initial: PostFormInitial;
  declare collections: PostCollectionOption[];
  declare media: PostMediaItem[];
  declare action: string;
  declare cancelHref: string;
  declare mediaPickerUrl: string;
  declare isEdit: boolean;
  declare _format: PostFormat;
  declare _title: string;
  declare _body: string;
  declare _url: string;
  declare _quoteText: string;
  declare _status: PostStatus;
  declare _visibility: PostVisibility;
  declare _pinned: boolean;
  declare _rating: number;
  declare _collectionIds: number[];
  declare _mediaIds: string[];
  declare _loading: boolean;

  _editor: Editor | null = null;
  _bodyJson: JSONContent | null = null;
  #initialized = false;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.labels = { ...EMPTY_LABELS };
    this.initial = { ...DEFAULT_INITIAL };
    this.collections = [];
    this.media = [];
    this.action = "";
    this.cancelHref = "/dash/posts";
    this.mediaPickerUrl = "/dash/media/picker";
    this.isEdit = false;
    this._format = "note";
    this._title = "";
    this._body = "";
    this._url = "";
    this._quoteText = "";
    this._status = "published";
    this._visibility = "public";
    this._pinned = false;
    this._rating = 0;
    this._collectionIds = [];
    this._mediaIds = [];
    this._loading = false;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (typeof this.labels === "string") {
      this.labels = parseJson<PostFormLabels>(this.labels, { ...EMPTY_LABELS });
    }
    if (typeof this.initial === "string") {
      this.initial = parseJson<PostFormInitial>(this.initial, {
        ...DEFAULT_INITIAL,
      });
    }
    if (typeof this.collections === "string") {
      this.collections = parseJson<PostCollectionOption[]>(
        this.collections,
        [],
      );
    }
    if (typeof this.media === "string") {
      this.media = parseJson<PostMediaItem[]>(this.media, []);
    }

    if (!this.#initialized || changed.has("initial")) this.#applyInitial();
  }

  set loading(value: boolean) {
    this._loading = value;
  }

  get loading(): boolean {
    return this._loading;
  }

  set mediaIds(ids: string[]) {
    this._mediaIds = [...ids];
  }

  get mediaIds(): string[] {
    return [...this._mediaIds];
  }

  get #mediaDialog(): HTMLDialogElement | null {
    return this.querySelector("#post-media-picker");
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._editor?.destroy();
    this._editor = null;
    this.closeMediaPicker();
  }

  #applyInitial() {
    const init = this.initial ?? DEFAULT_INITIAL;
    this._format = init.format ?? "note";
    this._title = init.title ?? "";
    this._body = init.body ?? "";
    this._url = init.url ?? "";
    this._quoteText = init.quoteText ?? "";
    this._status = init.status ?? "published";
    this._visibility = init.visibility ?? "public";
    this._pinned = !!init.pinned;
    this._rating = init.rating ?? 0;
    this._collectionIds = [...(init.collectionIds ?? [])];
    this._mediaIds = [...(init.mediaIds ?? [])];
    this.#initialized = true;

    // Parse body as Tiptap JSON if it looks like JSON
    if (this._body && this._body.startsWith("{")) {
      try {
        this._bodyJson = JSON.parse(this._body) as JSONContent;
      } catch {
        this._bodyJson = null;
      }
    } else {
      this._bodyJson = null;
    }
  }

  initEditor() {
    if (this._editor) return;
    const container = this.querySelector<HTMLElement>(".post-form-tiptap-body");
    if (!container) return;

    this._editor = createTiptapEditor({
      element: container,
      placeholder: this.labels.bodyPlaceholder ?? "Write something…",
      content: this._bodyJson,
      onUpdate: (json) => {
        this._bodyJson = json;
        this._body = JSON.stringify(json);
      },
    });
  }

  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (!this._editor) {
      this.initEditor();
    }
  }

  handleInput(field: "_title" | "_body" | "_url" | "_quoteText", e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    (this as unknown as Record<string, string>)[field] = target.value;
  }

  toggleCollection(id: number) {
    this._collectionIds = this._collectionIds.includes(id)
      ? this._collectionIds.filter((cid) => cid !== id)
      : [...this._collectionIds, id];
  }

  removeMedia(id: string) {
    this._mediaIds = this._mediaIds.filter((mid) => mid !== id);
  }

  openMediaPicker() {
    const dialog = this.#mediaDialog;
    if (!dialog) return;
    dialog.showModal();
    this.dispatchEvent(
      new CustomEvent("jant:post-load-media", {
        bubbles: true,
        detail: {
          endpoint: this.mediaPickerUrl,
          selectedIds: [...this._mediaIds],
        },
      }),
    );
  }

  closeMediaPicker() {
    this.#mediaDialog?.close();
  }

  handleSubmit(e: Event) {
    e.preventDefault();
    if (this._loading || !this.action) return;
    // Use Tiptap JSON for body
    const bodyValue = this._bodyJson
      ? JSON.stringify(this._bodyJson)
      : this._body;

    const detail: PostSubmitDetail = {
      endpoint: this.action,
      isEdit: this.isEdit,
      data: {
        format: this._format,
        title: this._title.trim(),
        body: bodyValue,
        status: this._status,
        visibility: this._visibility,
        pinned: this._pinned,
        url: this._url.trim(),
        quoteText: this._quoteText.trim(),
        rating: this._rating,
        collectionIds: [...this._collectionIds],
        mediaIds: [...this._mediaIds],
      },
      messages: {
        success: this.labels.submitSuccessMessage,
        error: this.labels.submitErrorMessage,
      },
    };
    this.dispatchEvent(
      new CustomEvent<PostSubmitDetail>("jant:post-submit", {
        bubbles: true,
        detail,
      }),
    );
  }

  render() {
    return renderPostForm(this);
  }
}

customElements.define("jant-post-form", JantPostForm);
