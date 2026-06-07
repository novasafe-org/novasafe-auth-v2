import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi, subscriptionsApi, type AuthUser } from "@/lib/api";
import { buildAppUrl, resolvePostAuthRedirect } from "@/config";
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
export type GoogleLoginResult =
  | {
      status: "ok";
      user: AuthUser;
      redirectTo: string;
    }
  | {
      status: "otp-required";
      message: string;
      provider?: "google" | "apple" | string;
      intent?: string;
    }
  | {
      status: "error";
      message: string;
      code?: string;
      httpStatus?: number;
    };

/* ------------------------------------------------------------------------- */
/* Validation                                                                */
/* ------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  next: z.string().url().optional().nullable(),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
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
 * Google OAuth sign-in for web.
 *
 * Browser obtains the Google ID token via GIS, server exchanges it with the
 * core backend, then writes our HttpOnly session cookie (same as email login).
 */
export const googleLoginAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => googleLoginSchema.parse(input))
  .handler(async ({ data }): Promise<GoogleLoginResult> => {
    try {
      const response = await authApi.loginWithGoogle({
        idToken: data.idToken,
      });

      if (response.requiresOtpVerification || response.pendingOtpProvider) {
        return {
          status: "otp-required",
          message:
            response.message ??
            "This Google account still needs email verification before you can continue.",
          provider: response.authProvider,
          intent: response.oauthIntent,
        };
      }

      const token = response.accessToken ?? response.token;
      if (!token || !response.user) {
        return {
          status: "error",
          message: response.message ?? "Google sign-in failed. Please try again.",
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
      if (err instanceof ApiError) {
        return {
          status: "error",
          message: err.message,
          code: err.code,
          httpStatus: err.status,
        };
      }
      console.error("[googleLoginAction] unexpected error", err);
      return {
        status: "error",
        message: "Google sign-in failed. Please try again in a moment.",
      };
    }
  });

/**
 * Used by guest-only auth routes. If a valid session cookie exists, return
 * where the browser should go instead of showing login/signup again.
 */
export const redirectIfAuthenticatedAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        next: z.string().url().optional().nullable(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<{ redirectTo: string | null }> => {
    const token = readSessionToken();
    if (!token) return { redirectTo: null };

    try {
      const response = await authApi.validateSession(token);
      if (
        response.success &&
        response.user &&
        !response.pendingOtpProvider &&
        !response.pendingNovaSafeEmailVerification
      ) {
        if (data.next) {
          return { redirectTo: resolvePostAuthRedirect(data.next) };
        }
        return { redirectTo: buildAppUrl({ path: "/vault" }) };
      }
    } catch {
      /* treat as guest */
    }

    return { redirectTo: null };
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

export type LoadUpgradeSessionResult =
  | { status: "ready"; user: AuthUser; returnTo: string }
  | { status: "already-pro"; redirectTo: string }
  | { status: "unauthorized" };

export type LoadManageBillingSessionResult =
  | { status: "ready"; user: AuthUser; returnTo: string }
  | { status: "no-subscription"; redirectTo: string }
  | { status: "unauthorized" };

/**
 * Gate for `/upgrade`. Requires a valid session and skips the paywall when
 * the user already has an active Pro subscription.
 */
export const loadUpgradeSessionAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        next: z.string().url().optional().nullable(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<LoadUpgradeSessionResult> => {
    const token = readSessionToken();
    if (!token) return { status: "unauthorized" };

    try {
      const session = await authApi.validateSession(token);
      if (
        !session.success ||
        !session.user ||
        session.pendingOtpProvider ||
        session.pendingNovaSafeEmailVerification
      ) {
        return { status: "unauthorized" };
      }

      const state = await subscriptionsApi.getState(token, { forceRefresh: true });
      if (state.data.isPro && state.data.isActive) {
        return {
          status: "already-pro",
          redirectTo: resolvePostAuthRedirect(data.next) || buildAppUrl({ path: "/account/billing" }),
        };
      }

      return {
        status: "ready",
        user: session.user,
        returnTo: resolvePostAuthRedirect(data.next) || buildAppUrl({ path: "/account/billing" }),
      };
    } catch {
      return { status: "unauthorized" };
    }
  });

/**
 * Gate for `/billing/manage`. Requires a session and a subscription history
 * (active Pro, cancelled-but-active, or prior purchases).
 */
export const loadManageBillingSessionAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        next: z.string().url().optional().nullable(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<LoadManageBillingSessionResult> => {
    const token = readSessionToken();
    if (!token) return { status: "unauthorized" };

    try {
      const session = await authApi.validateSession(token);
      if (
        !session.success ||
        !session.user ||
        session.pendingOtpProvider ||
        session.pendingNovaSafeEmailVerification
      ) {
        return { status: "unauthorized" };
      }

      const membership = await subscriptionsApi.getMembership(token);
      const sub = membership.data.subscription;
      const hasPurchases = (membership.data.purchases?.length ?? 0) > 0;
      const hasProAccess =
        sub.isPro ||
        sub.inGracePeriod ||
        sub.subscriptionStatus === "cancelled" ||
        sub.subscriptionStatus === "billing_issue" ||
        sub.subscriptionStatus === "grace_period";
      const returnTo =
        resolvePostAuthRedirect(data.next) || buildAppUrl({ path: "/account/billing" });

      if (!hasProAccess && !hasPurchases) {
        return { status: "no-subscription", redirectTo: returnTo };
      }

      return { status: "ready", user: session.user, returnTo };
    } catch {
      return { status: "unauthorized" };
    }
  });
