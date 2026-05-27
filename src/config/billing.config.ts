import { env } from "./env";

/**
 * RevenueCat Web Billing (Paddle) configuration for the Pro signup paywall.
 *
 * All keys here are public — the RevenueCat web SDK key is intentionally
 * browser-safe. Server-side webhook verification stays in the backend.
 */

export type BillingCycle = "monthly" | "yearly";

function uniq(values: ReadonlyArray<string | undefined>): string[] {
  return Array.from(new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0)));
}

export const billingConfig = Object.freeze({
  /** Empty string disables RevenueCat in the UI (Pro paywall falls back to error). */
  publicApiKey: env.REVENUECAT_PUBLIC_API_KEY_WEB,
  enabled: env.REVENUECAT_PUBLIC_API_KEY_WEB.length > 0,
  proEntitlementId: env.REVENUECAT_ENTITLEMENT_PRO,
  packages: Object.freeze({
    monthlyCandidates: uniq([
      env.REVENUECAT_PACKAGE_MONTHLY,
      "$rc_monthly",
      "novasafe_pro_monthly",
      "monthly",
    ]),
    yearlyCandidates: uniq([
      env.REVENUECAT_PACKAGE_YEARLY,
      "$rc_annual",
      "novasafe_pro_yearly",
      "yearly",
      "annual",
    ]),
  }),
});

/** Lookup helper — first match wins, mirroring the mobile RC client. */
export function billingPackageCandidates(cycle: BillingCycle): readonly string[] {
  return cycle === "yearly"
    ? billingConfig.packages.yearlyCandidates
    : billingConfig.packages.monthlyCandidates;
}

export type BillingConfig = typeof billingConfig;
