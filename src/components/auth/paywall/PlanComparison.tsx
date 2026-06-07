import { Check, Minus, ShieldCheck, Sparkles } from "lucide-react";

const ROWS = [
  { feature: "Passwords & secure notes", free: "Limited", pro: "Unlimited" },
  { feature: "Devices", free: "1 device", pro: "All devices" },
  { feature: "Password history", free: false, pro: true },
  { feature: "CSV import / export", free: false, pro: true },
  { feature: "Custom fields", free: true, pro: true },
  { feature: "Breach monitoring", free: "Standard", pro: "Priority alerts" },
] as const;

export function PlanComparison() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Free vs Pro
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-success" />
          Zero-knowledge · E2E encrypted
        </span>
      </div>

      <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-2 gap-y-2 text-[12px] border-b border-border pb-2">
        <span className="text-muted-foreground">Feature</span>
        <span className="text-center text-muted-foreground">Free</span>
        <span className="text-center font-medium text-primary inline-flex items-center justify-center gap-0.5">
          <Sparkles className="h-3 w-3" /> Pro
        </span>
      </div>

      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li
            key={row.feature}
            className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-x-2 items-center text-[12.5px]"
          >
            <span className="text-foreground/90">{row.feature}</span>
            <Cell value={row.free} />
            <Cell value={row.pro} highlight />
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
        Prices shown are localized by Paddle for your region. Cancel any time from the billing portal.
      </p>
    </div>
  );
}

function Cell({
  value,
  highlight = false,
}: {
  value: string | boolean;
  highlight?: boolean;
}) {
  const base = "flex justify-center";
  if (value === true) {
    return (
      <span className={base}>
        <Check className={`h-3.5 w-3.5 ${highlight ? "text-success" : "text-muted-foreground"}`} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className={base}>
        <Minus className="h-3.5 w-3.5 text-muted-foreground/50" />
      </span>
    );
  }
  return (
    <span className={`${base} text-center text-[11px] ${highlight ? "text-foreground font-medium" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}
