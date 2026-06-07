/**
 * Resolves locale and ISO 4217 currency for RevenueCat `getOfferings()`.
 *
 * Physical location (timezone) is preferred over browser language — many users
 * in India run `en-US` as their browser language.
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

function readBrowserLocales(): string[] {
  if (typeof navigator === "undefined") return [];
  const langs = navigator.languages?.length ? [...navigator.languages] : [];
  if (navigator.language) langs.push(navigator.language);
  return langs;
}

function resolveRegion(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
  } catch {
    // ignore
  }

  for (const locale of readBrowserLocales()) {
    const region = regionFromLocale(locale);
    if (region) return region;
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return regionFromLocale(locale);
  } catch {
    return undefined;
  }
}

const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

function normalizeLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const normalized = locale.trim().replace(/_/g, "-");
  if (!LOCALE_PATTERN.test(normalized)) return undefined;
  return normalized;
}

/** Browser locale for RC purchase-flow copy (e.g. `en-IN`). */
export function resolvePurchaseLocale(): string | undefined {
  const locales = readBrowserLocales();
  const india = locales.find((l) => regionFromLocale(l) === "IN");
  const preferred = india ?? locales[0];
  return normalizeLocale(preferred?.replace(/_/g, "-"));
}

/** ISO region hint used for pricing diagnostics (e.g. `IN`). */
export function resolvePricingRegion(): string | undefined {
  return resolveRegion();
}

/**
 * Preferred currency for offerings fetch. Only used when RC/Paddle publish a
 * price in that currency — caller must verify the returned `price.currency`.
 */
export function resolveOfferingsCurrency(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_CURRENCY[tz]) return TIMEZONE_CURRENCY[tz];
  } catch {
    // ignore
  }

  const region = resolveRegion();
  return currencyFromRegion(region);
}
