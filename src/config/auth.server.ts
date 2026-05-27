import { serverEnv } from "./env.server";
import { runtime } from "./env";

/**
 * Server-only auth configuration (cookie attributes).
 *
 * Encodes the cookie policy as a single object so route handlers, server
 * functions, and middleware never disagree about how the session cookie is
 * set/cleared.
 */

export const authServerConfig = Object.freeze({
  cookie: Object.freeze({
    name: serverEnv.AUTH_COOKIE_NAME,
    /** Empty string = host-only cookie (correct for localhost). */
    domain: serverEnv.AUTH_COOKIE_DOMAIN || undefined,
    secure: serverEnv.AUTH_COOKIE_SECURE,
    sameSite: serverEnv.AUTH_COOKIE_SAMESITE,
    maxAgeSeconds: serverEnv.AUTH_COOKIE_MAX_AGE,
    path: serverEnv.AUTH_COOKIE_PATH,
    httpOnly: true,
  }),
  runtime,
});

export type AuthServerConfig = typeof authServerConfig;
