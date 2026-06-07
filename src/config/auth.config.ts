import { env } from "./env";

/**
 * Auth-flow configuration that is safe for the browser bundle.
 * Cookie attributes live in `auth.server.ts` (server-only).
 *
 * Path-based routing — every auth screen has a real URL on this project
 * (e.g. `/login`, `/signup`, `/signup/pro`). We do NOT smuggle flow state
 * through query parameters.
 */

export const AUTH_PATH = {
  Login: "/login",
  Signup: "/signup",
  SignupPro: "/signup/pro",
  Upgrade: "/upgrade",
  BillingManage: "/billing/manage",
} as const;

export type AuthPath = (typeof AUTH_PATH)[keyof typeof AUTH_PATH];

const AUTH_PATH_VALUES: ReadonlySet<string> = new Set(Object.values(AUTH_PATH));

/** True if `pathname` is one of our canonical auth screens. */
export function isAuthPath(pathname: string | null | undefined): pathname is AuthPath {
  if (!pathname) return false;
  return AUTH_PATH_VALUES.has(pathname);
}

export const authConfig = Object.freeze({
  paths: AUTH_PATH,
  google: Object.freeze({
    webClientId: env.GOOGLE_WEB_CLIENT_ID,
    enabled: env.GOOGLE_WEB_CLIENT_ID.length > 0,
  }),
  /** Open-redirect-safe `next` parameter (validated server-side). */
  nextQueryKey: "next",
  /** Optional analytics ref forwarded from landing CTAs. Not security-relevant. */
  refQueryKey: "ref",
});

export type AuthConfig = typeof authConfig;
