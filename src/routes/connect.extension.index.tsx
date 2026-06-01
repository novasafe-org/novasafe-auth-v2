import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Puzzle, Loader2, AlertCircle, ArrowRight } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ExtensionPairingExpiredCard } from "@/components/auth/screens/ExtensionPairingExpiredCard";
import { buildLoginUrl, buildSignupProUrl } from "@/config";
import {
  completeExtensionPairingAction,
  requireAuthenticatedForPairingAction,
} from "@/lib/auth/extension-pairing-actions";
import {
  EXTENSION_PAIRING_REDIRECT_KEY,
  extensionPairingLog,
} from "@/lib/auth/extension-pairing.constants";
import {
  buildConnectExtensionReturnUrl,
  clearExtensionPairingContext,
  maskPairingContext,
  persistExtensionPairingContext,
  resolveExtensionPairingSearch,
  syncConnectExtensionUrl,
  type ExtensionPairingSearch,
} from "@/lib/auth/extension-pairing-context";

export type ConnectExtensionSearch =
  | ExtensionPairingSearch
  | { pairingSessionExpired: true };

const isValidPairingSearch = (
  search: ConnectExtensionSearch,
): search is ExtensionPairingSearch => !("pairingSessionExpired" in search);

const DEVICE_LIMIT_CODE = "NOVASAFE_DEVICE_LIMIT";

export const Route = createFileRoute("/connect/extension/")({
  ssr: false,
  validateSearch: (search): ConnectExtensionSearch => {
    const resolved = resolveExtensionPairingSearch(search as Record<string, unknown>);
    if (resolved.ok) return resolved.params;
    return { pairingSessionExpired: true };
  },
  beforeLoad: async ({ search }) => {
    if (!isValidPairingSearch(search)) return;

    persistExtensionPairingContext(search);

    const gate = await requireAuthenticatedForPairingAction();
    if (!gate.authenticated) {
      const returnUrl = buildConnectExtensionReturnUrl(search);
      extensionPairingLog("Redirect to login", {
        returnPath: "/connect/extension",
        ...maskPairingContext(search),
      });
      throw redirect({
        href: buildLoginUrl({ next: returnUrl }),
        replace: true,
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Connect Extension — NovaSafe" },
      {
        name: "description",
        content: "Authorize the NovaSafe browser extension to access your vault.",
      },
    ],
  }),
  component: ConnectExtensionRoute,
});

function ConnectExtensionRoute() {
  const search = Route.useSearch();

  useEffect(() => {
    if (!isValidPairingSearch(search)) return;
    syncConnectExtensionUrl(search);
  }, [search]);

  if (!isValidPairingSearch(search)) {
    return (
      <AuthShell
        kicker="Browser extension"
        headline="Connect NovaSafe to your browser."
        topBarAction={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Puzzle className="h-3.5 w-3.5" />
            <span>Secure pairing</span>
          </div>
        }
      >
        <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ExtensionPairingExpiredCard />
        </div>
      </AuthShell>
    );
  }

  return <ConnectExtensionPanel search={search} />;
}

function ConnectExtensionPanel({ search }: { search: ExtensionPairingSearch }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  const browserLabel = search.browser ? `${search.browser} on ${search.platform ?? "your device"}` : "your browser";
  const isDeviceLimit = errorCode === DEVICE_LIMIT_CODE;

  const onConnect = async () => {
    setBusy(true);
    setError(null);
    setErrorCode(undefined);
    extensionPairingLog("Pairing Started", maskPairingContext(search));
    try {
      const result = await completeExtensionPairingAction({
        data: {
          installId: search.installId,
          redirectUri: search.redirect_uri,
          state: search.state,
          browser: search.browser,
          browserVersion: search.browserVersion,
          platform: search.platform,
          extensionVersion: search.extensionVersion,
        },
      });
      if (result.status === "success") {
        sessionStorage.setItem(EXTENSION_PAIRING_REDIRECT_KEY, result.extensionRedirectTo);
        clearExtensionPairingContext();
        extensionPairingLog("Token Received", {
          callbackHost: new URL(result.extensionRedirectTo).hostname,
        });
        window.location.replace("/connect/extension/success");
        return;
      }

      extensionPairingLog("Pairing failed", { code: result.code, message: result.message });
      setError(result.message);
      setErrorCode(result.code);

      // Show inline for device limit — retrying would loop. Other errors go to failure page.
      if (result.code === DEVICE_LIMIT_CODE) {
        return;
      }

      const failureUrl = new URL("/connect/extension/failure", window.location.origin);
      failureUrl.searchParams.set("message", result.message);
      if (result.code) failureUrl.searchParams.set("code", result.code);
      failureUrl.searchParams.set("installId", search.installId);
      failureUrl.searchParams.set("redirect_uri", search.redirect_uri);
      failureUrl.searchParams.set("state", search.state);
      window.location.replace(failureUrl.toString());
    } catch {
      const failureUrl = new URL("/connect/extension/failure", window.location.origin);
      failureUrl.searchParams.set("message", "Could not connect the extension. Try again.");
      failureUrl.searchParams.set("code", "unexpected");
      failureUrl.searchParams.set("installId", search.installId);
      failureUrl.searchParams.set("redirect_uri", search.redirect_uri);
      failureUrl.searchParams.set("state", search.state);
      window.location.replace(failureUrl.toString());
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      kicker="Browser extension"
      headline="Connect NovaSafe to your browser."
      topBarAction={
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Puzzle className="h-3.5 w-3.5" />
          <span>Secure pairing</span>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-center text-[17px] font-semibold tracking-tight">Authorize extension</h2>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-muted-foreground">
          NovaSafe for {browserLabel} is requesting access to your account. Your credentials stay in the extension —
          never copied or shown here.
        </p>

        <dl className="mt-5 space-y-2 rounded-lg bg-muted/40 px-4 py-3 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Installation</dt>
            <dd className="truncate font-mono text-[11px]">{search.installId.slice(0, 8)}…</dd>
          </div>
          {search.extensionVersion ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Extension</dt>
              <dd>v{search.extensionVersion}</dd>
            </div>
          ) : null}
        </dl>

        {error ? (
          <div className="mt-4 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="flex items-start gap-2 text-[12px] text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
            {isDeviceLimit ? (
              <a
                href={buildSignupProUrl()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition hover:opacity-95"
              >
                Upgrade to NovaSafe Pro <ArrowRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onConnect}
          disabled={busy || isDeviceLimit}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
            </>
          ) : (
            "Connect extension"
          )}
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          You can revoke this extension anytime from Account → Devices.
        </p>
      </div>
    </AuthShell>
  );
}
