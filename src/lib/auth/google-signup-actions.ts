import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi, settingsApi, type AuthUser } from "@/lib/api";
import { resolvePostAuthRedirect } from "@/config";
import { parseActionInput } from "./action-errors";
import {
  GOOGLE_SIGNUP_ACCOUNT_EXISTS_MESSAGE,
  GOOGLE_SIGNUP_PROVIDER_NOT_LINKED_MESSAGE,
  mapGoogleApiError,
} from "./google-login-messages";
import { readSessionToken, writeSessionCookie } from "./session.server";

const googleTokenSchema = z.object({
  idToken: z.string().min(1),
  next: z.string().url().optional().nullable(),
});

const googlePasswordSchema = z.object({
  password: z.string().min(8, "Master password must be at least 8 characters"),
  next: z.string().url().optional().nullable(),
});

export type GoogleSignupStartResult =
  | {
      status: "master-password-required";
      user: AuthUser;
      fullName: string;
      email: string;
    }
  | { status: "ok"; user: AuthUser; redirectTo: string }
  | { status: "error"; message: string; code?: string; httpStatus?: number };

export type GoogleSignupPasswordResult =
  | { status: "ok"; user: AuthUser; redirectTo: string }
  | { status: "error"; message: string; code?: string };

/** Sign up with Google (register intent). Session cookie written before master password step. */
export const googleSignupStartAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => parseActionInput(googleTokenSchema, input))
  .handler(async ({ data }): Promise<GoogleSignupStartResult> => {
    try {
      const response = await authApi.loginWithGoogle({
        idToken: data.idToken,
        flow: "register",
      });

      const token = response.accessToken ?? response.token;
      if (!token || !response.user) {
        return {
          status: "error",
          message: response.message ?? "Google sign-up failed. Please try again.",
          code: response.code,
        };
      }

      writeSessionCookie(token);

      if (response.requiresMasterPasswordSetup !== false) {
        return {
          status: "master-password-required",
          user: response.user,
          fullName: response.user.name ?? response.user.email.split("@")[0] ?? "",
          email: response.user.email,
        };
      }

      return {
        status: "ok",
        user: response.user,
        redirectTo: resolvePostAuthRedirect(data.next ?? null),
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

/** Set master password after Google signup (authenticated session required). */
export const googleSignupSetPasswordAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => parseActionInput(googlePasswordSchema, input))
  .handler(async ({ data }): Promise<GoogleSignupPasswordResult> => {
    const token = readSessionToken();
    if (!token) {
      return { status: "error", message: "Your session expired. Please start sign-up again." };
    }

    try {
      await settingsApi.setLoginPassword(data.password, token);
      const session = await authApi.validateSession(token);
      if (!session.success || !session.user) {
        return { status: "error", message: "Unable to confirm your account. Please sign in." };
      }
      try {
        await authApi.completeOAuthWelcome(token);
      } catch {
        // Non-fatal if welcome already completed.
      }
      return {
        status: "ok",
        user: session.user,
        redirectTo: resolvePostAuthRedirect(data.next ?? null),
      };
    } catch (err) {
      if (err instanceof ApiError) {
        return { status: "error", message: err.message, code: err.code };
      }
      return { status: "error", message: "Could not save your master password. Try again." };
    }
  });
