/**
 * Resolves the ISO 4217 currency code to pass to RevenueCat `getOfferings()`.
 *
 * RevenueCat geolocates when `currency` is omitted, but SSR/hydration timing,
 * VPNs, and Paddle's default currency can still surface USD. We bias toward the
 * customer's browser locale and timezone before falling back to RC geo.
 */

const TIMEZONE_CURRENCY: Readonly<Record<string, string>> = {
  "Asia/Kolkata": "INR",
  "Asia/Calcutta": "INR",
  "Europe/London": "GBP",
  "Europe/Dublin": "EUR",
  "Europe/Paris": "EUR",
  "Europe/Berlin": "EUR",
  "Europe/Amsterdam": "EUR",
  "Europe/Madrid": "EUR",
  "Europe/Rome": "EUR",
  "Europe/Brussels": "EUR",
  "Europe/Vienna": "EUR",
  "Europe/Lisbon": "EUR",
  "Europe/Helsinki": "EUR",
  "Europe/Athens": "EUR",
  "America/New_York": "USD",
  "America/Chicago": "USD",
  "America/Denver": "USD",
  "America/Los_Angeles": "USD",
  "America/Toronto": "USD",
};

const REGION_CURRENCY: Readonly<Record<string, string>> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  AU: "AUD",
  CA: "CAD",
  SG: "SGD",
  JP: "JPY",
  NZ: "NZD",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  BR: "BRL",
  MX: "MXN",
  AE: "AED",
  SA: "SAR",
  ZA: "ZAR",
  KR: "KRW",
  HK: "HKD",
  TW: "TWD",
  TH: "THB",
  MY: "MYR",
  PH: "PHP",
  ID: "IDR",
  VN: "VND",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
};

function regionFromLocale(locale: string): string | undefined {
  const parts = locale.replace(/_/g, "-").split("-");
  if (parts.length < 2) return undefined;
  const region = parts[parts.length - 1];
  return region && region.length === 2 ? region.toUpperCase() : undefined;
}

function currencyFromRegion(region: string | undefined): string | undefined {
  if (!region) return undefined;
  return REGION_CURRENCY[region];
}

/** Browser locale for RC purchase-flow copy (e.g. `en-IN`). */
export function resolvePurchaseLocale(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const locale = navigator.language?.trim();
  return locale || undefined;
}

/**
 * Best-effort currency for offerings fetch. Returns `undefined` when unknown so
 * RevenueCat can still attempt IP geolocation.
 */
export function resolveOfferingsCurrency(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const locale =
    (typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions().locale) ||
    navigator.language ||
    "";
  const region = regionFromLocale(locale);
  const fromLocale = currencyFromRegion(region);
  if (fromLocale) return fromLocale;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_CURRENCY[tz]) return TIMEZONE_CURRENCY[tz];
  } catch {
    // ignore
  }

  return undefined;
}
