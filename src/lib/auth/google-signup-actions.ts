import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi, onboardingApi, type AuthUser } from "@/lib/api";
import { resolvePostAuthRedirect } from "@/config";
import { parseActionInput } from "./action-errors";
import { mapGoogleApiError } from "./google-login-messages";
import { writeSessionCookie } from "./session.server";

const googleTokenSchema = z.object({
  idToken: z.string().min(1),
});

const completeGoogleSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8),
  otp: z.string().trim().regex(/^\d{4,8}$/),
  idToken: z.string().min(1),
  googleSignupIntentToken: z.string().min(1),
  next: z.string().url().optional().nullable(),
});

export type GoogleSignupValidateResult =
  | {
      status: "ok";
      email: string;
      fullName: string;
      googleSignupIntentToken: string;
      idToken: string;
    }
  | { status: "error"; message: string; code?: string; httpStatus?: number };

export type CompleteGoogleSignupResult =
  | { status: "ok"; user: AuthUser; redirectTo: string }
  | { status: "invalid-otp"; message: string }
  | { status: "email-taken"; message: string }
  | { status: "error"; message: string; code?: string; httpStatus?: number };

/** Step 1: validate Google token; pre-fill identity (no NovaSafe account yet). */
export const googleSignupValidateAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => parseActionInput(googleTokenSchema, input))
  .handler(async ({ data }): Promise<GoogleSignupValidateResult> => {
    try {
      const response = await authApi.loginWithGoogle({
        idToken: data.idToken,
        flow: "register",
      });

      if (
        response.signupIntent &&
        response.googleSignupIntentToken &&
        response.email
      ) {
        return {
          status: "ok",
          email: response.email,
          fullName: response.fullName ?? response.email.split("@")[0] ?? "",
          googleSignupIntentToken: response.googleSignupIntentToken,
          idToken: data.idToken,
        };
      }

      return {
        status: "error",
        message: response.message ?? "Google sign-up could not start. Try again.",
        code: response.code,
      };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          status: "error",
          message: mapGoogleApiError(err) ?? err.message,
          code: err.code,
          httpStatus: err.status,
        };
      }
      return { status: "error", message: "Google sign-up failed. Please try again." };
    }
  });

/** Steps 2–3: NovaSafe OTP verified, then create Google-linked account + session. */
export const completeGoogleSignupAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => parseActionInput(completeGoogleSignupSchema, input))
  .handler(async ({ data }): Promise<CompleteGoogleSignupResult> => {
    try {
      let signupProofToken: string | undefined;
      try {
        const verified = await onboardingApi.verifyOtp(data.email, data.otp);
        signupProofToken = verified.signupProofToken;
        if (!signupProofToken) {
          return {
            status: "error",
            message: "Email verification did not complete. Request a new code and try again.",
          };
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          return { status: "invalid-otp", message: err.message || "That code didn't match." };
        }
        throw err;
      }

      try {
        await onboardingApi.createGoogleAccount({
          email: data.email,
          fullName: data.fullName,
          password: data.password,
          signupProofToken,
          googleSignupIntentToken: data.googleSignupIntentToken,
          idToken: data.idToken,
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
      return { status: "error", message: "Something went wrong. Try again in a moment." };
    }
  });
