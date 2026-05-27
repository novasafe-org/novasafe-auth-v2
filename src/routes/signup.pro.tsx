import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupCard, type SignupSuccess } from "@/components/auth/screens/SignupCard";
import { WelcomeCard } from "@/components/auth/screens/WelcomeCard";
import { PaywallCard, type PaywallOutcome } from "@/components/auth/paywall/PaywallCard";
import { ProSuccessCard } from "@/components/auth/paywall/ProSuccessCard";
import { ProFailureCard } from "@/components/auth/paywall/ProFailureCard";
import { Section } from "@/components/auth/primitives";
import { buildLoginUrl } from "@/config";
import type { SubscriptionSnapshot } from "@/lib/billing";

/**
 * `/signup/pro` — Pro account creation with the RevenueCat × Paddle paywall.
 *
 * Stage machine:
 *
 *   1. `form`     — reuses `SignupCard` (identity → password → OTP).
 *                    On success a session cookie is set and the account is live
 *                    with the FREE tier; we then move to `paywall`.
 *
 *   2. `paywall`  — `PaywallCard` lazy-loads the RC web SDK, displays plans,
 *                    runs `purchases.purchase()` against the user's RC AppUserId
 *                    (= our backend user id), and confirms entitlement via
 *                    `confirmProEntitlementAction`.
 *
 *                    Outcomes:
 *                      • active   → `pro-success`
 *                      • failed   → `pro-failed`
 *                      • skipped  → `welcome-free` (user chose Free or
 *                                   billing wasn't configured)
 *
 *   3. `pro-success`     — confirmation card → app.
 *      `pro-failed`      — retry / continue-as-free.
 *      `welcome-free`    — same Free welcome card as `/signup`.
 */

const signupProSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

export const Route = createFileRoute("/signup/pro")({
  validateSearch: (search) => signupProSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Upgrade to NovaSafe Pro" },
      {
        name: "description",
        content:
          "Unlock unlimited credentials, sync everywhere, and breach monitoring. 14-day money-back guarantee.",
      },
    ],
  }),
  component: SignupProRoute,
});

type Stage =
  | { kind: "form" }
  | { kind: "paywall"; signup: SignupSuccess }
  | { kind: "pro-success"; signup: SignupSuccess; subscription: SubscriptionSnapshot }
  | { kind: "pro-failed"; signup: SignupSuccess; message: string }
  | { kind: "welcome-free"; signup: SignupSuccess };

function SignupProRoute() {
  const { next } = Route.useSearch();
  const [stage, setStage] = useState<Stage>({ kind: "form" });

  const kicker = pickKicker(stage);
  const headline = pickHeadline(stage);

  const handlePaywallOutcome = (signup: SignupSuccess, outcome: PaywallOutcome) => {
    if (outcome.status === "active") {
      setStage({ kind: "pro-success", signup, subscription: outcome.subscription });
      return;
    }
    if (outcome.status === "failed") {
      setStage({ kind: "pro-failed", signup, message: outcome.message });
      return;
    }
    setStage({ kind: "welcome-free", signup });
  };

  return (
    <AuthShell
      kicker={kicker}
      headline={headline}
      topBarAction={
        stage.kind === "form" ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Already a member?</span>
            <a
              href={buildLoginUrl(next ? { next } : undefined)}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign in
            </a>
          </div>
        ) : null
      }
    >
      <Section>
        {stage.kind === "form" && (
          <SignupCard next={next} onComplete={(signup) => setStage({ kind: "paywall", signup })} />
        )}

        {stage.kind === "paywall" && (
          <PaywallCard
            user={{ id: stage.signup.user.id, email: stage.signup.user.email }}
            onComplete={(outcome) => handlePaywallOutcome(stage.signup, outcome)}
            onSkipToFree={() => {
              /* PaywallCard also fires onComplete with "skipped"; handled there. */
            }}
          />
        )}

        {stage.kind === "pro-success" && (
          <ProSuccessCard
            fullName={stage.signup.fullName}
            subscription={stage.subscription}
            redirectTo={stage.signup.redirectTo}
          />
        )}

        {stage.kind === "pro-failed" && (
          <ProFailureCard
            message={stage.message}
            onRetry={() => setStage({ kind: "paywall", signup: stage.signup })}
            onContinueFree={() => setStage({ kind: "welcome-free", signup: stage.signup })}
          />
        )}

        {stage.kind === "welcome-free" && (
          <WelcomeCard
            fullName={stage.signup.fullName}
            redirectTo={stage.signup.redirectTo}
            headline="Your free vault is live."
            subheadline="You can upgrade to Pro any time from the app — no need to start over."
          />
        )}
      </Section>
    </AuthShell>
  );
}

function pickKicker(stage: Stage): string {
  switch (stage.kind) {
    case "form":
      return "Create Pro account";
    case "paywall":
      return "Choose your plan";
    case "pro-success":
      return "Pro · Active";
    case "pro-failed":
      return "Try again";
    case "welcome-free":
      return "You're in";
  }
}

function pickHeadline(stage: Stage): string {
  switch (stage.kind) {
    case "form":
      return "Everything in Free, with unlimited everything.";
    case "paywall":
      return "One subscription. Every device. Forever encrypted.";
    case "pro-success":
      return "Welcome to your Pro vault.";
    case "pro-failed":
      return "No charge — your free vault is already live.";
    case "welcome-free":
      return "You can upgrade to Pro any time.";
  }
}
