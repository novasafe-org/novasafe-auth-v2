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
import {
  resolveOfferingsCurrency,
  resolvePricingRegion,
  resolvePurchaseLocale,
} from "./locale-currency";
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
type RcOffering = import("@revenuecat/purchases-js").Offering;

let modulePromise: Promise<PurchasesModule> | null = null;
let configuredForUserId: string | null = null;
let preloadPromise: Promise<void> | null = null;

type OfferingCache = {
  appUserId: string;
  offering: RcOffering;
  currencyUsed?: string;
};

let offeringCache: OfferingCache | null = null;

async function loadSdk(): Promise<PurchasesModule> {
  assertBrowser();
  if (!modulePromise) {
    modulePromise = import("@revenuecat/purchases-js");
  }
  return modulePromise;
}

async function ensurePreloaded(mod: PurchasesModule): Promise<void> {
  if (!preloadPromise) {
    const purchases = mod.Purchases.getSharedInstance();
    preloadPromise = purchases.preload().catch((err) => {
      console.warn("[billing] preload failed (checkout may still work)", err);
      preloadPromise = null;
    });
  }
  await preloadPromise;
}

/** Configure the SDK once per page-lifetime. Safe to call repeatedly. */
async function ensureConfigured(appUserId: string): Promise<PurchasesModule> {
  if (!billingConfig.enabled) {
    throw new BillingNotConfiguredError();
  }
  const mod = await loadSdk();
  const config = { apiKey: billingConfig.publicApiKey, appUserId };
  if (!mod.Purchases.isConfigured()) {
    mod.Purchases.configure(config);
    configuredForUserId = appUserId;
    void ensurePreloaded(mod);
    return mod;
  }
  if (configuredForUserId && configuredForUserId !== appUserId) {
    mod.Purchases.configure(config);
    configuredForUserId = appUserId;
    preloadPromise = null;
    offeringCache = null;
    void ensurePreloaded(mod);
  }
  return mod;
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("RevenueCat web billing is not configured. Set VITE_REVENUECAT_PUBLIC_API_KEY_WEB.");
    this.name = "BillingNotConfiguredError";
  }
}

async function fetchCurrentOffering(
  purchases: import("@revenuecat/purchases-js").Purchases,
): Promise<{ offering: RcOffering; currencyUsed?: string }> {
  const preferred = resolveOfferingsCurrency();

  const load = async (currency?: string) => {
    const offerings = await purchases.getOfferings(currency ? { currency } : undefined);
    const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
    return { offering, currency };
  };

  if (preferred) {
    const localized = await load(preferred);
    const returnedCurrency =
      localized.offering?.availablePackages[0]?.webBillingProduct?.price?.currency;
    if (localized.offering && returnedCurrency === preferred) {
      return { offering: localized.offering, currencyUsed: preferred };
    }
    console.info(
      `[billing] ${preferred} not available from provider (got ${returnedCurrency ?? "none"}); using geo/default`,
    );
  }

  const fallback = await load(undefined);
  if (!fallback.offering) {
    throw new Error("No offering is currently published in RevenueCat.");
  }
  return { offering: fallback.offering, currencyUsed: fallback.currency };
}

function rememberOffering(appUserId: string, offering: RcOffering, currencyUsed?: string): void {
  offeringCache = { appUserId, offering, currencyUsed };
}

async function resolveOfferingForUser(
  appUserId: string,
  purchases: import("@revenuecat/purchases-js").Purchases,
): Promise<RcOffering> {
  if (offeringCache?.appUserId === appUserId) {
    return offeringCache.offering;
  }
  await ensurePreloaded(await loadSdk());
  const { offering, currencyUsed } = await fetchCurrentOffering(purchases);
  rememberOffering(appUserId, offering, currencyUsed);
  return offering;
}

/* ------------------------------------------------------------------------- */
/* Public surface                                                            */
/* ------------------------------------------------------------------------- */

