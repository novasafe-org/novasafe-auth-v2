import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import { authServerConfig } from "@/config/auth.server";
import { runtime } from "@/config";

/**
 * Server-only session cookie helpers.
 *
 * Built on TanStack Start's request-scoped cookie primitives (which use
 * AsyncLocalStorage to bind to the current request), so callers don't have to
 * shuffle Headers around themselves. All cookie attributes — name, domain,
 * secure flag, sameSite, path, max-age — come from `authServerConfig` so the
 * auth and app projects stay in lock-step across environments.
 *
 * IMPORTANT: this module must only be imported from server-only contexts
 * (server functions, route loaders/beforeLoad on the server, middleware).
 */

if (runtime.isBrowser) {
  throw new Error("[novasafe-auth] session.server.ts was imported from the browser bundle.");
}

interface WriteOptions {
  /** Override max-age (seconds). Defaults to `authServerConfig.cookie.maxAgeSeconds`. */
  maxAgeSeconds?: number;
}

/** Read the session token from the current request's cookies. */
export function readSessionToken(): string | null {
  const value = getCookie(authServerConfig.cookie.name);
  return value && value.length > 0 ? value : null;
}

/** Write the session token as an HttpOnly cookie on the current response. */
export function writeSessionCookie(token: string, options: WriteOptions = {}): void {
  setCookie(authServerConfig.cookie.name, token, {
    domain: authServerConfig.cookie.domain,
    path: authServerConfig.cookie.path,
    secure: authServerConfig.cookie.secure,
    httpOnly: authServerConfig.cookie.httpOnly,
    sameSite: authServerConfig.cookie.sameSite,
    maxAge: options.maxAgeSeconds ?? authServerConfig.cookie.maxAgeSeconds,
  });
}

/** Clear the session cookie on the current response. */
export function clearSessionCookie(): void {
  deleteCookie(authServerConfig.cookie.name, {
    domain: authServerConfig.cookie.domain,
    path: authServerConfig.cookie.path,
  });
}

export const sessionCookie = Object.freeze({
  name: authServerConfig.cookie.name,
  read: readSessionToken,
  write: writeSessionCookie,
  clear: clearSessionCookie,
});

export type SessionCookieHelpers = typeof sessionCookie;
