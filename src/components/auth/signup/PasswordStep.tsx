import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ErrorBanner, Field, Input, PrimaryButton } from "@/components/auth/primitives";
import { scorePassword } from "./passwordStrength";

interface PasswordStepProps {
  email: string;
  onBack: () => void;
  /** Resolves true if the OTP send succeeded; false if the parent handled the error. */
  onSubmit: (password: string) => Promise<boolean>;
  /** Forwarded from parent: shown above the form if the OTP send fails. */
  error?: string | null;
}

/**
 * Step 2 — collect the master password.
 *
 * Visual strength meter + breach-blacklist hint. The "Continue" button
 * triggers the parent's OTP send; UI stays on this step until the parent
 * confirms the OTP went out (so retries are friction-free if the email
 * service hiccups).
 */
export function PasswordStep({ email, onBack, onSubmit, error }: PasswordStepProps) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const minLengthOk = password.length >= 8;
  const blocked = !minLengthOk || strength.breached;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || blocked) return;
    setSubmitting(true);
    const ok = await onSubmit(password);
    if (!ok) setSubmitting(false);
    // If `ok`, parent transitions to the OTP step; this component will
    // unmount, so leaving `submitting=true` is fine.
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2 transition-colors disabled:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {error && <ErrorBanner message={error} />}

      <Field
        label="Master password"
        htmlFor="signup-password"
        // hint={
        //   <span className="inline-flex items-center gap-1">
        //     <Sparkles className="h-3 w-3" /> AI-evaluated
        //   </span>
        // }
      >
        <div className="relative">
          <Input
            id="signup-password"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <div>
        <div className="flex gap-1 mb-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-all ${
                i < strength.score
                  ? strength.score <= 2
                    ? "bg-destructive"
                    : strength.score <= 3
                      ? "bg-yellow-500"
                      : "bg-success"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
        <div className="text-[12px] text-muted-foreground" aria-live="polite">
          {password
            ? strength.label
            : "Use at least 8 characters with letters, numbers and symbols."}
        </div>
      </div>

      {strength.breached && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          That password appears in known data breaches. Please pick something unique.
        </div>
      )}

      <div className="rounded-xl border border-border bg-secondary p-3 text-[12px] text-muted-foreground inline-flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
        We never see your master password. We hash it on the backend and only ever transmit it over
        TLS.
      </div>

      <PrimaryButton type="submit" loading={submitting} disabled={blocked}>
        {submitting ? (
          "Sending verification code…"
        ) : (
          <>
            Email me a code <ArrowRight className="h-4 w-4" />
          </>
        )}
      </PrimaryButton>

      <p className="text-[11px] text-muted-foreground text-center">
        We'll send a one-time code to <span className="text-foreground font-medium">{email}</span>{" "}
        to verify it's yours.
      </p>
    </form>
  );
}
