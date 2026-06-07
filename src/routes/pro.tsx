import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CheckoutShell } from "@/components/auth/CheckoutShell";
import { ProUpgradeCheckout } from "@/components/auth/paywall/ProUpgradeCheckout";
import type { ProCheckoutOutcome } from "@/components/auth/paywall/useProCheckout";
import { ProSuccessCard } from "@/components/auth/paywall/ProSuccessCard";
import { ProFailureCard } from "@/components/auth/paywall/ProFailureCard";
import { requireAuthenticatedForUpgrade } from "@/lib/auth/auth-guard";
import type { SubscriptionSnapshot } from "@/lib/billing";

/**
 * `/pro` — authenticated checkout for existing users upgrading to Pro.
 * Centered, minimal layout (no marketing split-screen).
 */

const proSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

function withUpgradedFlag(url: string): string {
  const target = new URL(url);
  target.searchParams.set("upgraded", "1");
  return target.toString();
}

export const Route = createFileRoute("/pro")({
  validateSearch: (search) => proSearchSchema.parse(search),
  loader: async ({ location }) => {
    const search = proSearchSchema.parse(location.search);
    return requireAuthenticatedForUpgrade({
      next: search.next,
      ref: search.ref,
    });
  },
  head: () => ({
    meta: [
      { title: "Upgrade to NovaSafe Pro" },
      {
        name: "description",
        content: "Upgrade to NovaSafe Pro — unlimited vault, sync, and breach monitoring.",
      },
    ],
  }),
  component: ProCheckoutRoute,
});

type Stage =
  | { kind: "paywall" }
  | { kind: "pro-success"; subscription: SubscriptionSnapshot }
  | { kind: "pro-failed"; message: string };

function ProCheckoutRoute() {
  const { user, returnTo } = Route.useLoaderData();
  const successRedirect = withUpgradedFlag(returnTo);
  const [stage, setStage] = useState<Stage>({ kind: "paywall" });

  const handlePaywallOutcome = (outcome: ProCheckoutOutcome) => {
    if (outcome.status === "active") {
      setStage({ kind: "pro-success", subscription: outcome.subscription });
      return;
    }
    if (outcome.status === "failed") {
      setStage({ kind: "pro-failed", message: outcome.message });
      return;
    }
    window.location.assign(returnTo);
  };

  return (
    <CheckoutShell backHref={returnTo} backLabel="Back to billing">
      {stage.kind === "paywall" && (
        <ProUpgradeCheckout
          user={{ id: user.id, email: user.email }}
          skipLabel="Return to billing"
          onComplete={handlePaywallOutcome}
          onSkip={() => window.location.assign(returnTo)}
        />
      )}

      {stage.kind === "pro-success" && (
        <div className="max-w-lg mx-auto">
          <ProSuccessCard
            fullName={user.name || user.email}
            subscription={stage.subscription}
            redirectTo={successRedirect}
            ctaLabel="Return to billing"
          />
        </div>
      )}

      {stage.kind === "pro-failed" && (
        <div className="max-w-lg mx-auto">
          <ProFailureCard
            context="upgrade"
            message={stage.message}
            onRetry={() => setStage({ kind: "paywall" })}
            onContinueFree={() => window.location.assign(returnTo)}
            continueLabel="Return to billing"
          />
        </div>
      )}
    </CheckoutShell>
  );
}
