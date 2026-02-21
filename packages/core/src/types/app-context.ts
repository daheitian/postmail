/**
 * App Context Types
 *
 * Shared app-level types used across routes, middleware, and lib.
 * Lives here (not in app.tsx) to avoid forbidden upward imports
 * from feature modules to composition roots.
 */

import type { Hono } from "hono";
import type { Services } from "../services/index.js";
import type { Auth } from "../auth.js";
import type { JantConfig } from "./config.js";
import type { StorageDriver } from "../lib/storage.js";
import type { Bindings } from "./bindings.js";

export interface AppVariables {
  services: Services;
  auth: Auth;
  config: JantConfig;
  themeStyle: string;
  customCSS: string;
  isAuthenticated: boolean;
  storage: StorageDriver | null;
  faviconUrl?: string;
  faviconVersion?: string;
  noindex?: boolean;
}

export type App = Hono<{ Bindings: Bindings; Variables: AppVariables }>;
