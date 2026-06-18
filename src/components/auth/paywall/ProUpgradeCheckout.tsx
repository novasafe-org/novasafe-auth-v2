import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { ErrorBanner, PrimaryButton } from "@/components/auth/primitives";
import type { PaywallCycle, PaywallPlan } from "@/lib/billing";
import {
  computeYearlySavingsPercent,
  type ProCheckoutOutcome,
  useProCheckout,
} from "./useProCheckout";

const PRO_FEATURES = [
  "Unlimited passwords",
  "Unlimited secure notes",
  "Multi-device sync",
  "Password history",
  "Custom fields",
  "CSV import / export",
  "Dark-web monitoring",
  "Priority support",
] as const;

interface ProUpgradeCheckoutProps {
  user: { id: string; email: string };
  onComplete: (outcome: ProCheckoutOutcome) => void;
  onSkip: () => void;
  skipLabel?: string;
}

export function ProUpgradeCheckout({
  user,
  onComplete,
  onSkip,
  skipLabel = "Return to billing",
}: ProUpgradeCheckoutProps) {
  const {
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
  } = useProCheckout(user);

  if (stage.kind === "configuration-missing") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Web billing isn't configured yet</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set VITE_REVENUECAT_PUBLIC_API_KEY_WEB in the server .env
          (/opt/novasafe-deployment/platform/auth/.env), then restart the auth container.
        </p>
        <PrimaryButton type="button" onClick={() => onComplete({ status: "skipped", reason: "configuration-missing" })}>
          Return to billing <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    );
  }

  if (stage.kind === "fatal") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Couldn't reach the payment service</h1>
        <p className="text-sm text-muted-foreground">{stage.message}</p>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {skipLabel}
        </button>
      </div>
    );
  }

  const monthlyPlan = offerings?.monthly ?? null;
  const yearlyPlan = offerings?.yearly ?? null;
  const savingsPercent = computeYearlySavingsPercent(monthlyPlan, yearlyPlan);
  const showIndiaUsdNote =
    offerings?.pricingRegion === "IN" &&
    (plan?.currencyCode === "USD" || offerings?.currencyCode === "USD");
  const loading = stage.kind === "loading";

  return (
    <div className="w-full space-y-6 lg:space-y-0">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10 lg:items-start">
        {/* LEFT — plan selection */}
        <div className="space-y-6 order-1">
          <header className="space-y-2">
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-foreground leading-tight">
              Upgrade to NovaSafe Pro
            </h1>
            <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed max-w-md">
              Unlock unlimited passwords, devices, history and security monitoring.
            </p>
          </header>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Choose your plan
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <PlanOptionCard
                title="Monthly"
                priceLabel={monthlyPlan?.priceLabel}
                periodLabel="/ month"
                subtitle="Flexible billing"
                selected={cycle === "monthly"}
                disabled={!monthlyPlan || purchasing || loading}
                onSelect={() => setCycle("monthly")}
              />
              <PlanOptionCard
                title="Yearly"
                priceLabel={yearlyPlan?.priceLabel}
                periodLabel="/ year"
                subtitle={
                  yearlyPlan?.effectiveMonthlyLabel
                    ? `That's ${yearlyPlan.effectiveMonthlyLabel}/month`
                    : "Best value annually"
                }
                badge={
                  savingsPercent && savingsPercent > 0
                    ? `Save ${savingsPercent}%`
                    : yearlyPlan?.badge
                }
                selected={cycle === "yearly"}
                disabled={!yearlyPlan || purchasing || loading}
                onSelect={() => setCycle("yearly")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What you'll unlock
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[13px] text-foreground/90">
                  <Check className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT — checkout summary */}
        <div className="order-2 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-primary/30 bg-card shadow-sm ring-soft p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Checkout summary
              </p>
              <h2 className="text-xl font-semibold text-foreground">NovaSafe Pro</h2>
            </div>

            <dl className="space-y-3 text-[13px]">
              <SummaryRow label="Selected plan" value={cycle === "yearly" ? "Yearly" : "Monthly"} />
              <SummaryRow
                label="Price"
                value={
                  loading ? "—" : (
                    <span className="text-base font-semibold text-foreground">
                      {plan?.priceLabel ?? "—"}
                      <span className="text-sm font-normal text-muted-foreground">
                        {plan?.periodLabel ?? ""}
                      </span>
                    </span>
                  )
                }
              />
              <SummaryRow
                label="Billing"
                value={cycle === "yearly" ? "Annual" : "Monthly"}
              />
              {plan?.currencyCode ? (
                <SummaryRow label="Currency" value={plan.currencyCode} />
              ) : null}
            </dl>

            {showIndiaUsdNote ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg border border-border bg-secondary/60 px-3 py-2">
                INR pricing is not yet published in RevenueCat/Paddle for this plan. Checkout will
                bill in {plan?.currencyCode ?? "USD"} until regional prices are configured.
              </p>
            ) : null}

            <ul className="space-y-2 text-[12px] text-muted-foreground border-t border-border pt-4">
              <TrustLine icon={<ShieldCheck className="h-3.5 w-3.5 text-success" />} text="Secure payments by Paddle" />
              <TrustLine icon={<Lock className="h-3.5 w-3.5 text-primary" />} text="Powered by RevenueCat" />
              <TrustLine icon={<Check className="h-3.5 w-3.5 text-success" />} text="Cancel anytime" />
              <TrustLine icon={<Check className="h-3.5 w-3.5 text-success" />} text="14-day money-back guarantee" />
            </ul>

            {error ? <ErrorBanner message={error} /> : null}
            {pendingNotice && !error ? (
              <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground inline-flex items-start gap-2 w-full">
                <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                {pendingNotice}
              </div>
            ) : null}

            <PrimaryButton
              type="button"
              onClick={() => void startPurchase(onComplete)}
              loading={purchasing}
              disabled={!plan || !isReady || purchasing || loading}
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

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Receipts emailed to{" "}
              <span className="text-foreground font-medium">{user.email}</span>
            </p>

            <button
              type="button"
              onClick={onSkip}
              disabled={purchasing}
              className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-full justify-center transition-colors disabled:opacity-60"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {skipLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanOptionCard({
  title,
  priceLabel,
  periodLabel,
  subtitle,
  badge,
  selected,
  disabled,
  onSelect,
}: {
  title: string;
  priceLabel?: string;
  periodLabel: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-2xl border p-4 transition-all disabled:opacity-50 ${
        selected
          ? "border-primary/60 bg-primary/5 ring-soft shadow-sm"
          : "border-border bg-card/80 hover:border-border-strong hover:bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">
            {priceLabel ?? "—"}
            <span className="text-[13px] font-normal text-muted-foreground">{periodLabel}</span>
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`h-4 w-4 rounded-full border-2 shrink-0 ${
              selected ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}
            aria-hidden
          />
          {badge ? (
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TrustLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2">
      {icon}
      <span>{text}</span>
    </li>
  );
}
