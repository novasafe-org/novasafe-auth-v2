/**
 * Browser-only RevenueCat web SDK wrapper.
 *
 * Why a wrapper:
 *   - Keeps the SDK lazy-loaded (dynamic import) so SSR never tries to
 *     evaluate it. The RC SDK touches `window`, `navigator`, IndexedDB and
 *     the DOM during configure/purchase.
 *   - Centralises `configure()` so we don't accidentally re-configure with
 *     a different appUserId.
 *   - Maps SDK errors into a small discriminated union the paywall can
 *     branch on without leaking SDK enums into UI code.
 *
 * This file MUST NOT be imported from server code paths. Use the
 * `runtime.isBrowser` guard at module scope to fail loud if it ever is.
 */

import { runtime } from "@/config";
import { billingConfig, billingPackageCandidates, type BillingCycle } from "@/config";
import type { PaywallOfferings, PaywallPlan } from "./types";

function assertBrowser(): void {
  if (!runtime.isBrowser) {
    throw new Error("[novasafe-auth] billingClient invoked outside the browser.");
  }
}

/* ------------------------------------------------------------------------- */
/* Result envelopes                                                          */
/* ------------------------------------------------------------------------- */

export type PurchaseOutcome =
  | { status: "completed"; productId: string | null; rcAppUserId: string }
  | { status: "cancelled" }
  | { status: "pending"; message: string }
  | { status: "error"; code: PurchaseErrorCode; message: string };

/** Narrow discriminator for paywall UX — collapses RC's larger error enum. */
export type PurchaseErrorCode =
  | "user_cancelled"
  | "payment_failed"
  | "network"
  | "already_purchased"
  | "configuration"
  | "unknown";

/* ------------------------------------------------------------------------- */
/* Lazy SDK loader                                                           */
/* ------------------------------------------------------------------------- */

type PurchasesModule = typeof import("@revenuecat/purchases-js");

let modulePromise: Promise<PurchasesModule> | null = null;
let configuredForUserId: string | null = null;

async function loadSdk(): Promise<PurchasesModule> {
  assertBrowser();
  if (!modulePromise) {
    modulePromise = import("@revenuecat/purchases-js");
  }
  return modulePromise;
}

/** Configure the SDK once per page-lifetime. Safe to call repeatedly. */
async function ensureConfigured(appUserId: string): Promise<PurchasesModule> {
  if (!billingConfig.enabled) {
    throw new BillingNotConfiguredError();
  }
  const mod = await loadSdk();
  if (!mod.Purchases.isConfigured()) {
    mod.Purchases.configure(billingConfig.publicApiKey, appUserId);
    configuredForUserId = appUserId;
    return mod;
  }
  if (configuredForUserId && configuredForUserId !== appUserId) {
    // App-user-id changed (e.g. a different account signed up in the same tab).
    // Re-configure with the new identity so receipts attribute correctly.
    mod.Purchases.configure(billingConfig.publicApiKey, appUserId);
    configuredForUserId = appUserId;
  }
  return mod;
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("RevenueCat web billing is not configured. Set VITE_REVENUECAT_PUBLIC_API_KEY_WEB.");
    this.name = "BillingNotConfiguredError";
  }
}

/* ------------------------------------------------------------------------- */
/* Public surface                                                            */
/* ------------------------------------------------------------------------- */

export const billingClient = {
  isEnabled(): boolean {
    return billingConfig.enabled;
  },

  /**
   * Load the current Pro offering for `appUserId` and project it down to
   * the narrow `PaywallOfferings` shape our UI consumes.
   */
  async loadOfferings(appUserId: string): Promise<PaywallOfferings> {
    const mod = await ensureConfigured(appUserId);
    const purchases = mod.Purchases.getSharedInstance();
    const offerings = await purchases.getOfferings();
    const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
    if (!offering) {
      return { offeringId: null, monthly: null, yearly: null, packageIds: [] };
    }

    const monthly = pickPlan(offering, "monthly");
    const yearly = pickPlan(offering, "yearly");

    return {
      offeringId: offering.identifier,
      monthly,
      yearly,
      packageIds: offering.availablePackages.map((p) => p.identifier),
    };
  },

  /**
   * Launch the RevenueCat purchase flow for the package matching `cycle`.
   * The RC SDK opens a modal Paddle checkout and resolves once the user
   * either pays, cancels, or hits an error.
   */
  async purchase(input: {
    appUserId: string;
    customerEmail: string;
    cycle: BillingCycle;
  }): Promise<PurchaseOutcome> {
    const { appUserId, customerEmail, cycle } = input;
    let mod: PurchasesModule;
    try {
      mod = await ensureConfigured(appUserId);
    } catch (err) {
      if (err instanceof BillingNotConfiguredError) {
        return { status: "error", code: "configuration", message: err.message };
      }
      throw err;
    }
    const purchases = mod.Purchases.getSharedInstance();

    let rcPackage: import("@revenuecat/purchases-js").Package | null = null;
    try {
      const offerings = await purchases.getOfferings();
      const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
      if (!offering) {
        return {
          status: "error",
          code: "configuration",
          message: "No offering is currently published in RevenueCat.",
        };
      }
      rcPackage = resolvePackage(offering, cycle);
      if (!rcPackage) {
        return {
          status: "error",
          code: "configuration",
          message: `No ${cycle} package found in the current offering.`,
        };
      }
    } catch (err) {
      return mapSdkError(mod, err);
    }

    try {
      const result = await purchases.purchase({
        rcPackage,
        customerEmail,
      });
      const productId = result.storeTransaction?.productIdentifier ?? null;
      return { status: "completed", productId, rcAppUserId: appUserId };
    } catch (err) {
      return mapSdkError(mod, err);
    }
  },
};

