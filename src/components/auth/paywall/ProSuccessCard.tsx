import { ArrowRight, Calendar, ShieldCheck, Sparkles } from "lucide-react";

import type { SubscriptionSnapshot } from "@/lib/billing";
import { PrimaryButton, Title } from "@/components/auth/primitives";

interface ProSuccessCardProps {
  fullName: string;
  subscription: SubscriptionSnapshot;
  redirectTo: string;
  ctaLabel?: string;
}

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Shown after the RevenueCat purchase resolves and the backend has
 * acknowledged the Pro entitlement. Mirrors the visual rhythm of the free
 * `WelcomeCard` — same CTA, same hero copy structure.
 */
export function ProSuccessCard({
  fullName,
  subscription,
  redirectTo,
  ctaLabel = "Open my Pro vault",
}: ProSuccessCardProps) {
  const firstName = fullName.split(" ")[0] || "there";
  const renewsAt = subscription.renewsAt ?? subscription.expiresAt;
  const renewLabel = renewsAt ? safeFormatDate(renewsAt) : null;

  return (
    <>
      <Title
        eyebrow="Pro · Active"
        title={`Welcome to NovaSafe Pro, ${firstName}.`}
        sub="Unlimited credentials, breach monitoring, and priority support are unlocked across every device."
      />

      <div className="grid gap-3">
        <Highlight
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          title="Pro features unlocked"
          body="Unlimited passwords, secure notes, cards, and CSV import / export."
        />
        {renewLabel && (
          <Highlight
            icon={<Calendar className="h-4 w-4 text-primary" />}
            title={`Renews on ${renewLabel}`}
            body="Cancel any time from the app — no questions asked."
          />
        )}
        <Highlight
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
          title="14-day money-back guarantee"
          body="Not feeling it? Reply to your receipt and we'll refund you in full."
        />
      </div>

      <PrimaryButton type="button" onClick={() => window.location.assign(redirectTo)}>
        {ctaLabel} <ArrowRight className="h-4 w-4" />
      </PrimaryButton>
    </>
  );
}

function Highlight({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs">
      <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="text-[12.5px] leading-relaxed">
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

function safeFormatDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  try {
    return DATE_FMT.format(new Date(time));
  } catch {
    return null;
  }
}
