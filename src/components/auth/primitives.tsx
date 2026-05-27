import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Small, reusable building blocks for auth cards.
 * Mirror the visual language of the existing `AuthFlow.tsx` so screens stay
 * cohesive even though we no longer share a single mega-component.
 */

export function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-7">{children}</div>;
}

export function Title({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <div>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          <span className="h-1 w-1 rounded-full bg-primary" /> {eyebrow}
        </div>
      )}
      <h1 className="text-[30px] leading-[1.1] font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {sub && <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-[10px] bg-input border border-border px-3.5 text-[14px]
        text-foreground placeholder:text-muted-foreground/70
        outline-none transition-all
        hover:border-border-strong
        focus:border-primary focus:ring-soft focus:bg-card ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  loading,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`anim-shine relative w-full h-11 rounded-[10px] bg-gradient-primary text-primary-foreground
        font-medium text-[14px] shadow-cta transition-all
        hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        inline-flex items-center justify-center gap-2 ${rest.className ?? ""}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full h-11 rounded-[10px] border border-border bg-card text-[13px] font-medium text-foreground
        hover:bg-secondary hover:border-border-strong transition-all inline-flex items-center justify-center gap-2 shadow-xs ${props.className ?? ""}`}
    />
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-destructive"
    >
      {message}
    </div>
  );
}
