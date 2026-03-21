import { serve, type ServerType } from "@hono/node-server";
import type { AddressInfo } from "node:net";
import type { App } from "../types/app-context.js";
import type { Bindings } from "../types/bindings.js";
import {
  createNodeRequestHandler,
  resolveHost,
  resolvePort,
} from "./request-handler.js";

export {
  applyNodeRuntimeEnvDefaults,
  createNodeBindings,
  createNodeRequestHandler,
  migrate,
  resolveDatabasePath,
  resolveNodeAssetRoot,
  resolveNodeDataDir,
  resolveHost,
  resolveNodeMigrationsDir,
  resolvePort,
  resolvePublicRequestUrl,
} from "./request-handler.js";

export interface NodeServerHandle {
  close(): Promise<void>;
  server: ServerType;
  url: string;
}

export async function start(
  env: Bindings = process.env as unknown as Bindings,
  app?: App,
): Promise<NodeServerHandle> {
  const handler = await createNodeRequestHandler({
    env,
    app: async () => app ?? (await import("../app.js")).createApp(),
  });
  const hostname = resolveHost(env);
  const port = resolvePort(env);

  return new Promise<NodeServerHandle>((resolvePromise, reject) => {
    let didResolve = false;
    const server = serve(
      { fetch: handler.fetch, hostname, port },
      (info: AddressInfo) => {
        didResolve = true;
        server.off("error", onError);

        let closed = false;
        resolvePromise({
          server,
          url: `http://${info.address}:${info.port}`,
          async close() {
            if (closed) {
              return;
            }
            closed = true;
            await new Promise<void>((resolveClose, rejectClose) => {
              server.close((error?: Error) => {
                if (error) {
                  rejectClose(error);
                  return;
                }
                resolveClose();
              });
            });
            await handler.close();
          },
        });
      },
    );

    function onError(error: Error) {
      if (didResolve) {
        return;
      }
      try {
        void handler.close();
      } catch {
        // ignore cleanup failure
      }
      reject(error);
    }

    server.once("error", onError);
  });
}
