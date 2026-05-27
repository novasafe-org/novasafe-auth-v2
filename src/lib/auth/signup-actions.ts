import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi, onboardingApi, type AuthUser } from "@/lib/api";
import { resolvePostAuthRedirect } from "@/config";
import { writeSessionCookie } from "./session.server";

/**
 * Free signup pipeline (also re-used by the Pro signup route in Phase 5,
 * which interposes a paywall between `completeSignupAction` and the final
 * navigation to the app).
 *
 * Backend contract — `services/core/.../onboarding.routes.ts`:
 *   1. POST /api/v1/onboarding/check-email   { email }                       → { exists }
 *   2. POST /api/v1/onboarding/send-otp      { email }                       → { success, message }
 *   3. POST /api/v1/onboarding/verify-otp    { email, otp }                  → 200 ok | 400 invalid
 *   4. POST /api/v1/onboarding/create-account{ email, fullName, password }   → 201 ok | 409 taken
 *   5. POST /api/v1/auth/login               { email, password }             → 200 token + user
 */

/* ------------------------------------------------------------------------- */
/* Result types                                                              */
/* ------------------------------------------------------------------------- */

export type CheckEmailResult =
  | { status: "available" }
  | { status: "taken" }
  | { status: "error"; message: string };

export type RequestOtpResult =
  | { status: "ok"; message: string }
  | { status: "rate-limited"; message: string; retryAfterSeconds?: number }
  | { status: "error"; message: string };

export type CompleteSignupResult =
  | { status: "ok"; user: AuthUser; redirectTo: string }
  | { status: "invalid-otp"; message: string }
  | { status: "email-taken"; message: string }
  | { status: "error"; message: string; code?: string; httpStatus?: number };

/* ------------------------------------------------------------------------- */
/* Validation                                                                */
/* ------------------------------------------------------------------------- */

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Use at least 8 characters");
const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Tell us your full name")
  .max(120, "That name is too long");
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Enter the code from your email");

const checkEmailInput = z.object({ email: emailSchema });
const requestOtpInput = z.object({ email: emailSchema });
const completeSignupInput = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  password: passwordSchema,
  otp: otpSchema,
  next: z.string().url().optional().nullable(),
});

/* ------------------------------------------------------------------------- */
/* Server functions                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Friendly UX gate: tell the user up front if their email is already
 * registered, so they don't waste their time on the password / OTP steps.
 *
 * Returning `error` means the backend was unreachable or behaved
 * unexpectedly — the caller should let the user proceed and surface the
 * real failure (e.g. duplicate email) at `completeSignupAction` time.
 */
export const checkSignupEmailAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkEmailInput.parse(input))
  .handler(async ({ data }): Promise<CheckEmailResult> => {
    try {
      const response = await onboardingApi.checkEmail(data.email);
      return response.exists ? { status: "taken" } : { status: "available" };
    } catch (err) {
      if (err instanceof ApiError) {
        return { status: "error", message: err.message };
      }
      console.error("[checkSignupEmailAction]", err);
      return { status: "error", message: "We couldn't reach the signup service." };
    }
  });

/**
 * Email the user a 6-digit OTP. Used for both the initial send (after
 * password step) and the resend button on the OTP step.
 */
export const requestSignupOtpAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestOtpInput.parse(input))
  .handler(async ({ data }): Promise<RequestOtpResult> => {
    try {
      const response = await onboardingApi.sendOtp(data.email);
      if (!response.success) {
        return { status: "error", message: response.message ?? "Couldn't send the code." };
      }
      return { status: "ok", message: response.message };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const body =
            err.body && typeof err.body === "object" && !Array.isArray(err.body)
              ? (err.body as { retryAfterSeconds?: number })
              : null;
          return {
            status: "rate-limited",
            message: err.message,
            retryAfterSeconds: body?.retryAfterSeconds,
          };
        }
        return { status: "error", message: err.message };
      }
      console.error("[requestSignupOtpAction]", err);
      return { status: "error", message: "We couldn't send the code. Try again in a moment." };
    }
  });

/**
 * Atomic free-signup completion: verify OTP → create account → log in →
 * set HttpOnly session cookie → return the post-auth redirect target.
 *
 * If any step fails, no cookie is written and the user can retry from the
 * appropriate UI state without losing their input.
 */
export const completeSignupAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => completeSignupInput.parse(input))
  .handler(async ({ data }): Promise<CompleteSignupResult> => {
    try {
      try {
        await onboardingApi.verifyOtp(data.email, data.otp);
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          return { status: "invalid-otp", message: err.message || "That code didn't match." };
        }
        throw err;
      }

      try {
        await onboardingApi.createAccount({
          email: data.email,
          fullName: data.fullName,
          password: data.password,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return {
            status: "email-taken",
            message: err.message || "This email already has an account. Try signing in instead.",
          };
        }
        throw err;
      }

      const login = await authApi.login({
        email: data.email,
        password: data.password,
      });
      const token = login.accessToken ?? login.token;
      if (!token || !login.user) {
        return {
          status: "error",
          message:
            login.message ??
            "Account created, but sign-in didn't complete. Please try signing in manually.",
          code: login.code,
        };
      }

      writeSessionCookie(token);
      return {
        status: "ok",
        user: login.user,
        redirectTo: resolvePostAuthRedirect(data.next ?? null),
      };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          status: "error",
          message: err.message,
          code: err.code,
          httpStatus: err.status,
        };
      }
      console.error("[completeSignupAction]", err);
      return { status: "error", message: "Something went wrong. Try again in a moment." };
    }
  });
