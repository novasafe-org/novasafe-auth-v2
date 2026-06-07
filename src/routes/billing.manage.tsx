import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";

import { requireAuthenticatedForManageBilling } from "@/lib/auth/auth-guard";
import { GhostButton, PrimaryButton } from "@/components/auth/primitives";

const manageSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

function withBillingSyncedFlag(url: string): string {
  const target = new URL(url);
  target.searchParams.set("billingSynced", "1");
  return target.toString();
}

export const Route = createFileRoute("/billing/manage")({
  validateSearch: (search) => manageSearchSchema.parse(search),
  loader: async ({ location }) => {
    const search = manageSearchSchema.parse(location.search);
    return requireAuthenticatedForManageBilling({
      next: search.next,
      ref: search.ref,
    });
  },
  head: () => ({
    meta: [{ title: "Manage Subscription — NovaSafe" }],
  }),
  component: ManageBillingRoute,
});

type PortalStage =
  | { kind: "loading" }
  | { kind: "redirecting"; url: string }
  | { kind: "ready"; url: string }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

function ManageBillingRoute() {
  const { user, returnTo } = Route.useLoaderData();
  const returnUrl = withBillingSyncedFlag(returnTo);
  const [stage, setStage] = useState<PortalStage>({ kind: "loading" });
  const redirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { billingClient } = await import("@/lib/billing/client");
      if (cancelled) return;
      if (!billingClient.isEnabled()) {
        setStage({
          kind: "unavailable",
          message: "Subscription management is not configured for this environment.",
        });
        return;
      }
      const outcome = await billingClient.getManagementUrl(user.id);
      if (cancelled) return;
      if (outcome.status === "ready") {
        setStage({ kind: "redirecting", url: outcome.url });
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          window.location.assign(outcome.url);
        }
        return;
      }
      if (outcome.status === "error") {
        setStage({ kind: "error", message: outcome.message });
        return;
      }
      setStage({ kind: "unavailable", message: outcome.message });
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (stage.kind === "loading" || stage.kind === "redirecting") {
    return (
      <ManageShell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Opening billing portal…</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            You'll be redirected to manage payment details, cancel, or resume your subscription.
          </p>
        </div>
      </ManageShell>
    );
  }

  if (stage.kind === "ready") {
    return (
      <ManageShell>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            If the portal didn't open, use the button below.
          </p>
          <PrimaryButton type="button" onClick={() => window.location.assign(stage.url)}>
            Open billing portal <ExternalLink className="h-4 w-4" />
          </PrimaryButton>
          <GhostButton type="button" onClick={() => window.location.assign(returnUrl)}>
            Return to billing <ArrowRight className="h-4 w-4" />
          </GhostButton>
        </div>
      </ManageShell>
    );
  }

  return (
    <ManageShell>
      <div className="space-y-4 py-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Couldn't open subscription management</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {stage.message}
          </p>
        </div>
        <GhostButton type="button" onClick={() => window.location.assign(returnTo)}>
          Return to the app <ArrowRight className="h-4 w-4" />
        </GhostButton>
      </div>
    </ManageShell>
  );
}

function ManageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-4">
          Billing portal
        </p>
        {children}
      </div>
    </div>
  );
}
