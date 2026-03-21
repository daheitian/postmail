import { createCloudflareRequestRuntime } from "./cloudflare.js";
import { createNodeRequestRuntime } from "./node.js";
import type { Bindings } from "../types/bindings.js";

export async function createRequestRuntime(
  env: Bindings,
  publicRequestUrl: string,
) {
  if (env.NODE_DATABASE || env.NODE_SQLITE) {
    return createNodeRequestRuntime(env, publicRequestUrl);
  }

  return createCloudflareRequestRuntime(env, publicRequestUrl);
}
