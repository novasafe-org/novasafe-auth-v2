import type { AuthUser, GoogleOauthIntent, LoginResponse } from "@/lib/api";

/** Decoded session held by the auth and app projects. */
export interface SessionRecord {
  token: string;
  user: AuthUser;
  /** OAuth-pending sessions still need an email OTP before reaching the app. */
  pending: boolean;
  pendingProvider?: "google" | "apple";
}

export interface PendingOauthSession {
  tempSessionToken: string;
  user: AuthUser;
  provider: "google" | "apple";
  intent?: GoogleOauthIntent | string;
}

/** Convert a `LoginResponse` from the backend into a normalized session. */
export function deriveSessionFromLoginResponse(response: LoginResponse): SessionRecord | null {
  const token = response.accessToken || response.token;
  if (!token || !response.user) return null;
  return {
    token,
    user: response.user,
    pending: false,
  };
}

export type { AuthUser };
