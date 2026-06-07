import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireAuthenticatedForUpgrade } from "@/lib/auth/auth-guard";
import { AuthShell } from "@/components/auth/AuthShell";
import { PaywallCard, type PaywallOutcome } from "@/components/auth/paywall/PaywallCard";
import { ProSuccessCard } from "@/components/auth/paywall/ProSuccessCard";
import { ProFailureCard } from "@/components/auth/paywall/ProFailureCard";
import { Section } from "@/components/auth/primitives";
import type { SubscriptionSnapshot } from "@/lib/billing";

/**
 * `/upgrade` — existing authenticated users upgrading Free → Pro.
 *
 * Reuses the same PaywallCard + RevenueCat × Paddle flow as `/signup/pro`,
 * but skips account creation and requires a valid session.
 */

const upgradeSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

function withUpgradedFlag(url: string): string {
  const target = new URL(url);
  target.searchParams.set("upgraded", "1");
  return target.toString();
}

export const Route = createFileRoute("/upgrade")({
  validateSearch: (search) => upgradeSearchSchema.parse(search),
  loader: async ({ location }) => {
    const search = upgradeSearchSchema.parse(location.search);
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
        content: "Upgrade your existing NovaSafe account to Pro — unlimited vault, sync, and breach monitoring.",
      },
    ],
  }),
  component: UpgradeRoute,
});

type Stage =
  | { kind: "paywall" }
  | { kind: "pro-success"; subscription: SubscriptionSnapshot }
  | { kind: "pro-failed"; message: string };

function UpgradeRoute() {
  const { user, returnTo } = Route.useLoaderData();
  const successRedirect = withUpgradedFlag(returnTo);
  const [stage, setStage] = useState<Stage>({ kind: "paywall" });

  const handlePaywallOutcome = (outcome: PaywallOutcome) => {
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

  const kicker =
    stage.kind === "pro-success"
      ? "Pro · Active"
      : stage.kind === "pro-failed"
        ? "Try again"
        : "Upgrade your plan";

  const headline =
    stage.kind === "pro-success"
      ? "Your vault just got a major upgrade."
      : stage.kind === "pro-failed"
        ? "No charge — your free vault is unchanged."
        : "Everything in Free, with unlimited everything.";

  return (
    <AuthShell kicker={kicker} headline={headline}>
      <Section>
        {stage.kind === "paywall" && (
          <PaywallCard
            user={{ id: user.id, email: user.email }}
            skipLabel="Return to the app"
            onComplete={handlePaywallOutcome}
            onSkipToFree={() => window.location.assign(returnTo)}
          />
        )}

        {stage.kind === "pro-success" && (
          <ProSuccessCard
            fullName={user.name || user.email}
            subscription={stage.subscription}
            redirectTo={successRedirect}
            ctaLabel="Return to billing"
          />
        )}

        {stage.kind === "pro-failed" && (
          <ProFailureCard
            context="upgrade"
            message={stage.message}
            onRetry={() => setStage({ kind: "paywall" })}
            onContinueFree={() => window.location.assign(returnTo)}
            continueLabel="Return to the app"
          />
        )}
      </Section>
    </AuthShell>
  );
}
