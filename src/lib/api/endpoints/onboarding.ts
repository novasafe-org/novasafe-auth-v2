import { apiFetch } from "../http";

/**
 * Onboarding endpoints.
 *
 * Maps directly to `services/core/src/modules/auth/routes/onboarding.routes.ts`.
 * Backend mounts under `/api/v1/onboarding` (and `/mobile/onboarding` for legacy).
 *
 * Flow on web (free signup):
 *   1. checkEmail()      — friendly duplicate detection (optional UX gate).
 *   2. sendOtp()         — email the user a 6-digit verification code.
 *   3. verifyOtp()       — gate before account creation.
 *   4. createAccount()   — persist the user (no session token returned).
 *   5. /auth/login       — exchange password for a session token.
 */

const PREFIX = "/api/v1/onboarding";

export interface CheckEmailResponse {
  success: boolean;
  source?: string;
  exists: boolean;
}

export interface SendOtpResponse {
  success: boolean;
  source?: string;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  source?: string;
  message: string;
}

export interface CreateAccountPayload {
  email: string;
  fullName: string;
  password: string;
}

export interface CreateAccountResponse {
  success: boolean;
  source?: string;
  message: string;
}

export const onboardingApi = {
  checkEmail(email: string) {
    return apiFetch<CheckEmailResponse>(`${PREFIX}/check-email`, {
      method: "POST",
      body: { email },
    });
  },

  sendOtp(email: string) {
    return apiFetch<SendOtpResponse>(`${PREFIX}/send-otp`, {
      method: "POST",
      body: { email },
    });
  },

  verifyOtp(email: string, otp: string) {
    return apiFetch<VerifyOtpResponse>(`${PREFIX}/verify-otp`, {
      method: "POST",
      body: { email, otp },
    });
  },

  createAccount(payload: CreateAccountPayload) {
    return apiFetch<CreateAccountResponse>(`${PREFIX}/create-account`, {
      method: "POST",
      body: payload,
    });
  },
};

export type OnboardingApi = typeof onboardingApi;
