import { ArrowRight, Repeat, ShieldOff } from "lucide-react";

import { GhostButton, PrimaryButton, Title } from "@/components/auth/primitives";

interface ProFailureCardProps {
  message: string;
  onRetry: () => void;
  onContinueFree: () => void;
  context?: "signup" | "upgrade";
  continueLabel?: string;
}

/**
 * Final paywall state when the Paddle/RevenueCat purchase fails or the
 * backend can't confirm the Pro entitlement. The user always has two ways
 * out — try again, or fall back to the free plan they already have.
 */
export function ProFailureCard({
  message,
  onRetry,
  onContinueFree,
  context = "signup",
  continueLabel = "Continue with the free plan",
}: ProFailureCardProps) {
  return (
    <>
      <Title
        eyebrow="Payment didn't go through"
        title="Let's try that one more time."
        sub={message}
      />

      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
          <ShieldOff className="h-4 w-4 text-destructive" />
        </div>
        <div className="text-[12.5px] leading-relaxed">
          <div className="font-medium text-foreground">
            {context === "upgrade" ? "Your free plan is unchanged" : "Your free vault is already live"}
          </div>
          <div className="text-muted-foreground">
            {context === "upgrade"
              ? "Only the Pro upgrade didn't complete. Nothing was charged."
              : "Your account was created — only the Pro upgrade didn't complete. Nothing was charged."}
          </div>
        </div>
      </div>

      <PrimaryButton type="button" onClick={onRetry}>
        <Repeat className="h-4 w-4" /> Try the payment again
      </PrimaryButton>
      <GhostButton type="button" onClick={onContinueFree}>
        {continueLabel} <ArrowRight className="h-4 w-4" />
      </GhostButton>
    </>
  );
}
