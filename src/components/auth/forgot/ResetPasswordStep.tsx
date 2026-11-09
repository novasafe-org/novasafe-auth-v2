import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

import { ErrorBanner, Field, Input, PrimaryButton, Title } from "@/components/auth/primitives";
import { scorePassword } from "@/components/auth/signup/passwordStrength";

interface ResetPasswordStepProps {
  email: string;
  onBack: () => void;
  onSubmit: (newPassword: string) => Promise<boolean>;
  error?: string | null;
  notice?: string | null;
}

/**
 * Final forgot-password step — choose and confirm a new master password.
 */
export function ResetPasswordStep({ email, onBack, onSubmit, error, notice }: ResetPasswordStepProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const minLengthOk = password.length >= 8;
  const confirmOk = confirm.length > 0 && password === confirm;
  const blocked = !minLengthOk || strength.breached || !confirmOk;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || blocked) return;
    if (password !== confirm) return;
    setSubmitting(true);
    const ok = await onSubmit(password);
    if (!ok) setSubmitting(false);
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

      <Title
        title="Choose a new password"
        sub={
          <>
            Updating access for{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </>
        }
      />

      {notice && !error && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground">
          {notice}
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      <Field label="New password" htmlFor="reset-password">
        <div className="relative">
          <Input
            id="reset-password"
            type={showPassword ? "text" : "password"}
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
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field label="Confirm new password" htmlFor="reset-password-confirm">
        <div className="relative">
          <Input
            id="reset-password-confirm"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {confirm.length > 0 && password !== confirm && (
        <div className="text-[12px] text-destructive">Passwords do not match.</div>
      )}

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

      <PrimaryButton type="submit" loading={submitting} disabled={blocked}>
        {submitting ? (
          "Updating password…"
        ) : (
          <>
            Update password <ArrowRight className="h-4 w-4" />
          </>
        )}
      </PrimaryButton>
    </form>
  );
}
