import { z } from "zod";

import { appConfig } from "@/config";
import { extensionPairingLog } from "./extension-pairing.constants";

/** Persisted across login redirects when URL search params are lost or truncated. */
export const EXTENSION_PAIRING_CONTEXT_KEY = "novasafe.extension.pairingContext";

const PAIRING_CONTEXT_TTL_MS = 15 * 60 * 1000;

export const extensionPairingSearchSchema = z.object({
  installId: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(8),
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  platform: z.string().optional(),
  extensionVersion: z.string().optional(),
});

export type ExtensionPairingSearch = z.infer<typeof extensionPairingSearchSchema>;

export type ExtensionPairingSearchResult =
  | { ok: true; params: ExtensionPairingSearch }
  | { ok: false; reason: "missing" | "expired" | "invalid" };

const storedContextSchema = extensionPairingSearchSchema.extend({
  savedAt: z.number(),
});

export type StoredExtensionPairingContext = z.infer<typeof storedContextSchema>;

const isBrowser = typeof window !== "undefined";

export function buildConnectExtensionReturnUrl(params: ExtensionPairingSearch): string {
  const returnUrl = new URL("/connect/extension", appConfig.urls.auth);
  returnUrl.searchParams.set("installId", params.installId);
  returnUrl.searchParams.set("redirect_uri", params.redirect_uri);
  returnUrl.searchParams.set("state", params.state);
  if (params.browser) returnUrl.searchParams.set("browser", params.browser);
  if (params.browserVersion) returnUrl.searchParams.set("browserVersion", params.browserVersion);
  if (params.platform) returnUrl.searchParams.set("platform", params.platform);
  if (params.extensionVersion) returnUrl.searchParams.set("extensionVersion", params.extensionVersion);
  return returnUrl.toString();
}

export function maskPairingContext(params: ExtensionPairingSearch) {
  return {
    installId: `${params.installId.slice(0, 8)}…`,
    redirectHost: (() => {
      try {
        return new URL(params.redirect_uri).hostname;
      } catch {
        return "invalid";
      }
    })(),
    state: `${params.state.slice(0, 8)}…`,
    browser: params.browser,
    platform: params.platform,
  };
}

export function persistExtensionPairingContext(params: ExtensionPairingSearch): void {
  if (!isBrowser) return;
  const payload: StoredExtensionPairingContext = {
    ...params,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(EXTENSION_PAIRING_CONTEXT_KEY, JSON.stringify(payload));
  extensionPairingLog("Pairing context saved", maskPairingContext(params));
}

export function clearExtensionPairingContext(): void {
  if (!isBrowser) return;
  sessionStorage.removeItem(EXTENSION_PAIRING_CONTEXT_KEY);
  extensionPairingLog("Pairing context cleared");
}

export function restoreExtensionPairingContext(): ExtensionPairingSearch | null {
  if (!isBrowser) return null;
  const raw = sessionStorage.getItem(EXTENSION_PAIRING_CONTEXT_KEY);
  if (!raw) return null;

  try {
    const parsed = storedContextSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      clearExtensionPairingContext();
      return null;
    }
    if (Date.now() - parsed.data.savedAt > PAIRING_CONTEXT_TTL_MS) {
      clearExtensionPairingContext();
      extensionPairingLog("Pairing context expired");
      return null;
    }
    const { savedAt: _savedAt, ...params } = parsed.data;
    return params;
  } catch {
    clearExtensionPairingContext();
    return null;
  }
}

/**
 * Resolve pairing params from URL search, merging stray login-page params when the
 * `next` URL was truncated by an unencoded redirect.
 */
export function resolveExtensionPairingSearch(
  raw: Record<string, unknown>,
): ExtensionPairingSearchResult {
  const direct = extensionPairingSearchSchema.safeParse(raw);
  if (direct.success) {
    persistExtensionPairingContext(direct.data);
    extensionPairingLog("Pairing params from URL", maskPairingContext(direct.data));
    return { ok: true, params: direct.data };
  }

  const installId =
    typeof raw.installId === "string"
      ? raw.installId
      : typeof raw.installationId === "string"
        ? raw.installationId
        : undefined;
  const redirect_uri =
    typeof raw.redirect_uri === "string"
      ? raw.redirect_uri
      : typeof raw.redirectUri === "string"
        ? raw.redirectUri
        : undefined;
  const state = typeof raw.state === "string" ? raw.state : undefined;

  if (installId && redirect_uri && state) {
    const merged = extensionPairingSearchSchema.safeParse({
      installId,
      redirect_uri,
      state,
      browser: raw.browser,
      browserVersion: raw.browserVersion,
      platform: raw.platform,
      extensionVersion: raw.extensionVersion,
    });
    if (merged.success) {
      persistExtensionPairingContext(merged.data);
      extensionPairingLog("Pairing params merged from partial URL", maskPairingContext(merged.data));
      return { ok: true, params: merged.data };
    }
  }

  const restored = restoreExtensionPairingContext();
  if (restored) {
    const validated = extensionPairingSearchSchema.safeParse(restored);
    if (validated.success) {
      extensionPairingLog("Pairing params restored from sessionStorage", maskPairingContext(validated.data));
      return { ok: true, params: validated.data };
    }
    clearExtensionPairingContext();
    return { ok: false, reason: "invalid" };
  }

  extensionPairingLog("Pairing params missing", {
    keys: Object.keys(raw),
    installId: Boolean(installId),
    redirect_uri: Boolean(redirect_uri),
    state: Boolean(state),
  });
  return { ok: false, reason: "missing" };
}

/** Rewrite the address bar when params were restored from storage but omitted from the URL. */
export function syncConnectExtensionUrl(params: ExtensionPairingSearch): void {
  if (!isBrowser) return;
  const current = new URL(window.location.href);
  if (current.searchParams.get("installId") === params.installId) return;
  const target = new URL("/connect/extension", appConfig.urls.auth);
  target.searchParams.set("installId", params.installId);
  target.searchParams.set("redirect_uri", params.redirect_uri);
  target.searchParams.set("state", params.state);
  if (params.browser) target.searchParams.set("browser", params.browser);
  if (params.browserVersion) target.searchParams.set("browserVersion", params.browserVersion);
  if (params.platform) target.searchParams.set("platform", params.platform);
  if (params.extensionVersion) target.searchParams.set("extensionVersion", params.extensionVersion);
  window.history.replaceState(null, "", target.toString());
  extensionPairingLog("Post-login URL restored", maskPairingContext(params));
}
