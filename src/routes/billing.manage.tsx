import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";

import { requireAuthenticatedForManageBilling } from "@/lib/auth/auth-guard";
import { AuthShell } from "@/components/auth/AuthShell";
import { ErrorBanner, GhostButton, PrimaryButton, Section, Title } from "@/components/auth/primitives";

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
  | { kind: "ready"; url: string }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

function ManageBillingRoute() {
  const { user, returnTo } = Route.useLoaderData();
  const returnUrl = withBillingSyncedFlag(returnTo);
  const [stage, setStage] = useState<PortalStage>({ kind: "loading" });
  const openedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { billingClient } = await import("@/lib/billing/client");
      if (cancelled) return;
      if (!billingClient.isEnabled()) {
        setStage({
          kind: "unavailable",
          message: "Subscription management isn't configured for this environment.",
        });
        return;
      }
      const outcome = await billingClient.getManagementUrl(user.id);
      if (cancelled) return;
      if (outcome.status === "ready") {
        setStage({ kind: "ready", url: outcome.url });
        if (!openedRef.current) {
          openedRef.current = true;
          window.open(outcome.url, "_blank", "noopener,noreferrer");
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

  return (
    <AuthShell kicker="Billing" headline="Manage your NovaSafe Pro subscription.">
      <Section>
        {stage.kind === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening the secure billing portal…
          </div>
        )}

        {stage.kind === "ready" && (
          <>
            <Title
              eyebrow="Customer portal"
              title="Your billing portal should be open."
              sub="Update payment details, cancel, or resume your subscription through RevenueCat and Paddle. You may be asked to verify your email for security."
            />
            <PrimaryButton type="button" onClick={() => window.open(stage.url, "_blank", "noopener,noreferrer")}>
              Open billing portal <ExternalLink className="h-4 w-4" />
            </PrimaryButton>
            <GhostButton type="button" onClick={() => window.location.assign(returnUrl)}>
              Return to billing <ArrowRight className="h-4 w-4" />
            </GhostButton>
          </>
        )}

        {(stage.kind === "unavailable" || stage.kind === "error") && (
          <>
            <Title
              eyebrow="Billing portal"
              title="We couldn't open subscription management."
              sub={stage.message}
            />
            <ErrorBanner message={stage.message} />
            <GhostButton type="button" onClick={() => window.location.assign(returnTo)}>
              Return to the app <ArrowRight className="h-4 w-4" />
            </GhostButton>
          </>
        )}
      </Section>
    </AuthShell>
  );
}
