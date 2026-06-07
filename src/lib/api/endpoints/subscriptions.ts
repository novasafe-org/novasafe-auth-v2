import { apiFetch } from "../http";

/**
 * Subscription endpoints.
 *
 * Maps to `services/core/src/modules/subscriptions/routes/subscription.routes.ts`.
 * Mounted at `/api/v1/subscriptions` (and `/mobile/subscriptions` for legacy).
 */

const PREFIX = "/api/v1/subscriptions";

export type PlanTier = "free" | "pro";
export type SubscriptionLifecycleStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "expired"
  | "billing_issue"
  | "grace_period";

export interface SubscriptionEntitlements {
  canUseCloudSync: boolean;
  canUseCSVImportExport: boolean;
  canUseUnlimitedPasswords: boolean;
  canUseUnlimitedNotes: boolean;
  canUsePasswordHistory: boolean;
  canUseAdvancedSecurity: boolean;
  canUseMultiDevice: boolean;
}

export interface SubscriptionLimits {
  maxPasswords: number;
  maxSecureNotes: number;
  maxDevices: number;
}

export interface SubscriptionState {
  tier: PlanTier;
  isPro: boolean;
  productId: string | null;
  entitlementId: string | null;
  isActive: boolean;
  expiresAt: string | null;
  renewsAt: string | null;
  purchasedAt: string | null;
  lastRenewalAt: string | null;
  cancellationAt: string | null;
  inGracePeriod: boolean;
  billingIssueDetectedAt: string | null;
  trialEndsAt: string | null;
  platform: string | null;
  autoRenewing: boolean;
  subscriptionProvider: "revenuecat";
  subscriptionStatus: SubscriptionLifecycleStatus;
  entitlements: SubscriptionEntitlements;
  limits: SubscriptionLimits;
  updatedAt: string;
}

export interface SubscriptionEnvelope<T> {
  success: boolean;
  source?: string;
  data: T;
}

export interface SubscriptionOfferingPackage {
  identifier: string;
  platform_product_identifier?: string;
  platform_product_plan_identifier?: string | null;
  display_name?: string;
  display_price?: string;
  price_string?: string;
  price?: number;
  currency_code?: string;
}

export interface SubscriptionOffering {
  identifier: string;
  server_description?: string;
  available_packages?: SubscriptionOfferingPackage[];
}

export interface SubscriptionOfferings {
  currentOfferingId: string;
  offerings: SubscriptionOffering[];
}

export const subscriptionsApi = {
  getState(token: string, options: { forceRefresh?: boolean } = {}) {
    return apiFetch<SubscriptionEnvelope<SubscriptionState>>(`${PREFIX}/state`, {
      method: "GET",
      token,
      query: { forceRefresh: options.forceRefresh ? "true" : "false" },
    });
  },

  syncState(token: string) {
    return apiFetch<SubscriptionEnvelope<SubscriptionState>>(`${PREFIX}/sync`, {
      method: "POST",
      body: {},
      token,
    });
  },

  getOfferings(token: string) {
    return apiFetch<SubscriptionEnvelope<SubscriptionOfferings>>(`${PREFIX}/offerings`, {
      method: "GET",
      token,
    });
  },

  getMembership(token: string) {
    return apiFetch<
      SubscriptionEnvelope<{
        subscription: SubscriptionState;
        recentActivity: Array<{
          eventType: string;
          processedAt: string | null;
          status?: string;
        }>;
        purchases?: Array<{
          eventId: string;
          eventType: string;
          productId: string | null;
          transactionId: string | null;
          store: string | null;
          environment: string | null;
          purchasedAt: string | null;
        }>;
      }>
    >(`${PREFIX}/membership`, {
      method: "GET",
      token,
    });
  },
};

export type SubscriptionsApi = typeof subscriptionsApi;
