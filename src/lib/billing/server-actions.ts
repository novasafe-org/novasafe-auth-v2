import { createServerFn } from "@tanstack/react-start";

import { ApiError, subscriptionsApi } from "@/lib/api";
import { readSessionToken } from "@/lib/auth/session.server";
import type { SubscriptionSnapshot, SubscriptionTier } from "./types";

/**
 * Server functions that bridge the paywall UI to the NovaSafe Core
 * subscription endpoints.
 *
 * The HttpOnly session cookie is read on the server only — the browser
 * never sees the bearer token. After a RevenueCat purchase, the SDK reports
 * success but the backend's source of truth (the user's `subscription`
 * document) is updated asynchronously via webhook. We therefore call
 * `POST /api/v1/subscriptions/sync` to force an immediate refresh and then
 * assert the Pro entitlement on the resulting state.
 */

/* ------------------------------------------------------------------------- */
/* Result types                                                              */
/* ------------------------------------------------------------------------- */

export type ConfirmEntitlementResult =
  | { status: "active"; subscription: SubscriptionSnapshot }
  | { status: "pending"; subscription: SubscriptionSnapshot; message: string }
  | { status: "missing"; subscription: SubscriptionSnapshot; message: string }
  | { status: "unauthorized"; message: string }
  | { status: "error"; message: string; code?: string; httpStatus?: number };

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function toSnapshot(state: {
  tier?: string;
  isActive?: boolean;
  productId?: string | null;
  expiresAt?: string | null;
  renewsAt?: string | null;
  subscriptionStatus?: string;
  inGracePeriod?: boolean;
}): SubscriptionSnapshot {
  const tier: SubscriptionTier = state.tier === "pro" ? "pro" : "free";
  return {
    tier,
    isActive: Boolean(state.isActive),
    productId: state.productId ?? null,
    expiresAt: state.expiresAt ?? null,
    renewsAt: state.renewsAt ?? null,
    status: state.subscriptionStatus ?? (state.inGracePeriod ? "grace_period" : "inactive"),
  };
}

function unauthorized(message = "You need to sign in again."): ConfirmEntitlementResult {
  return { status: "unauthorized", message };
}

function genericError(err: unknown, fallback: string): ConfirmEntitlementResult {
  if (err instanceof ApiError) {
    if (err.status === 401) return unauthorized();
    return {
      status: "error",
      message: err.message,
      code: err.code,
      httpStatus: err.status,
    };
  }
  console.error("[billing/server-actions]", err);
  return { status: "error", message: fallback };
}

/* ------------------------------------------------------------------------- */
/* Server functions                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Force-refresh the user's subscription state from RevenueCat REST and
 * report whether the Pro entitlement is active.
 *
 * Called immediately after a successful client-side `purchases.purchase()`.
 * The backend may still be processing the RC webhook — in that case we
 * return `pending` so the UI can show a friendly "we're confirming your
 * payment" state and retry.
 */
export const confirmProEntitlementAction = createServerFn({ method: "POST" }).handler(
  async (): Promise<ConfirmEntitlementResult> => {
    const token = readSessionToken();
    if (!token) return unauthorized();

    try {
      const response = await subscriptionsApi.syncState(token);
      const state = response.data;
      const snapshot = toSnapshot(state);

      if (snapshot.tier === "pro" && snapshot.isActive) {
        return { status: "active", subscription: snapshot };
      }
      // RC processed the charge but our backend hasn't applied the webhook
      // yet (or the user's tier is still computing as free).
      return {
        status: "pending",
        subscription: snapshot,
        message: "Payment confirmed — finalising your Pro access.",
      };
    } catch (err) {
      return genericError(err, "Couldn't confirm your subscription. Try again in a moment.");
    }
  },
);

/**
 * Lightweight read of the current subscription state. Useful when the
 * paywall mounts and we want to avoid showing the upsell to a user who
 * already has Pro from another device (e.g. mobile).
 */
export const loadSubscriptionStateAction = createServerFn({ method: "POST" }).handler(
  async (): Promise<ConfirmEntitlementResult> => {
    const token = readSessionToken();
    if (!token) return unauthorized();

    try {
      const response = await subscriptionsApi.getState(token, { forceRefresh: false });
      const snapshot = toSnapshot(response.data);
      if (snapshot.tier === "pro" && snapshot.isActive) {
        return { status: "active", subscription: snapshot };
      }
      return {
        status: "missing",
        subscription: snapshot,
        message: "No active Pro subscription on this account.",
      };
    } catch (err) {
      return genericError(err, "Couldn't load your subscription state.");
    }
  },
);
