/**
 * Tiny 3-step indicator shown at the top of every signup card.
 *
 * Visual only — does not navigate. The signup flow is strictly linear and
 * driven by the parent state machine.
 */
export interface SignupStepperProps {
  /** 0-based current step. */
  current: 0 | 1 | 2;
}

const STEPS = ["Identity", "Security", "Verify"] as const;

export function SignupStepper({ current }: SignupStepperProps) {
  return (
    <div className="flex gap-2" aria-label="Signup progress">
      {STEPS.map((label, index) => {
        const reached = index <= current;
        const active = index === current;
        return (
          <div key={label} className="flex-1">
            <div
              className={`h-[3px] rounded-full transition-all ${
                reached ? "bg-gradient-primary" : "bg-border"
              }`}
            />
            <div
              className={`mt-2 text-[11px] ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
