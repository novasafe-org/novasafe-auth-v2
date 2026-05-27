import { ArrowRight, ShieldCheck, Sparkles, Vault } from "lucide-react";

import { PrimaryButton, Section, Title } from "@/components/auth/primitives";

interface WelcomeCardProps {
  fullName: string;
  redirectTo: string;
  /** Headline override — Pro signup uses "You're all set, your Pro vault is live". */
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
}

/**
 * Final signup screen — confirms account creation and CTA's into the app.
 *
 * The cookie is already set by the time this renders, so we use a hard
 * navigation (`window.location.assign`) for the cross-subdomain hop to the
 * `app.novasafe.io` (or `localhost:3002`) project. That guarantees the
 * SSR session guard there can read the freshly-set cookie.
 */
export function WelcomeCard({
  fullName,
  redirectTo,
  headline,
  subheadline,
  ctaLabel,
}: WelcomeCardProps) {
  const firstName = fullName.split(" ")[0] || "there";

  return (
    <Section>
      <Title
        eyebrow="Vault ready"
        title={headline ?? `Welcome, ${firstName}`}
        sub={
          subheadline ??
          "Your encrypted NovaSafe vault is live. Save your first password, scan for breaches, and sync across every device."
        }
      />

      <div className="grid gap-3">
        <Highlight
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
          title="End-to-end encrypted"
          body="Your master password never leaves your device unencrypted."
        />
        <Highlight
          icon={<Vault className="h-4 w-4 text-primary" />}
          title="Sync everywhere"
          body="Your vault stays in sync across web, iOS, Android, and the browser extension."
        />
        <Highlight
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          title="Smart breach alerts"
          body="We watch the dark web and alert you the moment a credential is compromised."
        />
      </div>

      <PrimaryButton type="button" onClick={() => window.location.assign(redirectTo)}>
        {ctaLabel ?? "Open my vault"} <ArrowRight className="h-4 w-4" />
      </PrimaryButton>
    </Section>
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