/* ------------------------------------------------------------------------- */
/* Internals                                                                 */
/* ------------------------------------------------------------------------- */

function pickPlan(
  offering: import("@revenuecat/purchases-js").Offering,
  cycle: BillingCycle,
): PaywallPlan | null {
  const pkg = resolvePackage(offering, cycle);
  if (!pkg) return null;
  const product = pkg.webBillingProduct;
  const price = product.price;
  // RC's PricingPhase already exposes a locale-formatted per-month rate
  // for yearly subscriptions — prefer that over manual amountMicros math.
  const perMonthFromSdk = product.defaultSubscriptionOption?.base.pricePerMonth?.formattedPrice;
  return {
    packageId: pkg.identifier,
    cycle,
    priceLabel: price?.formattedPrice ?? "",
    currencyCode: price?.currency ?? undefined,
    periodLabel: cycle === "yearly" ? "/year" : "/month",
    effectiveMonthlyLabel:
      cycle === "yearly" ? (perMonthFromSdk ?? formatYearlyAsMonthly(price)) : undefined,
    badge: cycle === "yearly" ? "Best value" : undefined,
  };
}

function resolvePackage(
  offering: import("@revenuecat/purchases-js").Offering,
  cycle: BillingCycle,
): import("@revenuecat/purchases-js").Package | null {
  const direct = cycle === "yearly" ? offering.annual : offering.monthly;
  if (direct) return direct;
  for (const candidate of billingPackageCandidates(cycle)) {
    const pkg = offering.packagesById[candidate];
    if (pkg) return pkg;
  }
  return (
    offering.availablePackages.find((pkg) => {
      const id = pkg.identifier.toLowerCase();
      return cycle === "yearly"
        ? id.includes("year") || id.includes("annual")
        : id.includes("month");
    }) ?? null
  );
}

function formatYearlyAsMonthly(
  price: import("@revenuecat/purchases-js").Price | undefined,
): string | undefined {
  if (!price) return undefined;
  const amount = typeof price.amountMicros === "number" ? price.amountMicros / 12_000_000 : null;
  if (amount === null || !Number.isFinite(amount)) return undefined;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: price.currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${price.currency ?? ""}`.trim();
  }
}

function mapSdkError(mod: PurchasesModule, err: unknown): PurchaseOutcome {
  if (err instanceof mod.PurchasesError) {
    if (err.errorCode === mod.ErrorCode.UserCancelledError) {
      return { status: "cancelled" };
    }
    if (err.errorCode === mod.ErrorCode.PaymentPendingError) {
      return {
        status: "pending",
        message: "Your payment is processing. We'll email you when it clears.",
      };
    }
    if (err.errorCode === mod.ErrorCode.NetworkError) {
      return {
        status: "error",
        code: "network",
        message: "Couldn't reach the payment processor. Check your connection and try again.",
      };
    }
    if (err.errorCode === mod.ErrorCode.ProductAlreadyPurchasedError) {
      return {
        status: "error",
        code: "already_purchased",
        message: "You already have an active Pro subscription.",
      };
    }
    if (err.errorCode === mod.ErrorCode.ConfigurationError) {
      return {
        status: "error",
        code: "configuration",
        message: err.message || "Pro signup is misconfigured. Please try again later.",
      };
    }
    return {
      status: "error",
      code: "payment_failed",
      message: err.message || "Payment couldn't be completed.",
    };
  }
  console.error("[billing] unexpected SDK error", err);
  return { status: "error", code: "unknown", message: "Something went wrong. Try again." };
}
