import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { ShieldCheck, Puzzle, Loader2, AlertCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";
import { appConfig, buildLoginUrl } from "@/config";
import {
  completeExtensionPairingAction,
  requireAuthenticatedForPairingAction,
} from "@/lib/auth/extension-pairing-actions";

const connectSearchSchema = z.object({
  installId: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(8),
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  platform: z.string().optional(),
  extensionVersion: z.string().optional(),
});

export const Route = createFileRoute("/connect/extension")({
  ssr: false,
  validateSearch: (search) => connectSearchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    const gate = await requireAuthenticatedForPairingAction();
    if (!gate.authenticated) {
      const returnUrl = new URL("/connect/extension", appConfig.urls.auth);
      returnUrl.searchParams.set("installId", search.installId);
      returnUrl.searchParams.set("redirect_uri", search.redirect_uri);
      returnUrl.searchParams.set("state", search.state);
      if (search.browser) returnUrl.searchParams.set("browser", search.browser);
      if (search.browserVersion) returnUrl.searchParams.set("browserVersion", search.browserVersion);
      if (search.platform) returnUrl.searchParams.set("platform", search.platform);
      if (search.extensionVersion) returnUrl.searchParams.set("extensionVersion", search.extensionVersion);
      throw redirect({
        href: buildLoginUrl({ next: returnUrl.toString() }),
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browserLabel = search.browser ? `${search.browser} on ${search.platform ?? "your device"}` : "your browser";

  const onConnect = async () => {
    setBusy(true);
    setError(null);
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
      if (result.status === "redirect") {
        window.location.replace(result.redirectTo);
        return;
      }
      setError(result.message);
    } catch {
      setError("Could not connect the extension. Try again.");
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
          <p className="mt-4 flex items-start gap-2 text-[12px] text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onConnect}
          disabled={busy}
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
