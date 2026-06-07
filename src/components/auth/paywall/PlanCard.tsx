import { Check } from "lucide-react";

import type { PaywallPlan } from "@/lib/billing";

interface PlanCardProps {
  plan: PaywallPlan;
  /** Bullets shown under the price. Same content for monthly + yearly. */
  features: ReadonlyArray<string>;
  /** "Skeleton" mode while offerings are loading. */
  loading?: boolean;
}

/**
 * Read-only summary card for the currently-selected plan. The "Start
 * subscription" CTA lives in the parent paywall so it stays sticky as the
 * user toggles between cycles.
 */
export function PlanCard({ plan, features, loading = false }: PlanCardProps) {
  return (
    <div
      className={`w-full rounded-2xl border bg-card shadow-sm transition-all ${
        loading ? "opacity-70 animate-pulse" : "opacity-100"
      } border-primary/50 ring-soft`}
    >
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            NovaSafe Pro · {plan.cycle === "yearly" ? "Yearly" : "Monthly"}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[32px] font-semibold tracking-tight text-foreground">
              {plan.priceLabel || "—"}
            </span>
            <span className="text-[13px] text-muted-foreground">{plan.periodLabel}</span>
          </div>
          {plan.effectiveMonthlyLabel && (
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              That's {plan.effectiveMonthlyLabel}/month, billed annually
            </div>
          )}
        </div>
        {plan.badge && (
          <span className="rounded-full bg-success/15 px-2 py-1 text-[10px] uppercase tracking-wider text-success">
            {plan.badge}
          </span>
        )}
      </div>

      <ul className="grid gap-1.5 border-t border-border px-4 py-3 text-[12.5px] text-muted-foreground">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
