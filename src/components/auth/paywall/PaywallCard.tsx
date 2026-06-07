import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";

import {
  confirmProEntitlementAction,
  type ConfirmEntitlementResult,
  type PaywallCycle,
  type PaywallOfferings,
  type PaywallPlan,
  type SubscriptionSnapshot,
} from "@/lib/billing";
import { ErrorBanner, GhostButton, PrimaryButton, Title } from "@/components/auth/primitives";
import { PlanToggle } from "./PlanToggle";
import { PlanCard } from "./PlanCard";
import { PlanComparison } from "./PlanComparison";

const PRO_FEATURES = [
  "Unlimited passwords, secure notes & cards",
  "Sync across web, iOS, Android & extension",
  "Encrypted CSV import / export & bulk paste",
  "Dark-web breach monitoring with priority alerts",
  "Priority recovery support, 24/7",
] as const;

/* ------------------------------------------------------------------------- */
/* Public types                                                              */
/* ------------------------------------------------------------------------- */

export type PaywallOutcome =
  | { status: "active"; subscription: SubscriptionSnapshot }
  | { status: "skipped"; reason: "user-chose-free" | "configuration-missing" }
  | { status: "failed"; message: string };

interface PaywallCardProps {
  user: { id: string; email: string };
  onComplete: (outcome: PaywallOutcome) => void;
  onSkipToFree: () => void;
  /** Label for the secondary action (defaults to signup copy). */
  skipLabel?: string;
  /** Optional analytics ref forwarded from landing CTAs ("hero", "pricing", …). */
  ref?: string;
}

type Stage =
  | { kind: "loading" }
  | { kind: "ready"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "purchasing"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "confirming"; offerings: PaywallOfferings; cycle: PaywallCycle }
  | { kind: "configuration-missing" }
  | { kind: "fatal"; message: string };

/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */

export function PaywallCard({
  user,
  onComplete,
  onSkipToFree,
  skipLabel = "Continue with the free plan",
}: PaywallCardProps) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  /* --------------------------- Bootstrap ----------------------------- */

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
        console.error("[PaywallCard] failed to load offerings", err);
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

  /* --------------------------- Actions ------------------------------- */

  const startPurchase = useCallback(async () => {
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
      // Treat pending as a non-fatal — we'll still try to confirm but the
      // backend may not have applied the charge yet.
    }

    // Purchase reported as completed (or pending) on the SDK. Now confirm
    // with our backend so the user's subscription document is updated and
    // we can be sure the entitlement is active.
    setStage({ kind: "confirming", offerings, cycle });
    const confirmation = await confirmWithRetry();
    if (confirmation.status === "active") {
      onComplete({ status: "active", subscription: confirmation.subscription });
      return;
    }
    if (confirmation.status === "pending") {
      // Webhook hasn't applied yet. Surface that on the failure card so
      // the user knows their charge went through and Pro will activate
      // shortly — they can also continue as free for now.
      setPendingNotice(confirmation.message);
      onComplete({
        status: "active",
        subscription: confirmation.subscription,
      });
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
  }, [stage, user.email, user.id, onComplete]);

  /* --------------------------- Render -------------------------------- */

  const cycle = "cycle" in stage ? stage.cycle : "yearly";
  const offerings = "offerings" in stage ? stage.offerings : null;
  const plan = offerings ? pickPlan(offerings, cycle) : null;

  if (stage.kind === "configuration-missing") {
    return (
      <ConfigurationMissing
        onSkipToFree={() => {
          onSkipToFree();
          onComplete({ status: "skipped", reason: "configuration-missing" });
        }}
      />
    );
  }

  if (stage.kind === "fatal") {
    return (
      <FatalState
        message={stage.message}
        onSkipToFree={() => {
          onSkipToFree();
          onComplete({ status: "skipped", reason: "configuration-missing" });
        }}
      />
    );
  }

  const purchasing = stage.kind === "purchasing" || stage.kind === "confirming";
  const isReady = stage.kind === "ready" || purchasing;

  return (
    <>
      <Title
        eyebrow="Pro plan"
        title="Unlock the full NovaSafe vault."
        sub="Encrypted everywhere, syncing everywhere — and supporting an indie team that builds in public."
      />

      <PlanComparison />

      <div className="flex flex-col items-start gap-3">
        <PlanToggle
          value={cycle}
          onChange={(next) => {
            if (stage.kind === "ready") setStage({ ...stage, cycle: next });
          }}
          disabled={purchasing || !isReady}
          yearlySavingsLabel={offerings?.yearly?.badge ? "Save more" : undefined}
        />
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Secure checkout via Paddle · Powered by RevenueCat
        </div>
      </div>

      <PlanCard
        plan={
          plan ?? {
            packageId: "loading",
            cycle,
            priceLabel: "—",
            periodLabel: cycle === "yearly" ? "/year" : "/month",
          }
        }
        features={PRO_FEATURES}
        loading={!plan || stage.kind === "loading"}
      />

      {error && <ErrorBanner message={error} />}
      {pendingNotice && !error && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground inline-flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          {pendingNotice}
        </div>
      )}

      <PrimaryButton
        type="button"
        onClick={startPurchase}
        loading={purchasing}
        disabled={!plan || !isReady || purchasing}
      >
        {stage.kind === "confirming" ? (
          "Confirming your subscription…"
        ) : stage.kind === "purchasing" ? (
          "Opening secure checkout…"
        ) : (
          <>
            Start NovaSafe Pro <ArrowRight className="h-4 w-4" />
          </>
        )}
      </PrimaryButton>

      <button
        type="button"
        onClick={() => {
          onSkipToFree();
          onComplete({ status: "skipped", reason: "user-chose-free" });
        }}
        disabled={purchasing}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-center transition-colors disabled:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {skipLabel}
      </button>

      <div className="rounded-xl border border-border bg-secondary p-3 text-[12px] text-muted-foreground inline-flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
        Cancel any time from the app · 14-day money-back guarantee · Receipts emailed to{" "}
        <span className="text-foreground font-medium">{user.email}</span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function pickPlan(offerings: PaywallOfferings, cycle: PaywallCycle): PaywallPlan | null {
  return cycle === "yearly" ? offerings.yearly : offerings.monthly;
}

/**
 * The RevenueCat webhook usually fires within a few seconds of a successful
 * Paddle charge, but it can race the SDK's own `purchase()` resolution. We
 * therefore retry the entitlement-confirm a handful of times with a small
 * back-off so the success card lands without a refresh.
 */
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

/* ------------------------------------------------------------------------- */
/* Sub-states                                                                */
/* ------------------------------------------------------------------------- */

function ConfigurationMissing({ onSkipToFree }: { onSkipToFree: () => void }) {
  return (
    <>
      <Title
        eyebrow="Pro plan"
        title="Web billing isn't configured yet."
        sub="Set VITE_REVENUECAT_PUBLIC_API_KEY_WEB in novasafe-auth-v2 (RevenueCat → Project → Web billing → Public API key), rebuild, and redeploy. Until then, Pro checkout and subscription management are unavailable."
      />
      <PrimaryButton type="button" onClick={onSkipToFree}>
        Return to the app <ArrowRight className="h-4 w-4" />
      </PrimaryButton>
    </>
  );
}

function FatalState({ message, onSkipToFree }: { message: string; onSkipToFree: () => void }) {
  return (
    <>
      <Title eyebrow="Pro plan" title="We couldn't reach the payment service." sub={message} />
      <GhostButton type="button" onClick={onSkipToFree}>
        Continue with the free plan <ArrowRight className="h-4 w-4" />
      </GhostButton>
    </>
  );
}
