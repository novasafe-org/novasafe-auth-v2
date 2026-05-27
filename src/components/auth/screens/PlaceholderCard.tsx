import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { appConfig, AUTH_PATH, buildLandingUrl, buildLoginUrl } from "@/config";
import { PrimaryButton, Section, Title } from "@/components/auth/primitives";

interface PlaceholderCardProps {
  /** Eyebrow tag shown above the title (e.g. "Pro plan"). */
  eyebrow: string;
  /** Headline for the placeholder. */
  title: string;
  /** Sub-copy explaining what's happening. */
  description: string;
  /** Which auth path this placeholder is standing in for; controls the back link. */
  path: (typeof AUTH_PATH)[keyof typeof AUTH_PATH];
}

/**
 * Used by `/signup` and `/signup/pro` while the production signup flows
 * are still in development (Phase 4 + Phase 5).
 *
 * Rendered as a real route — visitors who follow a CTA from the landing page
 * land here instead of a 404 / blank page.
 */
export function PlaceholderCard({ eyebrow, title, description, path }: PlaceholderCardProps) {
  const isPro = path === AUTH_PATH.SignupPro;
  const landingPricing = `${appConfig.urls.landing.replace(/\/$/, "")}/pricing`;

  return (
    <Section>
      <a
        href={landingPricing}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
      </a>

      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative h-16 w-16 mb-6">
          <div className="absolute inset-0 rounded-full bg-primary-soft" />
          <div className="absolute inset-2 rounded-full bg-gradient-primary flex items-center justify-center shadow-cta anim-float">
            <Sparkles className="h-7 w-7 text-primary-foreground" strokeWidth={2} />
          </div>
        </div>

        <Title eyebrow={eyebrow} title={title} sub={description} />
      </div>

      <div className="grid gap-2 mt-2">
        <PrimaryButton
          type="button"
          onClick={() => {
            window.location.assign(landingPricing);
          }}
        >
          Choose a plan <ArrowRight className="h-4 w-4" />
        </PrimaryButton>

        <a
          href={buildLoginUrl()}
          className="text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Already have an account? Sign in
        </a>

        <a
          href={buildLandingUrl()}
          className="text-center text-[11px] text-muted-foreground/80 hover:text-muted-foreground transition-colors"
        >
          Back to {isPro ? "novasafe.io" : "the homepage"}
        </a>
      </div>
    </Section>
  );
}
