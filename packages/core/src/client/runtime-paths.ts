import {
  ASSET_BASE_PATH,
  isAssetPath,
  toPublicAssetPath,
} from "../lib/asset-path.js";
import { toPublicHref } from "../lib/url.js";

type FetchInput = Parameters<typeof fetch>[0];

function sitePathPrefix(): string {
  return document.documentElement.dataset.sitePathPrefix || "";
}

function assetBasePath(): string {
  return document.documentElement.dataset.assetBasePath || ASSET_BASE_PATH;
}

export function publicPath(path: string): string {
  if (isAssetPath(path)) {
    return toPublicAssetPath(path, assetBasePath());
  }
  return toPublicHref(path, sitePathPrefix());
}

function normalizeFetchInput(input: FetchInput | URL): FetchInput | URL {
  if (typeof input === "string") {
    if (/^https?:\/\//.test(input)) {
      const url = new URL(input);
      if (url.origin !== window.location.origin) {
        return input;
      }
      url.pathname = publicPath(url.pathname);
      return url.toString();
    }
    return publicPath(input);
  }

  if (input instanceof URL) {
    if (input.origin !== window.location.origin) {
      return input;
    }
    const url = new URL(input.toString());
    url.pathname = publicPath(url.pathname);
    return url;
  }

  const url = new URL(input.url);
  if (url.origin !== window.location.origin) {
    return input;
  }

  url.pathname = publicPath(url.pathname);
  return new Request(url.toString(), input);
}

export function installPrefixedFetch(): void {
  const currentFetch = globalThis.fetch as typeof fetch & {
    __jantPrefixed?: boolean;
  };

  if (currentFetch.__jantPrefixed) {
    return;
  }

  const wrappedFetch: typeof fetch & { __jantPrefixed?: boolean } = (
    input,
    init,
  ) => currentFetch(normalizeFetchInput(input), init);

  wrappedFetch.__jantPrefixed = true;
  globalThis.fetch = wrappedFetch;
}
