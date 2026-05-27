import { env, runtime } from "./env";

/**
 * Application-level URLs and metadata.
 *
 * Everything here is derived from validated env so screens, redirects, and
 * API calls reference a single source of truth instead of string-literal
 * domains.
 */

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const appConfig = Object.freeze({
  name: "NovaSafe",
  version: env.APP_VERSION,
  /**
   * "novasafe-auth" identifies this surface to the backend trust layer
   * (`X-Source` header). Keep in sync with backend client registry.
   */
  surface: "novasafe-auth-web",
  urls: Object.freeze({
    landing: trimTrailingSlash(env.LANDING_URL),
    auth: trimTrailingSlash(env.AUTH_URL),
    app: trimTrailingSlash(env.APP_URL),
    api: trimTrailingSlash(env.API_URL),
  }),
  runtime,
});

export type AppConfig = typeof appConfig;
