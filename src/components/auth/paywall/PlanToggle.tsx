import type { PaywallCycle } from "@/lib/billing";

interface PlanToggleProps {
  value: PaywallCycle;
  onChange: (next: PaywallCycle) => void;
  /** Optional savings copy shown inside the yearly pill (e.g. "Save 40%"). */
  yearlySavingsLabel?: string;
  disabled?: boolean;
  /** Stretch toggle to match pricing card width. */
  fullWidth?: boolean;
}

/**
 * Segmented monthly / yearly switch — matches the visual language of the
 * landing pricing page so users feel continuity from CTA to checkout.
 */
export function PlanToggle({
  value,
  onChange,
  yearlySavingsLabel,
  disabled = false,
  fullWidth = false,
}: PlanToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Billing cycle"
      className={`relative flex items-center rounded-full border border-border bg-secondary p-1 text-[12px] font-medium ${
        fullWidth ? "w-full" : "inline-flex"
      }`}
    >
      <CycleTab
        active={value === "monthly"}
        onClick={() => onChange("monthly")}
        disabled={disabled}
        label="Monthly"
      />
      <CycleTab
        active={value === "yearly"}
        onClick={() => onChange("yearly")}
        disabled={disabled}
        label={
          <span className="inline-flex items-center gap-2">
            Yearly
            {yearlySavingsLabel && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tracking-wide ${
                  value === "yearly"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-success/15 text-success"
                }`}
              >
                {yearlySavingsLabel}
              </span>
            )}
          </span>
        }
      />
    </div>
  );
}

function CycleTab({
  active,
  onClick,
  disabled,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={`relative z-10 flex-1 px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
        active
          ? "bg-gradient-primary text-primary-foreground shadow-cta"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
