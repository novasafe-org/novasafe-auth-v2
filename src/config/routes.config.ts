import { appConfig } from "./app.config";
import { AUTH_PATH, authConfig, type AuthPath } from "./auth.config";

/**
 * URL builders for cross-subdomain navigation.
 *
 * Centralising these keeps redirects environment-aware: localhost dev,
 * staging, and production all flow through the same code paths and only
 * differ in the underlying `appConfig.urls.*` values.
 */

export interface BuildOptions {
  /**
   * Optional path segment appended to the destination origin
   * (must start with `/`, e.g. "/account/billing").
   */
  path?: string;
  /** Optional `next=<url>` parameter. */
  next?: string;
  /** Optional analytics ref. */
  ref?: string;
  /** Extra query-string parameters. Empty values are skipped. */
  query?: Record<string, string | undefined | null>;
}

function applyOptions(url: URL, options?: BuildOptions): URL {
  if (options?.path) {
    const trimmed = options.path.startsWith("/") ? options.path : `/${options.path}`;
    url.pathname = trimmed;
  }
  if (options?.next) url.searchParams.set(authConfig.nextQueryKey, options.next);
  if (options?.ref) url.searchParams.set(authConfig.refQueryKey, options.ref);
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function buildAuthUrlAt(path: AuthPath, options?: Omit<BuildOptions, "path">): string {
  const url = new URL(path, appConfig.urls.auth);
  applyOptions(url, options);
  return url.toString();
}

/** Login screen on this auth project. */
export function buildLoginUrl(options?: Omit<BuildOptions, "path">): string {
  return buildAuthUrlAt(AUTH_PATH.Login, options);
}

/** Free signup screen on this auth project. */
export function buildSignupUrl(options?: Omit<BuildOptions, "path">): string {
  return buildAuthUrlAt(AUTH_PATH.Signup, options);
}

/** Pro signup screen (post-OTP paywall) on this auth project. */
export function buildSignupProUrl(options?: Omit<BuildOptions, "path">): string {
  return buildAuthUrlAt(AUTH_PATH.SignupPro, options);
}

/** Build an absolute URL pointing at the authenticated app project. */
export function buildAppUrl(options?: BuildOptions): string {
  const url = new URL(appConfig.urls.app);
  applyOptions(url, options);
  return url.toString();
}

/** Build an absolute URL pointing at the public marketing site. */
export function buildLandingUrl(options?: BuildOptions): string {
  const url = new URL(appConfig.urls.landing);
  applyOptions(url, options);
  return url.toString();
}

/**
 * Resolve the post-auth redirect target.
 *
 * Order of preference:
 *   1. `next` query parameter (must be an `appConfig.urls.app`-prefixed URL —
 *      anything else is rejected to avoid open-redirect attacks).
 *   2. `appConfig.urls.app` root.
 */
export function resolvePostAuthRedirect(nextRaw: string | null | undefined): string {
  if (!nextRaw) return buildAppUrl();
  try {
    const candidate = new URL(nextRaw);
    const target = new URL(appConfig.urls.app);
    if (candidate.origin === target.origin) {
      return candidate.toString();
    }
  } catch {
    /* ignore — fall through to the safe default */
  }
  return buildAppUrl();
}

export const ROUTES = Object.freeze({
  paths: AUTH_PATH,
  buildLoginUrl,
  buildSignupUrl,
  buildSignupProUrl,
  buildAppUrl,
  buildLandingUrl,
  resolvePostAuthRedirect,
});

export type Routes = typeof ROUTES;
