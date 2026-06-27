import { apiFetch } from "../http";

/**
 * Auth endpoints.
 *
 * Maps directly to `services/core/src/modules/auth/routes/auth.routes.ts`.
 * Backend mounts under `/api/v1/auth` (and `/mobile/auth` for legacy).
 */

const PREFIX = "/api/v1/auth";

/* ------------------------------------------------------------------------- */
/* Shared types                                                              */
/* ------------------------------------------------------------------------- */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export type GoogleOauthIntent =
  | "google_register_pending_email"
  | "google_returning_pending_email"
  | "google_signed_in"
  | "google_register_verified"
  | "google_returning_verified";

export interface DeviceContext {
  deviceModel?: string;
  devicePlatform?: string;
  deviceOsVersion?: string;
}

export interface ExtensionPairPayload extends DeviceContext {
  installationId: string;
  extensionVersion?: string;
}

/* ------------------------------------------------------------------------- */
/* Login                                                                     */
/* ------------------------------------------------------------------------- */

export interface LoginPayload extends DeviceContext {
  email: string;
  password: string;
}

export interface SubscriptionBlockedResponse {
  success: false;
  source?: string;
  code: "NOVASAFE_SUBSCRIPTION_REQUIRED";
  message: string;
  entitlement: string;
  subscription: unknown;
}

/** Either a full session, a 2FA challenge, or a subscription block. */
export interface LoginResponse {
  success: boolean;
  source?: string;
  code?: string;
  message?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string | null;
  user?: AuthUser;
  requiresTwoFactor?: boolean;
  requiresMasterPasswordSetup?: boolean;
  requiresVaultSetup?: boolean;
  /** Set when the OAuth-pending JWT is issued (Google / Apple email OTP step). */
  requiresOtpVerification?: boolean;
  tempSessionToken?: string;
  authProvider?: "google" | "apple" | string;
  oauthIntent?: GoogleOauthIntent | string;
  entitlement?: string;
  subscription?: unknown;
}

/* ------------------------------------------------------------------------- */
/* OAuth (Google)                                                            */
/* ------------------------------------------------------------------------- */

export interface GoogleSignInPayload extends DeviceContext {
  idToken: string;
}

export interface VerifyOtpPayload {
  otp: string;
}

/* ------------------------------------------------------------------------- */
/* Session                                                                   */
/* ------------------------------------------------------------------------- */

export interface ValidateSessionResponse {
  success: boolean;
  source?: string;
  user?: AuthUser;
  pendingNovaSafeEmailVerification?: boolean;
  pendingOtpProvider?: "google" | "apple";
  message?: string;
}

/* ------------------------------------------------------------------------- */
/* API surface                                                               */
/* ------------------------------------------------------------------------- */

export const authApi = {
  login(payload: LoginPayload) {
    return apiFetch<LoginResponse>(`${PREFIX}/login`, {
      method: "POST",
      body: payload,
    });
  },

  verifyTwoFactor(payload: { email: string; code: string } & DeviceContext) {
    return apiFetch<LoginResponse>(`${PREFIX}/2fa/verify`, {
      method: "POST",
      body: payload,
    });
  },

  loginWithGoogle(payload: GoogleSignInPayload) {
    return apiFetch<LoginResponse>(`${PREFIX}/oauth/google`, {
      method: "POST",
      body: payload,
    });
  },

  verifyGoogleOtp(payload: VerifyOtpPayload, tempSessionToken: string) {
    return apiFetch<LoginResponse>(`${PREFIX}/oauth/google/verify-otp`, {
      method: "POST",
      body: payload,
      token: tempSessionToken,
    });
  },

  resendGoogleOtp(tempSessionToken: string) {
    return apiFetch<{ success: boolean; message?: string; retryAfterSeconds?: number }>(
      `${PREFIX}/oauth/google/resend-otp`,
      {
        method: "POST",
        body: {},
        token: tempSessionToken,
      },
    );
  },

  completeOAuthWelcome(token: string) {
    return apiFetch<{ success: boolean; source?: string }>(
      `${PREFIX}/oauth/google/complete-welcome`,
      {
        method: "POST",
        body: {},
        token,
      },
    );
  },

  validateSession(token: string) {
    return apiFetch<ValidateSessionResponse>(`${PREFIX}/validate-session`, {
      method: "GET",
      token,
    });
  },

  pairExtension(payload: ExtensionPairPayload, webSessionToken: string) {
    return apiFetch<LoginResponse>(`${PREFIX}/extension/pair`, {
      method: "POST",
      body: payload,
      token: webSessionToken,
      headers: {
        "X-Source": "BROWSER_EXTENSION",
        "X-Client-Source": "BROWSER_EXTENSION",
        "X-Client-Platform": "extension",
      },
    });
  },

  createExtensionPairingHandoff(
    payload: { installationId: string; state: string },
    webSessionToken: string,
  ) {
    return apiFetch<{ success: boolean; pairingCode?: string; message?: string; code?: string }>(
      `${PREFIX}/extension/pairing-handoff`,
      {
        method: "POST",
        body: payload,
        token: webSessionToken,
      },
    );
  },

  requestPasswordReset(payload: { email: string }) {
    return apiFetch<{ success: boolean; message?: string }>(`${PREFIX}/password-reset/request`, {
      method: "POST",
      body: payload,
    });
  },

  confirmPasswordReset(payload: { email: string; otp: string; newPassword: string }) {
    return apiFetch<{ success: boolean; message?: string }>(`${PREFIX}/password-reset/confirm`, {
      method: "POST",
      body: payload,
    });
  },

  logout(token: string) {
    return apiFetch<{ success: boolean; message?: string }>(`${PREFIX}/logout`, {
      method: "POST",
      body: {},
      token,
    });
  },
};

export type AuthApi = typeof authApi;
