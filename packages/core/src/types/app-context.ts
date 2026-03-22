/**
 * App Context Types
 *
 * Shared app-level types used across routes, middleware, and lib.
 * Lives here (not in app.tsx) to avoid forbidden upward imports
 * from feature modules to composition roots.
 */

import type { Hono } from "hono";
import type { Services } from "../services/index.js";
import type { HostedHandoffService } from "../services/hosted-handoff.js";
import type { Auth } from "../auth.js";
import type { AppConfig } from "./config.js";
import type { StorageDriver } from "../lib/storage.js";
import type { Bindings } from "./bindings.js";
import type { Site, SiteDomain } from "./entities.js";

export interface AppVariables {
  services: Services;
  hostedHandoff: HostedHandoffService;
  auth: Auth;
  currentSite: Site;
  currentSiteDomain: SiteDomain | null;
  appConfig: AppConfig;
  allSettings: Record<string, string>;
  themeStyle: string;
  storage: StorageDriver | null;
  publicRequestUrl: string;
  publicPath: string;
}

export type App = Hono<{ Bindings: Bindings; Variables: AppVariables }>;
