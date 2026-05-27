import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi, type AuthUser } from "@/lib/api";
import { resolvePostAuthRedirect } from "@/config";
import { clearSessionCookie, readSessionToken, writeSessionCookie } from "./session.server";

/**
 * Server functions that bridge the auth UI to the NovaSafe Core backend.
 *
 * They run server-side (TanStack Start RPC) and own the HttpOnly session
 * cookie — the browser never sees the bearer token directly.
 *
 * Every action returns a discriminated union so the calling component can
 * branch precisely without parsing strings.
 */

/* ------------------------------------------------------------------------- */
/* Result types                                                              */
/* ------------------------------------------------------------------------- */

export type LoginResult =
  | {
      status: "ok";
      user: AuthUser;
      redirectTo: string;
    }
  | {
      status: "two-factor-required";
      email: string;
      message: string;
    }
  | {
      status: "subscription-blocked";
      message: string;
      entitlement?: string;
    }
  | {
      status: "error";
      message: string;
      code?: string;
      httpStatus?: number;
    };

export type LogoutResult = { status: "ok" } | { status: "error"; message: string };

/* ------------------------------------------------------------------------- */
/* Validation                                                                */
/* ------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  next: z.string().url().optional().nullable(),
});

const verifyTwoFactorSchema = z.object({
  email: z.string().trim().email(),
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "Enter the 6-digit code"),
  next: z.string().url().optional().nullable(),
});

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function toApiErrorResult(err: unknown): LoginResult {
  if (err instanceof ApiError) {
    if (err.code === "NOVASAFE_SUBSCRIPTION_REQUIRED") {
      const body = (err.body && typeof err.body === "object" ? err.body : null) as {
        entitlement?: string;
      } | null;
      return {
        status: "subscription-blocked",
        message: err.message,
        entitlement: body?.entitlement,
      };
    }
    return {
      status: "error",
      message: err.message,
      code: err.code,
      httpStatus: err.status,
    };
  }
  console.error("[loginAction] unexpected error", err);
  return {
    status: "error",
    message: "Something went wrong. Try again in a moment.",
  };
}

/* ------------------------------------------------------------------------- */
/* Server functions                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Email + password login.
 *
 * On success, sets the HttpOnly session cookie and returns the post-auth
 * redirect URL (cross-subdomain to the app).
 */
export const loginAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }): Promise<LoginResult> => {
    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
      });

      if (response.requiresTwoFactor) {
        return {
          status: "two-factor-required",
          email: data.email,
          message: response.message ?? "We sent a verification code to your email.",
        };
      }

      const token = response.accessToken ?? response.token;
      if (!token || !response.user) {
        return {
          status: "error",
          message: response.message ?? "Login failed. Please try again.",
          code: response.code,
        };
      }

      writeSessionCookie(token);

      return {
        status: "ok",
        user: response.user,
        redirectTo: resolvePostAuthRedirect(data.next ?? null),
      };
    } catch (err) {
      return toApiErrorResult(err);
    }
  });

/**
 * Verify the 6-digit two-factor code returned after `loginAction` reports
 * `two-factor-required`. Sets the session cookie on success.
 */
export const verifyTwoFactorAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyTwoFactorSchema.parse(input))
  .handler(async ({ data }): Promise<LoginResult> => {
    try {
      const response = await authApi.verifyTwoFactor({
        email: data.email,
        code: data.code,
      });

      const token = response.accessToken ?? response.token;
      if (!token || !response.user) {
        return {
          status: "error",
          message: response.message ?? "Verification failed. Try again.",
          code: response.code,
        };
      }

      writeSessionCookie(token);

      return {
        status: "ok",
        user: response.user,
        redirectTo: resolvePostAuthRedirect(data.next ?? null),
      };
    } catch (err) {
      return toApiErrorResult(err);
    }
  });

/**
 * Best-effort logout: tells the backend to revoke the session, then clears
 * the cookie regardless of the API response.
 */
export const logoutAction = createServerFn({ method: "POST" }).handler(
  async (): Promise<LogoutResult> => {
    const token = readSessionToken();
    try {
      if (token) {
        await authApi.logout(token).catch(() => undefined);
      }
      return { status: "ok" };
    } finally {
      clearSessionCookie();
    }
  },
);
