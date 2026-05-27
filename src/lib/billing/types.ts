/**
 * Project-level billing types.
 *
 * The `@revenuecat/purchases-js` SDK ships its own types for `Offering`,
 * `Package`, `Product`, etc. — but those are huge surfaces tied to RC's
 * entire web billing pipeline. The shapes below are the narrow subset our
 * paywall UI cares about, plus the server-action result envelopes.
 *
 * Keeping the SDK's types out of this file means consumers (server actions,
 * route loaders) don't accidentally pull in the RC client bundle on the
 * server. Browser-only code in `client.ts` re-exports the SDK directly.
 */

/** Marketing-friendly billing cycle. Mirrors `BillingCycle` in `billing.config.ts`. */
export type PaywallCycle = "monthly" | "yearly";

/** Tier resolved from the backend after a purchase webhook fires. */
export type SubscriptionTier = "free" | "pro";

export interface PaywallPlan {
  /** RevenueCat package identifier (e.g. `$rc_monthly`, `$rc_annual`). */
  packageId: string;
  cycle: PaywallCycle;
  /** Localised price string (e.g. `$3.99`, `€39`). */
  priceLabel: string;
  /** Optional currency code from RC (e.g. `USD`). */
  currencyCode?: string;
  /** "/month" or "/year". */
  periodLabel: string;
  /** Equivalent monthly price for the yearly plan, used for "save X%" copy. */
  effectiveMonthlyLabel?: string;
  /** Marketing badge — e.g. "Best value · save 40%". */
  badge?: string;
}

export interface PaywallOfferings {
  offeringId: string | null;
  monthly: PaywallPlan | null;
  yearly: PaywallPlan | null;
  /** Raw RC packages keyed by their identifier — handed back to the SDK on purchase. */
  packageIds: string[];
}

export interface SubscriptionSnapshot {
  tier: SubscriptionTier;
  isActive: boolean;
  productId: string | null;
  /** ISO-8601 timestamp when the current period ends. */
  expiresAt: string | null;
  /** ISO-8601 timestamp when the current period renews. */
  renewsAt: string | null;
  /** Human-readable lifecycle status (`active`, `cancelled`, `billing_issue`, …). */
  status: string;
}
