import { useCallback, useEffect, useState } from "react";

import {
  confirmProEntitlementAction,
  type ConfirmEntitlementResult,
  type PaywallCycle,
  type PaywallOfferings,
  type PaywallPlan,
  type SubscriptionSnapshot,
} from "@/lib/billing";

export type ProCheckoutOutcome =
  | { status: "active"; subscription: SubscriptionSnapshot }
  | { status: "skipped"; reason: "user-chose-free" | "configuration-missing" }
  | { status: "failed"; message: string };

type Stage =
  | { kind: "loading" }
  | { kind: "ready"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "purchasing"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "confirming"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "configuration-missing" }
  | { kind: "fatal"; message: string };

export function useProCheckout(user: { id: string; email: string }) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { billingClient } = await import("@/lib/billing/client");
      if (cancelled) return;
      if (!billingClient.isEnabled()) {
        setStage({ kind: "configuration-missing" });
        return;
      }
      try {
        const offerings = await billingClient.loadOfferings(user.id);
        if (cancelled) return;
        const initialCycle: PaywallCycle = offerings.yearly ? "yearly" : "monthly";
        setStage({ kind: "ready", offerings, cycle: initialCycle });
      } catch (err) {
        if (cancelled) return;
        console.error("[ProUpgradeCheckout] failed to load offerings", err);
        setStage({
          kind: "fatal",
          message:
            "We couldn't load Pro plans right now. You can continue with the free plan and upgrade later.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const setCycle = useCallback((cycle: PaywallCycle) => {
    setStage((prev) => (prev.kind === "ready" ? { ...prev, cycle } : prev));
  }, []);

  const startPurchase = useCallback(
    async (onComplete: (outcome: ProCheckoutOutcome) => void) => {
      if (stage.kind !== "ready") return;
      const { offerings, cycle } = stage;
      const plan = pickPlan(offerings, cycle);
      if (!plan) {
        setError(`No ${cycle} package is available right now.`);
        return;
      }
      setError(null);
      setStage({ kind: "purchasing", offerings, cycle });

      const { billingClient } = await import("@/lib/billing/client");
      const outcome = await billingClient.purchase({
        appUserId: user.id,
        customerEmail: user.email,
        cycle,
      });

      if (outcome.status === "cancelled") {
        setStage({ kind: "ready", offerings, cycle });
        return;
      }
      if (outcome.status === "error") {
        setError(outcome.message);
        setStage({ kind: "ready", offerings, cycle });
        return;
      }
      if (outcome.status === "pending") {
        setPendingNotice(outcome.message);
      }

      setStage({ kind: "confirming", offerings, cycle });
      const confirmation = await confirmWithRetry();
      if (confirmation.status === "active") {
        onComplete({ status: "active", subscription: confirmation.subscription });
        return;
      }
      if (confirmation.status === "pending") {
        setPendingNotice(confirmation.message);
        onComplete({ status: "active", subscription: confirmation.subscription });
        return;
      }
      if (confirmation.status === "missing") {
        onComplete({
          status: "failed",
          message:
            "Your payment didn't go through. You can try again or continue with the free plan.",
        });
        return;
      }
      if (confirmation.status === "unauthorized") {
        onComplete({
          status: "failed",
          message: "Your session expired. Please sign in again.",
        });
        return;
      }
      onComplete({ status: "failed", message: confirmation.message });
    },
    [stage, user.email, user.id],
  );

  const cycle = "cycle" in stage ? stage.cycle : "yearly";
  const offerings = "offerings" in stage ? stage.offerings : null;
  const plan = offerings ? pickPlan(offerings, cycle) : null;
  const purchasing = stage.kind === "purchasing" || stage.kind === "confirming";
  const isReady = stage.kind === "ready" || purchasing;

  return {
    stage,
    cycle,
    offerings,
    plan,
    error,
    pendingNotice,
    purchasing,
    isReady,
    setCycle,
    startPurchase,
    setError,
  };
}

export function pickPlan(offerings: PaywallOfferings, cycle: PaywallCycle): PaywallPlan | null {
  return cycle === "yearly" ? offerings.yearly : offerings.monthly;
}

export function computeYearlySavingsPercent(
  monthly: PaywallPlan | null,
  yearly: PaywallPlan | null,
): number | null {
  if (!monthly?.amountMicros || !yearly?.amountMicros) return null;
  const monthlyAnnual = monthly.amountMicros * 12;
  if (monthlyAnnual <= yearly.amountMicros) return null;
  return Math.round((1 - yearly.amountMicros / monthlyAnnual) * 100);
}

async function confirmWithRetry(attempts = 4, delayMs = 800): Promise<ConfirmEntitlementResult> {
  let last: ConfirmEntitlementResult | null = null;
  for (let i = 0; i < attempts; i++) {
    const result = await confirmProEntitlementAction();
    last = result;
    if (result.status === "active" || result.status === "missing") return result;
    if (result.status === "unauthorized" || result.status === "error") return result;
    if (i < attempts - 1) await new Promise((res) => setTimeout(res, delayMs * (i + 1)));
  }
  return last ?? { status: "error", message: "Couldn't confirm payment." };
}
