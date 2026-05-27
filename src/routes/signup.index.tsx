import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupCard, type SignupSuccess } from "@/components/auth/screens/SignupCard";
import { WelcomeCard } from "@/components/auth/screens/WelcomeCard";
import { buildLoginUrl } from "@/config";

/**
 * `/signup` — free account creation (index route under `signup` layout).
 *
 * Drives the live onboarding flow:
 *   identity → password → OTP → (cookie set, account live) → welcome → app.
 *
 * Pro signup lives at `/signup/pro` and is rendered through the same
 * `signup.tsx` layout `<Outlet />`. Both routes therefore share a parent
 * file but no shared component state — by design.
 */

const signupSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

export const Route = createFileRoute("/signup/")({
  validateSearch: (search) => signupSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Create your NovaSafe vault" },
      {
        name: "description",
        content: "Set up your encrypted, zero-knowledge identity vault in two minutes.",
      },
    ],
  }),
  component: SignupIndexRoute,
});

type Stage = { kind: "form" } | { kind: "welcome"; success: SignupSuccess };

function SignupIndexRoute() {
  const { next } = Route.useSearch();
  const [stage, setStage] = useState<Stage>({ kind: "form" });

  const kicker = stage.kind === "form" ? "Create account" : "You're in";
  const headline =
    stage.kind === "form"
      ? "A calmer place for your digital identity."
      : "Welcome to your private corner of the internet.";

  return (
    <AuthShell
      kicker={kicker}
      headline={headline}
      topBarAction={
        stage.kind === "form" ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Already have an account?</span>
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
      {stage.kind === "form" ? (
        <SignupCard next={next} onComplete={(success) => setStage({ kind: "welcome", success })} />
      ) : (
        <WelcomeCard fullName={stage.success.fullName} redirectTo={stage.success.redirectTo} />
      )}
    </AuthShell>
  );
}