export const billingClient = {
  isEnabled(): boolean {
    return billingConfig.enabled;
  },

  async loadOfferings(appUserId: string): Promise<PaywallOfferings> {
    const mod = await ensureConfigured(appUserId);
    const purchases = mod.Purchases.getSharedInstance();
    try {
      const { offering, currencyUsed } = await fetchCurrentOffering(purchases);
      rememberOffering(appUserId, offering, currencyUsed);

      const monthly = pickPlan(offering, "monthly");
      const yearly = pickPlan(offering, "yearly");

      return {
        offeringId: offering.identifier,
        monthly,
        yearly,
        packageIds: offering.availablePackages.map((p) => p.identifier),
        currencyCode: monthly?.currencyCode ?? yearly?.currencyCode ?? currencyUsed,
        pricingRegion: resolvePricingRegion(),
        requestedCurrency: currencyUsed,
      };
    } catch (err) {
      console.error("[billing] loadOfferings failed", err);
      return {
        offeringId: null,
        monthly: null,
        yearly: null,
        packageIds: [],
        currencyCode: resolveOfferingsCurrency(),
        pricingRegion: resolvePricingRegion(),
      };
    }
  },

  async getManagementUrl(appUserId: string): Promise<
    | { status: "ready"; url: string }
    | { status: "unavailable"; message: string }
    | { status: "error"; code: PurchaseErrorCode; message: string }
  > {
    let mod: PurchasesModule;
    try {
      mod = await ensureConfigured(appUserId);
    } catch (err) {
      if (err instanceof BillingNotConfiguredError) {
        return { status: "unavailable", message: err.message };
      }
      throw err;
    }
    try {
      const purchases = mod.Purchases.getSharedInstance();
      const info = await purchases.getCustomerInfo();
      const url = info.managementURL;
      if (!url) {
        return {
          status: "unavailable",
          message: "No subscription management portal is available for this account yet.",
        };
      }
      return { status: "ready", url };
    } catch (err) {
      const mapped = mapSdkError(mod, err);
      if (mapped.status === "cancelled") {
        return { status: "unavailable", message: "Subscription management was cancelled." };
      }
      if (mapped.status === "error") {
        return { status: "error", code: mapped.code, message: mapped.message };
      }
      return { status: "unavailable", message: "Couldn't open the subscription portal." };
    }
  },

  async purchase(input: {
    appUserId: string;
    customerEmail: string;
    cycle: BillingCycle;
    htmlTarget?: HTMLElement;
  }): Promise<PurchaseOutcome> {
    const { appUserId, customerEmail, cycle, htmlTarget } = input;
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
      await ensurePreloaded(mod);
      offeringCache = null;
      const { offering } = await fetchCurrentOffering(purchases);
      rememberOffering(appUserId, offering);
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
      const selectedLocale = resolvePurchaseLocale();
      const purchaseParams: import("@revenuecat/purchases-js").PurchaseParams = {
        rcPackage,
        customerEmail: customerEmail.trim(),
      };
      if (selectedLocale) {
        purchaseParams.selectedLocale = selectedLocale;
        purchaseParams.defaultLocale = selectedLocale;
      }
      if (htmlTarget && htmlTarget.isConnected && htmlTarget.clientHeight > 0) {
        purchaseParams.htmlTarget = htmlTarget;
      }
      const result = await purchases.purchase(purchaseParams);
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

function pickPlan(offering: RcOffering, cycle: BillingCycle): PaywallPlan | null {
  const pkg = resolvePackage(offering, cycle);
  if (!pkg) return null;
  const product = pkg.webBillingProduct;
  const price = product.price;
  const perMonthFromSdk = product.defaultSubscriptionOption?.base.pricePerMonth?.formattedPrice;
  return {
    packageId: pkg.identifier,
    cycle,
    priceLabel: price?.formattedPrice ?? "",
    currencyCode: price?.currency ?? undefined,
    amountMicros:
      typeof price?.amountMicros === "number" ? price.amountMicros : undefined,
    periodLabel: cycle === "yearly" ? "/year" : "/month",
    effectiveMonthlyLabel:
      cycle === "yearly" ? (perMonthFromSdk ?? formatYearlyAsMonthly(price)) : undefined,
    badge: cycle === "yearly" ? "Best value" : undefined,
  };
}

function resolvePackage(
  offering: RcOffering,
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
  if (!price?.currency) return undefined;
  const amount = typeof price.amountMicros === "number" ? price.amountMicros / 12_000_000 : null;
  if (amount === null || !Number.isFinite(amount)) return undefined;
  try {
    return new Intl.NumberFormat(resolvePurchaseLocale(), {
      style: "currency",
      currency: price.currency,
    }).format(amount);
  } catch {
    return undefined;
  }
}

function mapSdkError(mod: PurchasesModule, err: unknown): PurchaseOutcome {
  if (err instanceof mod.PurchasesError) {
    const backendCode =
      typeof (err as { backendErrorCode?: number }).backendErrorCode === "number"
        ? (err as { backendErrorCode: number }).backendErrorCode
        : undefined;

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
    if (err.errorCode === mod.ErrorCode.PurchaseInvalidError) {
      return {
        status: "error",
        code: "payment_failed",
        message:
          "Checkout couldn't start. Refresh the page and try again. If this keeps happening, contact support@novasafe.app.",
      };
    }
    if (
      backendCode === 7878 ||
      err.errorCode === mod.ErrorCode.ProductNotAvailableForPurchaseError
    ) {
      return {
        status: "error",
        code: "payment_failed",
        message:
          "Checkout couldn't be opened. This can happen after a previous subscription expires — wait a few minutes and try again, or email support@novasafe.app for help.",
      };
    }
    return {
      status: "error",
      code: "payment_failed",
      message: err.message || "Payment couldn't be completed.",
    };
  }
  if (err instanceof Error && err.message.includes("No offering")) {
    return {
      status: "error",
      code: "configuration",
      message: err.message,
    };
  }
  console.error("[billing] unexpected SDK error", err);
  return { status: "error", code: "unknown", message: "Something went wrong. Try again." };
}
